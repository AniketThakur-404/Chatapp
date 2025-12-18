const WhatsAppCarProtectionBot = require('./bot');

function testGrapheneWorkflow() {
    console.log('🧪 Testing Graphene Workflow...\n');
    
    const bot = new WhatsAppCarProtectionBot();
    const userId = 'test-graphene-user';
    
    try {
        // Step 1: Start conversation
        console.log('Step 1: Starting conversation...');
        let response = bot.processMessage(userId, 'start');
        console.log('✅ Initial response received');
        
        // Step 2: Select Graphene service
        console.log('\nStep 2: Selecting Graphene service...');
        response = bot.processMessage(userId, 'Graphene Coating (Diamond-Hard Protection)');
        console.log('✅ Graphene service selected');
        
        // Step 3: Select vehicle type
        console.log('\nStep 3: Selecting vehicle type...');
        response = bot.processMessage(userId, 'Compact SUV/Sedan (e.g., Creta, Seltos)');
        console.log('✅ Vehicle type selected');
        
        // Step 4: Select Standard package
        console.log('\nStep 4: Selecting Standard package...');
        response = bot.processMessage(userId, 'Select Standard');
        console.log('✅ Standard package selected');
        console.log('Response:', response.text.substring(0, 200) + '...');
        
        // Step 5: Select location
        console.log('\nStep 5: Selecting location...');
        response = bot.processMessage(userId, 'Delhi');
        console.log('✅ Location selected');
        console.log('Response:', response.text.substring(0, 200) + '...');
        
        // Check session data
        const session = bot.getSession(userId);
        console.log('\n📊 Final Session Data:');
        console.log('- Service Type:', session.user_service_type);
        console.log('- Vehicle Type:', session.vehicle_type);
        console.log('- Selected Package:', session.selected_package);
        console.log('- Location:', session.user_location);
        console.log('- Current Step:', session.step);
        
        console.log('\n🎉 Graphene workflow test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

testGrapheneWorkflow();