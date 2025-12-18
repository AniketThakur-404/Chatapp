# WhatsApp Car Protection Chatbot

A comprehensive Node.js chatbot for car protection services (PPF, Ceramic Coating, and Detailing) built according to the detailed workflow specification.

## 🚀 Features

- **Complete Workflow Implementation**: Follows the exact conversation flow from the workflow document
- **Multi-Service Support**: PPF, Ceramic Coating, and Car Detailing services
- **Dynamic Pricing**: Automatic price calculation based on vehicle type and service selection
- **Session Management**: Maintains conversation state across interactions
- **Fallback Handling**: Graceful handling of unexpected inputs
- **Console Testing**: Easy testing interface without WhatsApp credentials
- **REST API**: Ready for WhatsApp integration

## 📋 Services Supported

### Paint Protection Film (PPF)
- Multiple package options (Core, Nova, Aether, Aether+, Stealth, Prism)
- Dynamic pricing based on vehicle type
- Interior PPF add-on option
- Car condition assessment

### Ceramic Coating
- 1, 3, and 5-year protection plans
- Vehicle-specific recommendations

### Car Detailing
- Premium detailing packages
- Vehicle-type specific pricing

## 🛠️ Installation

1. **Clone or create the project:**
```bash
mkdir whatsapp-car-bot
cd whatsapp-car-bot
```

2. **Install dependencies:**
```bash
npm install
```

## 🎮 Usage

### Console Testing (Recommended for initial testing)

```bash
npm test
```

This starts an interactive console interface where you can:
- Test the complete conversation flow
- Use button numbers (1, 2, 3) for quick selection
- View session data with `session` command
- Reset conversation with `reset` command
- Exit with `quit` command

### Server Mode (For API integration)

```bash
npm start
```

The server runs on `http://localhost:3000` with these endpoints:

- `GET /` - Server status and available endpoints
- `POST /test-message` - Test bot responses manually
- `GET /session/:userId` - View user session data
- `DELETE /session/:userId` - Reset user session
- `POST /webhook` - WhatsApp webhook (for future integration)

### API Testing Examples

**Test a message:**
```bash
curl -X POST http://localhost:3000/test-message \
  -H "Content-Type: application/json" \
  -d '{"userId": "test123", "message": "Hi"}'
```

**View session:**
```bash
curl http://localhost:3000/session/test123
```

**Reset session:**
```bash
curl -X DELETE http://localhost:3000/session/test123
```

## 🔄 Conversation Flow

The bot follows this exact workflow:

1. **Initial Greeting** → Service selection
2. **Service Selection** → PPF/Ceramic/Detailing
3. **Vehicle Type** → Compact/Large SUV/Luxury/Bike
4. **Finish Preference** → Glossy/Matte/Coloured
5. **Package Selection** (PPF) or **Duration** (Ceramic/Detailing)
6. **Car Condition** (PPF only)
7. **Location Input**
8. **Date & Time Selection**
9. **Interior Add-on** (PPF only)
10. **Final Confirmation** → Payment or Human handoff

## 💰 Pricing Structure

### PPF Packages (Compact Vehicle Base Prices)
- **Core**: ₹70,800 (5 years warranty)
- **Nova**: ₹94,400 (8 years warranty)
- **Aether**: ₹1,18,000 (10 years warranty)
- **Aether+**: ₹1,41,600 (10 years warranty)
- **Stealth**: ₹1,06,200 (8 years warranty)
- **Prism**: ₹1,18,000 (5 years warranty)

**Vehicle Type Multipliers:**
- Large SUV: +20%
- Luxury: +40%
- Bike: -60%

### Ceramic Coating
- 1 Year: ₹14,000
- 3 Years: ₹32,000
- 5 Years: ₹38,000

### Car Detailing
- Compact: ₹3,500
- Large SUV: ₹4,500
- Luxury: ₹6,000

## 🧠 Bot Intelligence

### Intent Recognition
- Handles button clicks and free text input
- Recognizes car model names and maps to vehicle categories
- Understands variations in user responses

### Context Management
- Maintains conversation state throughout the flow
- Stores user preferences and selections
- Handles conversation branching based on service type

### Error Handling
- Graceful fallbacks for unexpected inputs
- Clear guidance for users when confused
- Human handoff option at any point

## 🔧 Customization

### Adding New Services
1. Update the pricing structure in `bot.js`
2. Add new conversation steps in the flow handler
3. Update the service selection options

### Modifying Pricing
Update the `initializePricing()` method in the `WhatsAppCarProtectionBot` class.

### Adding New Vehicle Types
1. Add to vehicle selection buttons
2. Update pricing calculations
3. Add to fallback car model matching

## 🚀 WhatsApp Integration

The bot is ready for WhatsApp Business API integration:

1. **Webhook Setup**: Use the `/webhook` endpoint
2. **Message Processing**: The bot handles WhatsApp message format
3. **Response Formatting**: Supports text and button responses
4. **Session Management**: Tracks users by phone number

## 📊 Session Data

The bot tracks these user variables:
- `user_service_type`
- `vehicle_type`
- `preferred_finish`
- `selected_package`
- `car_condition`
- `protection_duration`
- `user_location`
- `preferred_date`
- `preferred_time`
- `interior_addon`

## 🎯 Testing Scenarios

### Complete PPF Flow
1. Start with "Hi"
2. Select "Paint Protection Film (PPF)"
3. Choose vehicle type
4. Select finish preference
5. Pick PPF package
6. Specify car condition
7. Provide location
8. Choose date/time
9. Decide on interior add-on
10. Confirm booking

### Quick Commands
- `menu` - Show quick menu
- `human` - Request human assistance
- `services` - View all services
- `prices` - Check pricing

## 🔍 Troubleshooting

**Bot not responding correctly?**
- Check the console for error messages
- Use `session` command to view current state
- Try `reset` to start fresh

**Pricing calculations wrong?**
- Verify vehicle type selection
- Check the pricing structure in `bot.js`

**Flow getting stuck?**
- Use global commands like `menu` or `human`
- Reset the session and try again

## 📈 Future Enhancements

- WhatsApp Business API integration
- Payment gateway integration
- Calendar API for real-time slot booking
- CRM integration for lead management
- Analytics and reporting
- Multi-language support

## 🤝 Contributing

This bot is built to be easily extensible. Key areas for enhancement:
- Additional service types
- More sophisticated NLP
- Integration with external APIs
- Enhanced error handling
- Performance optimizations

---

**Ready to test?** Run `npm test` and start chatting with the bot! 🚗💬