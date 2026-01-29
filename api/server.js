// Vercel Serverless Function Handler
const express = require('express');
const axios = require('axios');
const WhatsAppCarProtectionBot = require('../bot');

const app = express();
const bot = new WhatsAppCarProtectionBot();

// WhatsApp Configuration from environment variables
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'CarBot2025';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const IS_VERCEL = process.env.VERCEL === '1';
const FORCE_DB = (process.env.FORCE_DB || '').toLowerCase().trim() === 'true';
const SKIP_DB =
    !FORCE_DB &&
    ((process.env.SKIP_DB || '').toLowerCase().trim() === 'true' || IS_VERCEL);
const DB_OP_TIMEOUT_MS = parseInt(process.env.DB_OP_TIMEOUT_MS || '5000', 10);

async function withTimeout(promise, ms, label) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    });
    try {
        return await Promise.race([promise, timeout]);
    } finally {
        clearTimeout(timeoutId);
    }
}

function extractMessageText(message) {
    if (!message) return '';

    if (message.type === 'text' && message.text?.body) {
        return message.text.body;
    }

    if (message.type === 'interactive' && message.interactive) {
        if (message.interactive.type === 'button_reply') {
            return (
                message.interactive.button_reply?.title ||
                message.interactive.button_reply?.id ||
                ''
            );
        }
        if (message.interactive.type === 'list_reply') {
            return (
                message.interactive.list_reply?.title ||
                message.interactive.list_reply?.id ||
                ''
            );
        }
    }

    if (message.button?.text) return message.button.text;
    if (message.list_reply?.title) return message.list_reply.title;
    if (message.text?.body) return message.text.body;
    if (typeof message.text === 'string') return message.text;
    if (message.caption) return message.caption;

    return '';
}

// Database setup
const prisma = require('../db');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req, res) => {
    res.json({
        message: 'WhatsApp Car Protection Chatbot Server',
        status: 'running',
        timestamp: new Date().toISOString(),
    });
});

// Webhook verification (GET)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verified successfully!');
        res.status(200).send(challenge);
    } else {
        console.log('Webhook verification failed');
        res.status(403).send('Verification failed');
    }
});

// Webhook message receiver (POST)
app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;
        console.log('Webhook POST received');
        res.status(200).json({ status: 'received' });

        if (body.object !== 'whatsapp_business_account') return;

        const entry = body.entry?.[0];
        const change = entry?.changes?.[0];
        const message = change?.value?.messages?.[0];
        if (!message) return;

        const senderId = message.from;
        const messageText = extractMessageText(message);
        if (!messageText) {
            console.log('Unsupported or empty message payload:', message.type);
            return;
        }

        console.log(`Incoming from ${senderId}: ${messageText}`);

        let user = null;
        let session = null;
        let existingUserName = null;
        try {
            user = await withTimeout(
                prisma.user.findUnique({ where: { phone_number: senderId } }),
                DB_OP_TIMEOUT_MS,
                'findUnique user'
            );
            existingUserName = user?.name || null;
        } catch (dbError) {
            console.error('DB lookup failed (continuing):', dbError.message || dbError);
        }

        // Process message with bot
        const botResponse = bot.processMessage(senderId, messageText, existingUserName);

        // Send WhatsApp response first (do not block on DB)
        try {
            await sendWhatsAppResponse(senderId, botResponse);
        } catch (sendError) {
            console.error('WhatsApp send failed:', sendError.response?.data || sendError.message);
            return;
        }

        // Database Integration (best-effort, after send)
        if (SKIP_DB) {
            return;
        }

        try {
            if (!user) {
                user = await withTimeout(
                    prisma.user.create({ data: { phone_number: senderId } }),
                    DB_OP_TIMEOUT_MS,
                    'create user'
                );
            }

            session = await withTimeout(
                prisma.session.findFirst({ where: { userId: user.id } }),
                DB_OP_TIMEOUT_MS,
                'findFirst session'
            );
            if (!session) {
                session = await withTimeout(
                    prisma.session.create({
                        data: { userId: user.id, current_step: 'welcome' },
                    }),
                    DB_OP_TIMEOUT_MS,
                    'create session'
                );
            }

            await withTimeout(
                prisma.message.create({
                    data: { sessionId: session.id, sender: 'user', message_text: messageText },
                }),
                DB_OP_TIMEOUT_MS,
                'create user message'
            );

            await withTimeout(
                prisma.message.create({
                    data: { sessionId: session.id, sender: 'bot', message_text: botResponse.text },
                }),
                DB_OP_TIMEOUT_MS,
                'create bot message'
            );

            // Update session
            const liveSession = bot.getSession(senderId);
            if (liveSession?.user_name && liveSession?.name_collected && !user.name) {
                await withTimeout(
                    prisma.user.update({
                        where: { id: user.id },
                        data: { name: liveSession.user_name }
                    }),
                    DB_OP_TIMEOUT_MS,
                    'update user name'
                );
            }

            await withTimeout(
                prisma.session.update({
                    where: { id: session.id },
                    data: {
                        current_step: liveSession?.step || 'unknown',
                        selected_package: liveSession?.selected_package || null,
                        location: liveSession?.location || null,
                    },
                }),
                DB_OP_TIMEOUT_MS,
                'update session'
            );
        } catch (dbError) {
            console.error('DB error (continuing):', dbError.message || dbError);
        }
    } catch (error) {
        console.error('Webhook error:', error);
    }
});

// Send WhatsApp message
async function sendWhatsAppResponse(to, response) {
    const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;
    const headers = {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
    };

    let data;
    if (response.buttons && response.buttons.length > 0 && response.buttons.length <= 10) {
        data = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to,
            type: 'interactive',
            interactive: {
                type: 'list',
                header: { type: 'text', text: 'Select an option' },
                body: { text: response.text },
                action: {
                    button: 'View Options',
                    sections: [{
                        title: 'Available Options',
                        rows: response.buttons.map((b, i) => ({
                            id: `opt_${i}_${Date.now()}`,
                            title: b.slice(0, 24),
                            description: b.slice(24, 96) || '',
                        })),
                    }],
                },
            },
        };
    } else if (response.buttons && response.buttons.length > 10) {
        let text = response.text + '\n\n*Reply with number:*\n';
        response.buttons.forEach((b, i) => (text += `\n${i + 1}. ${b}`));
        data = { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } };
    } else {
        data = { messaging_product: 'whatsapp', to, type: 'text', text: { body: response.text } };
    }

    try {
        await axios.post(url, data, { headers, timeout: 30000 });
        console.log('Sent to', to);
    } catch (err) {
        console.error('Send error:', err.response?.data || err.message);
    }
}

// Test endpoint
app.post('/test-message', (req, res) => {
    const { userId = 'test-user', message, userName = null } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });
    const response = bot.processMessage(userId, message, userName);
    res.json({ userId, userMessage: message, botResponse: response });
});

// Export for Vercel
module.exports = app;

