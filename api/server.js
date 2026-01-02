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
        console.log('✅ Webhook verified successfully!');
        res.status(200).send(challenge);
    } else {
        console.log('❌ Webhook verification failed');
        res.status(403).send('Verification failed');
    }
});

// Webhook message receiver (POST)
app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;
        console.log('🔔 Webhook POST received');
        res.status(200).json({ status: 'received' });

        if (body.object !== 'whatsapp_business_account') return;

        const entry = body.entry?.[0];
        const change = entry?.changes?.[0];
        const message = change?.value?.messages?.[0];
        if (!message) return;

        const senderId = message.from;
        let messageText = '';

        if (message.type === 'text') messageText = message.text.body;
        else if (message.type === 'interactive') {
            if (message.interactive.type === 'button_reply')
                messageText = message.interactive.button_reply.title;
            else if (message.interactive.type === 'list_reply')
                messageText = message.interactive.list_reply.title;
        } else return;

        console.log(`📩 Incoming from ${senderId}: ${messageText}`);

        // Database Integration
        let user = await prisma.user.findUnique({ where: { phone_number: senderId } });
        if (!user) {
            user = await prisma.user.create({ data: { phone_number: senderId } });
        }

        let session = await prisma.session.findFirst({ where: { userId: user.id } });
        if (!session) {
            session = await prisma.session.create({
                data: { userId: user.id, current_step: 'welcome' },
            });
        }

        await prisma.message.create({
            data: { sessionId: session.id, sender: 'user', message_text: messageText },
        });

        // Process message with bot
        const botResponse = bot.processMessage(senderId, messageText, user.name);

        // Save bot response
        await prisma.message.create({
            data: { sessionId: session.id, sender: 'bot', message_text: botResponse.text },
        });

        // Update session
        const liveSession = bot.getSession(senderId);
        if (liveSession?.user_name && liveSession?.name_collected && !user.name) {
            await prisma.user.update({
                where: { id: user.id },
                data: { name: liveSession.user_name }
            });
        }

        await prisma.session.update({
            where: { id: session.id },
            data: {
                current_step: liveSession?.step || 'unknown',
                selected_package: liveSession?.selected_package || null,
                location: liveSession?.location || null,
            },
        });

        // Send WhatsApp response
        await sendWhatsAppResponse(senderId, botResponse);
    } catch (error) {
        console.error('❌ Webhook error:', error);
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
        console.log('✅ Sent to', to);
    } catch (err) {
        console.error('❌ Send error:', err.response?.data || err.message);
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
