const readline = require('readline');
const WhatsAppCarProtectionBot = require('./bot');

class ConsoleTestInterface {
    constructor() {
        this.bot = new WhatsAppCarProtectionBot();
        this.userId = 'test-user-123';
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        console.log('🤖 WhatsApp Car Protection Chatbot - Console Test Interface');
        console.log('=' .repeat(60));
        console.log('Type your messages to test the bot. Type "quit" to exit.\n');
        
        this.startConversation();
    }

    startConversation() {
        // Send initial greeting
        const initialResponse = this.bot.processMessage(this.userId, 'Hi');
        this.displayBotResponse(initialResponse);
        this.promptUser();
    }

    displayBotResponse(response) {
        console.log('\n🤖 Bot:');
        console.log('-'.repeat(50));
        console.log(response.text);
        
        if (response.buttons && response.buttons.length > 0) {
            console.log('\n📱 Quick Reply Buttons:');
            response.buttons.forEach((button, index) => {
                console.log(`  ${index + 1}. ${button}`);
            });
            console.log('\n💡 Tip: You can type the button text or just the number');
        }
        console.log('-'.repeat(50));
    }

    promptUser() {
        this.rl.question('\n👤 You: ', (input) => {
            if (input.toLowerCase() === 'quit') {
                console.log('\n👋 Thanks for testing the chatbot!');
                this.rl.close();
                return;
            }

            if (input.toLowerCase() === 'session') {
                this.showSessionData();
                this.promptUser();
                return;
            }

            if (input.toLowerCase() === 'reset') {
                this.bot.sessions.delete(this.userId);
                console.log('\n🔄 Session reset! Starting fresh...');
                this.startConversation();
                return;
            }

            // Handle button number selection
            const session = this.bot.getSession(this.userId);
            const lastResponse = this.getLastBotResponse(session);
            
            if (lastResponse && lastResponse.buttons && /^\d+$/.test(input.trim())) {
                const buttonIndex = parseInt(input.trim()) - 1;
                if (buttonIndex >= 0 && buttonIndex < lastResponse.buttons.length) {
                    input = lastResponse.buttons[buttonIndex];
                }
            }

            const response = this.bot.processMessage(this.userId, input);
            this.displayBotResponse(response);
            this.promptUser();
        });
    }

    getLastBotResponse(session) {
        const history = session.conversation_history;
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].bot) {
                // This is a simplified approach - in real implementation, 
                // we'd store the full response object
                return null;
            }
        }
        return null;
    }

    showSessionData() {
        const session = this.bot.getSession(this.userId);
        console.log('\n📊 Current Session Data:');
        console.log('=' .repeat(40));
        console.log(`Step: ${session.step}`);
        console.log(`Service Type: ${session.user_service_type || 'Not selected'}`);
        console.log(`Vehicle Type: ${session.vehicle_type || 'Not selected'}`);
        console.log(`Preferred Finish: ${session.preferred_finish || 'Not selected'}`);
        console.log(`Selected Package: ${session.selected_package || 'Not selected'}`);
        console.log(`Car Condition: ${session.car_condition || 'Not selected'}`);
        console.log(`Protection Duration: ${session.protection_duration || 'Not selected'}`);
        console.log(`Location: ${session.user_location || 'Not provided'}`);
        console.log(`Date: ${session.preferred_date || 'Not selected'}`);
        console.log(`Time: ${session.preferred_time || 'Not selected'}`);
        console.log(`Interior Addon: ${session.interior_addon || 'Not selected'}`);
        console.log('=' .repeat(40));
    }
}

// Additional helper commands
console.log('🔧 Special Commands:');
console.log('  • "session" - View current session data');
console.log('  • "reset" - Reset conversation and start over');
console.log('  • "quit" - Exit the test interface');
console.log('  • Type numbers (1, 2, 3...) to select buttons quickly');
console.log('');

new ConsoleTestInterface();