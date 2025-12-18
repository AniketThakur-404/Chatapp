const WhatsAppCarProtectionBot = require('./bot');

// Test the new name collection flow
const bot = new WhatsAppCarProtectionBot();

console.log('=== Testing Name Collection Flow ===\n');

// Test 1: New user says "hi"
console.log('Test 1: New user says "hi"');
const response1 = bot.processMessage('test-user-1', 'hi');
console.log('Bot Response:', response1.text);
console.log('Session Step:', bot.getSession('test-user-1').step);
console.log('---\n');

// Test 2: User provides name
console.log('Test 2: User provides name "John"');
const response2 = bot.processMessage('test-user-1', 'John');
console.log('Bot Response:', response2.text.substring(0, 100) + '...');
console.log('Session Step:', bot.getSession('test-user-1').step);
console.log('User Name:', bot.getSession('test-user-1').user_name);
console.log('Name Collected:', bot.getSession('test-user-1').name_collected);
console.log('---\n');

// Test 3: Existing user with name already in database
console.log('Test 3: Existing user with name already in database');
const response3 = bot.processMessage('test-user-2', 'hello', 'Sarah');
console.log('Bot Response:', response3.text.substring(0, 100) + '...');
console.log('Session Step:', bot.getSession('test-user-2').step);
console.log('User Name:', bot.getSession('test-user-2').user_name);
console.log('Name Collected:', bot.getSession('test-user-2').name_collected);
console.log('---\n');

// Test 4: User provides invalid name (just numbers)
console.log('Test 4: User provides invalid name "123"');
const bot2 = new WhatsAppCarProtectionBot();
bot2.processMessage('test-user-3', 'hi');
const response4 = bot2.processMessage('test-user-3', '123');
console.log('Bot Response:', response4.text);
console.log('Session Step:', bot2.getSession('test-user-3').step);
console.log('---\n');

console.log('=== All Tests Completed ===');