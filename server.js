const express = require('express');
const axios = require('axios');
const WhatsAppCarProtectionBot = require('./bot');
const app = express();
const bot = new WhatsAppCarProtectionBot();

// WhatsApp Configuration from environment variables
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'CarBot2025';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const DEFAULT_TEMPLATE_RECIPIENT = process.env.DEFAULT_TEMPLATE_RECIPIENT || '919910762692';
const DEFAULT_TEMPLATE_NAME = process.env.DEFAULT_TEMPLATE_NAME;
const DEFAULT_TEMPLATE_LANGUAGE = process.env.DEFAULT_TEMPLATE_LANGUAGE || 'en_US';
const DEFAULT_TEMPLATE_COMPONENTS = parseTemplateComponents(process.env.DEFAULT_TEMPLATE_COMPONENTS);

function parseTemplateComponents(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Unable to parse DEFAULT_TEMPLATE_COMPONENTS (expecting JSON array):', error.message);
    return [];
  }
}

// ====================================================
// ✅ 1. DATABASE SETUP (NeonDB PostgreSQL via pg driver)
// ====================================================
const prisma = require('./db');
const { initializeDatabase, disconnectDatabase } = require('./initDatabase');

// Initialize database and create tables
async function startServer() {
  try {
    // Initialize database and create all tables
    await initializeDatabase();

    // Start the Express server after database is ready
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 WhatsApp Car Protection Chatbot running on port ${PORT}`);
      console.log(`📊 Database: NeonDB PostgreSQL`);
      console.log(`🌐 Server ready to receive WhatsApp webhooks`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// ====================================================
// Middleware and basic setup
// ====================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

app.use(express.static('public'));

// Health check
app.get('/', (req, res) => {
  res.json({
    message: 'WhatsApp Car Protection Chatbot Server',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// ====================================================
// Webhook verification (GET)
// ====================================================
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

// ====================================================
// Webhook message receiver (POST)
// ====================================================
app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    console.log('🔔 Webhook POST received:', JSON.stringify(body, null, 2));
    res.status(200).json({ status: 'received' }); // immediate response to WhatsApp

    if (body.object !== 'whatsapp_business_account') {
      console.log('❌ Not a WhatsApp business account webhook');
      return;
    }
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    if (!message) {
      // Ignore status updates (delivered/read receipts) - this is normal
      if (change?.value?.statuses) {
        console.log('📊 Status update received (ignoring)');
      }
      return;
    }

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

    // ====================================================
    // 🧠 DATABASE INTEGRATION START
    // ====================================================
    let user = await prisma.user.findUnique({ where: { phone_number: senderId } });
    if (!user) {
      user = await prisma.user.create({ data: { phone_number: senderId } });
    }

    let session = await prisma.session.findFirst({
      where: { userId: user.id },
    });
    if (!session) {
      session = await prisma.session.create({
        data: {
          userId: user.id,
          current_step: 'welcome',
        },
      });
    }

    await prisma.message.create({
      data: {
        sessionId: session.id,
        sender: 'user',
        message_text: messageText,
      },
    });
    // ====================================================

    // Handle numeric reply fallback
    if (/^\d+$/.test(messageText.trim())) {
      const num = parseInt(messageText.trim());
      const sessionData = bot.getSession(senderId);
      const lastBotMsg = getLastBotMessageWithButtons(sessionData);
      if (lastBotMsg?.buttons && num >= 1 && num <= lastBotMsg.buttons.length) {
        messageText = lastBotMsg.buttons[num - 1];
      }
    }

    // 🤖 Process message with bot
    const botResponse = bot.processMessage(senderId, messageText, user.name);

    // Save bot response in DB
    await prisma.message.create({
      data: {
        sessionId: session.id,
        sender: 'bot',
        message_text: botResponse.text,
      },
    });

    // Update session step & data
    const liveSession = bot.getSession(senderId);

    // If name was collected, save it to the user record
    if (liveSession?.user_name && liveSession?.name_collected && !user.name) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: liveSession.user_name }
      });
      console.log(`✅ Saved user name: ${liveSession.user_name} for ${senderId}`);
    }

    await prisma.session.update({
      where: { id: session.id },
      data: {
        current_step: liveSession?.step || 'unknown',
        selected_package: liveSession?.selected_package || null,
        location: liveSession?.location || null,
      },
    });

    // ====================================================
    // 🧠 DATABASE INTEGRATION END
    // ====================================================

    // Send WhatsApp message
    console.log(`📤 Attempting to send WhatsApp message to ${senderId}`);
    await sendWhatsAppResponse(senderId, botResponse);
    console.log(`✅ WhatsApp message sent successfully to ${senderId}`);
  } catch (error) {
    console.error('❌ Webhook error:', error);
  }
});

// Helper - placeholder
function getLastBotMessageWithButtons(session) {
  return null;
}

// ====================================================
// WhatsApp send message logic (unchanged)
// ====================================================
function buildInteractiveRows(buttons) {
  return buttons.map((button, index) => {
    const fullText = button.trim();
    let title = fullText;
    let description = '';

    const parenMatch = fullText.match(/^(..+?)(\(.+\))$/);
    if (parenMatch) {
      const mainTitle = parenMatch[1].trim();
      const descText = parenMatch[2].trim();
      if (mainTitle.length <= 24) {
        title = mainTitle;
        description = descText.substring(0, 72);
      } else {
        title = mainTitle.substring(0, 24);
        description = (mainTitle.substring(24) + ' ' + descText).substring(0, 72).trim();
      }
    } else {
      if (fullText.length <= 24) {
        title = fullText;
      } else {
        let breakIndex = 24;
        for (let i = 24; i >= 18; i--) {
          if (fullText[i] === " " || fullText[i] === "-" || fullText[i] === "/") {
            breakIndex = i;
            break;
          }
        }
        title = fullText.substring(0, breakIndex).trim();
        description = fullText.substring(breakIndex).trim().substring(0, 72);
      }
    }

    return {
      id: `option_${index}_${Date.now()}`,
      title,
      description,
    };
  });
}
async function sendWhatsAppResponse(to, response) {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    throw new Error('Missing WhatsApp credentials (set ACCESS_TOKEN and PHONE_NUMBER_ID)');
  }

  const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;
  const headers = {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };

  const hasButtons = Array.isArray(response?.buttons) && response.buttons.length > 0;
  let data;

  if (hasButtons && response.buttons.length <= 10) {
    data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: { type: 'text', text: 'Select an option' },
        body: { text: response.text },
        action: {
          button: 'View Options',
          sections: [
            {
              title: 'Available Options',
              rows: buildInteractiveRows(response.buttons),
            },
          ],
        },
      },
    };
  } else if (hasButtons) {
    let textWithButtons = `${response.text}\n\n*Reply with number:*\n`;
    response.buttons.forEach((button, index) => {
      textWithButtons += `
${index + 1}. ${button}`;
    });
    data = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: textWithButtons,
      },
    };
  } else {
    data = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: response.text,
      },
    };
  }

  try {
    console.log('Sending WhatsApp message to', to);
    const apiResponse = await axios.post(url, data, { headers, timeout: 30000 });
    console.log('Message sent successfully to', to);
    return apiResponse.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response ? error.response.data : error.message);
    if (data.type === 'interactive') {
      try {
        let fallbackText = `${response.text}\n\n*Available options:*\n`;
        response.buttons.forEach((button, index) => {
          fallbackText += `
${index + 1}. ${button}`;
        });
        fallbackText += '\n\nPlease type the number of your choice.';
        const fallbackData = {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: {
            preview_url: false,
            body: fallbackText,
          },
        };
        const fallbackResponse = await axios.post(url, fallbackData, { headers, timeout: 10000 });
        console.log('Fallback message sent successfully to', to);
        return fallbackResponse.data;
      } catch (fallbackError) {
        console.error('Fallback attempt failed:', fallbackError.response ? fallbackError.response.data : fallbackError.message);
      }
    }
    throw error;
  }
}


async function sendWhatsAppTemplate(to, templatePayload) {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    throw new Error('Missing WhatsApp credentials (set ACCESS_TOKEN and PHONE_NUMBER_ID)');
  }
  if (!templatePayload?.name) {
    throw new Error('Template name is required');
  }

  const languageCode =
    typeof templatePayload.language === 'string'
      ? templatePayload.language
      : templatePayload.language?.code || templatePayload.language_code || DEFAULT_TEMPLATE_LANGUAGE;

  const components =
    Array.isArray(templatePayload.components) && templatePayload.components.length
      ? templatePayload.components
      : DEFAULT_TEMPLATE_COMPONENTS;

  const payload = {
    name: templatePayload.name,
    language: { code: languageCode },
    components,
  };

  const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;
  const headers = {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };

  console.log('sendWhatsAppTemplate called for', to, 'template:', payload.name);

  try {
    const apiResponse = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to,
        recipient_type: 'individual',
        type: 'template',
        template: payload,
      },
      { headers, timeout: 30000 }
    );
    console.log('Template message sent successfully to', to);
    return apiResponse.data;
  } catch (error) {
    console.error('Template send failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    throw error;
  }
}
// ====================================================
// Test and session endpoints
// ====================================================

// Test WhatsApp API connection
app.post('/test-whatsapp', async (req, res) => {
  try {
    const { phone_number } = req.body;
    if (!phone_number) {
      return res.status(400).json({ error: 'phone_number is required' });
    }

    console.log(`🧪 Testing WhatsApp API with phone: ${phone_number}`);

    const testResponse = {
      text: 'Test message from UNLAYR bot - API connection working!',
      buttons: []
    };

    await sendWhatsAppResponse(phone_number, testResponse);

    res.json({
      success: true,
      message: 'Test message sent successfully',
      phone_number: phone_number
    });
  } catch (error) {
    console.error('❌ WhatsApp API test failed:', error);
    res.status(500).json({
      error: 'WhatsApp API test failed',
      details: error.message
    });
  }
});

app.post('/send-template', async (req, res) => {
  try {
    const { phone_number } = req.body;
    const targetPhone = phone_number || DEFAULT_TEMPLATE_RECIPIENT;
    const templateInput = req.body.template || {};
    const templateName = templateInput.name || DEFAULT_TEMPLATE_NAME;

    if (!templateName) {
      return res.status(400).json({
        error: 'Template name is required. Provide template.name in the request body or set DEFAULT_TEMPLATE_NAME in .env.',
      });
    }

    const templatePayload = {
      name: templateName,
      language: templateInput.language || templateInput.language_code,
      components: templateInput.components,
    };

    const result = await sendWhatsAppTemplate(targetPhone, templatePayload);
    res.json({ success: true, targetPhone, result });
  } catch (error) {
    console.error('Template send endpoint failed:', error);
    res.status(500).json({
      error: 'Template send failed',
      details: error.response?.data || error.message,
    });
  }
});

app.post('/test-message', (req, res) => {
  try {
    console.log('🧪 TEST ENDPOINT CALLED - This is not a real WhatsApp message!');
    const { userId = 'test-user', message, userName = null } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    console.log(`🧪 Test message from ${userId}: ${message}`);
    const response = bot.processMessage(userId, message, userName);

    res.json({
      userId,
      userMessage: message,
      botResponse: response,
      sessionData: bot.getSession(userId),
      note: 'This was a test call - no WhatsApp message sent'
    });
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/session/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const session = bot.getSession(userId);
    res.json({ userId, sessionData: session });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/session/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    bot.sessions.delete(userId);
    res.json({ userId, message: 'Session reset successfully' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ====================================================
// Error handler and server start
// ====================================================
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server with database initialization
startServer();
