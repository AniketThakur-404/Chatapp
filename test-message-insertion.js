// test-message-insertion.js - Test the exact message insertion that was failing
const sequelize = require('./db');
const User = require('./models/User');
const Session = require('./models/Session');
const Message = require('./models/Message');

async function testMessageInsertion() {
  try {
    console.log('🔄 Initializing database tables...');
    
    // Initialize database tables
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ Database tables ready');
    
    console.log('🧪 Testing message insertion...');
    
    // Create or find a test user
    const [user] = await User.findOrCreate({
      where: { phone_number: 'test-user-123' },
      defaults: { phone_number: 'test-user-123', name: 'Test User' }
    });
    console.log('✅ Test user ready:', user.id);
    
    // Create or find a test session
    const [session] = await Session.findOrCreate({
      where: { UserId: user.id },
      defaults: {
        UserId: user.id,
        current_step: 'welcome'
      }
    });
    console.log('✅ Test session ready:', session.id);
    
    // Test the exact message insertion that was failing
    console.log('📝 Inserting bot welcome message...');
    const botMessage = await Message.create({
      SessionId: session.id,
      sender: 'bot',
      message_text: 'Hello! Welcome to UNLAYR 👋\n\nI\'m your digital concierge, here to help you craft the perfect protection plan for your vehicle.\n\nTo get started, may I please have your name?'
    });
    console.log('✅ Bot message inserted successfully:', botMessage.id);
    
    // Test user message insertion
    console.log('📝 Inserting user response...');
    const userMessage = await Message.create({
      SessionId: session.id,
      sender: 'user',
      message_text: 'John Doe'
    });
    console.log('✅ User message inserted successfully:', userMessage.id);
    
    // Verify the messages were inserted correctly
    console.log('🔍 Verifying inserted messages...');
    const messages = await Message.findAll({
      where: { SessionId: session.id },
      order: [['createdAt', 'ASC']]
    });
    
    console.log('📋 Messages in database:');
    messages.forEach((msg, index) => {
      console.log(`  ${index + 1}. [${msg.sender}] ${msg.message_text.substring(0, 50)}...`);
    });
    
    console.log('✅ Message insertion test completed successfully!');
    
  } catch (error) {
    console.error('❌ Message insertion test failed:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.sql) {
      console.error('SQL:', error.sql);
      console.error('Parameters:', error.parameters);
    }
  } finally {
    await sequelize.close();
  }
}

testMessageInsertion();