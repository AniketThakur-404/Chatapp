# WhatsApp Chatbot Workflow - Car Protection Services

## 🏗️ ManyChat Bot Structure Overview

### Bot Architecture
- **Trigger-Based Flow**: Each user interaction triggers specific responses
- **Dynamic Content**: Responses change based on previous selections
- **Variable Storage**: Store user preferences throughout the conversation
- **Quick Reply Buttons**: Predefined options for easy navigation
- **Fallback Mechanisms**: Handle unexpected inputs gracefully

---

## 📋 User Variables to Store
```
- user_service_type (PPF/Ceramic/Detailing/Unsure)
- vehicle_type (compact/large_suv/luxury/bike)
- preferred_finish (glossy/matte/coloured/unsure)
- selected_package (core/nova/aether/etc)
- car_condition (new/slightly_used/older)
- protection_duration (1yr/3yr/5yr)
- user_location (city/area)
- preferred_date (date picker)
- preferred_time (morning/afternoon/evening/flexible)
- interior_addon (yes/no/what_is_this)
```

---

## 🚀 Complete Chatbot Flow

### STEP 0: Initial Trigger
**Trigger Keywords**: "Hi", "Hello", "Hey", "Start", "Help", or any first message

**Bot Response**:
```
Hi there! 👋 Welcome to [Company Name], India's Premium Home Service for Paint Protection & Detailing 🚗

Let's get you started with the right service. You can also talk to a human anytime!
```

**Quick Reply Buttons**:
- `Start Booking 💼` → Go to Step 1
- `Request a Call with Expert 📞` → Go to Human Handoff

---

### STEP 1: Service Selection
**Triggered by**: "Start Booking" button or keywords like "booking", "service", "PPF", "ceramic"

**Bot Response**:
```
Please select the service you're interested in:
```

**Quick Reply Buttons**:
- `Paint Protection Film (PPF)` → Set user_service_type = "PPF" → Go to Step 2
- `Ceramic Coating` → Set user_service_type = "Ceramic" → Go to Step 2
- `Car Detailing` → Set user_service_type = "Detailing" → Go to Step 2
- `Not Sure / Need Help 📞` → Go to Human Handoff

**Fallback Logic**:
- If user types "PPF" or "paint protection" → Auto-select PPF
- If user types "ceramic" → Auto-select Ceramic
- If user types "detailing" or "wash" → Auto-select Detailing
- Any other text → Repeat options with "Please choose from the options above"

---

### STEP 2: Vehicle Type Selection
**Triggered by**: Any service selection from Step 1

**Bot Response**:
```
This helps us give you accurate pricing & options.

What type of vehicle do you have?
```

**Quick Reply Buttons**:
- `Compact Sedan/SUV (City, Creta, Seltos)` → Set vehicle_type = "compact" → Go to Step 3
- `Large SUV (Fortuner, Endeavour, ScorpioN)` → Set vehicle_type = "large_suv" → Go to Step 3
- `Luxury Car/Minivan (BMW, GLS, Defender)` → Set vehicle_type = "luxury" → Go to Step 3
- `Bike / Superbike` → Set vehicle_type = "bike" → Go to Step 3

**Fallback Logic**:
- Car model mentions → Match to appropriate category
- "Don't know" → Ask for car model name
- Invalid input → "Please select your vehicle type from the options"

---

### STEP 3: Finish Preference
**Triggered by**: Vehicle type selection

**Bot Response**:
```
What kind of finish would you prefer?
```

**Quick Reply Buttons**:
- `Glossy` → Set preferred_finish = "glossy" → Go to Next Step
- `Matte` → Set preferred_finish = "matte" → Go to Next Step
- `Coloured` → Set preferred_finish = "coloured" → Go to Next Step
- `Not sure` → Set preferred_finish = "unsure" → Go to Next Step

**Next Step Logic**:
- If user_service_type = "PPF" → Go to Step 4 (PPF Package Selection)
- If user_service_type = "Ceramic" OR "Detailing" → Go to Step 6 (Duration Selection)

---

### STEP 4: PPF Package Selection (PPF Users Only)
**Triggered by**: Finish selection + PPF service type

**Bot Response** (Dynamic based on vehicle_type):

For **Compact SUV/Sedan**:
```
Here are our premium PPF film options for your Compact SUV/Sedan 👇

💎 **Unlayr Core** - 5 yrs warranty - ₹70,800
💎 **Unlayr Nova** - 8 yrs warranty - ₹94,400  
💎 **Unlayr Aether** - 10 yrs warranty - ₹1,18,000
💎 **Unlayr Aether+** - 10 yrs warranty - ₹1,41,600
💎 **Unlayr Stealth** (Matte) - 8 yrs warranty - ₹1,06,200
💎 **Unlayr Prism** (Color) - 5 yrs warranty - ₹1,18,000
```

**Quick Reply Buttons**:
- `Choose Core` → Set selected_package = "core" → Go to Step 5
- `Choose Nova` → Set selected_package = "nova" → Go to Step 5
- `Choose Aether` → Set selected_package = "aether" → Go to Step 5
- `Not Sure / Compare Options 📞` → Go to Human Handoff

**Pricing Logic for Other Vehicle Types**:
- Large SUV: Add 20% to all prices
- Luxury: Add 40% to all prices  
- Bike: Reduce prices by 60%

---

### STEP 5: Car Condition (Optional)
**Triggered by**: PPF package selection

**Bot Response**:
```
Is your car newly delivered, or has it been driven?

This helps us recommend the best preparation process.
```

**Quick Reply Buttons**:
- `Brand New (0–30 days)` → Set car_condition = "new" → Go to Step 7
- `Slightly Used (30–90 days)` → Set car_condition = "slightly_used" → Go to Step 7
- `Older Car (3+ months)` → Set car_condition = "older" → Go to Step 7

---

### STEP 6: Duration Selection (Ceramic & Detailing Users)
**Triggered by**: Finish selection + Ceramic/Detailing service type

**Bot Response for Ceramic Coating**:
```
For Ceramic Coating, choose your protection plan:

🛡️ **1 Year Protection** - ₹14,000
🛡️ **3 Years Protection** - ₹32,000  
🛡️ **5 Years Protection** - ₹38,000
```

**Bot Response for Car Detailing**:
```
🧼 **Premium Car Detailing Package includes:**
• Foam wash, clay bar treatment, polish
• Trim blackening & restoration
• Tyre & glass treatment
• Engine bay cleaning
• Interior vacuum + dashboard treatment

💰 **Pricing** (varies by car type):
• Compact: ₹3,500
• Large SUV: ₹4,500
• Luxury: ₹6,000
```

**Quick Reply Buttons** (Ceramic):
- `1 Year - ₹14,000` → Set protection_duration = "1yr" → Go to Step 7
- `3 Years - ₹32,000` → Set protection_duration = "3yr" → Go to Step 7
- `5 Years - ₹38,000` → Set protection_duration = "5yr" → Go to Step 7
- `Not Sure` → Go to Human Handoff

**Quick Reply Buttons** (Detailing):
- `Book Detailing Service` → Set protection_duration = "detailing" → Go to Step 7

---

### STEP 7: Location Input
**Triggered by**: Previous step completion

**Bot Response**:
```
📍 Please share your car location (city/area) so we can confirm availability.

Example: "Sector 56, Gurgaon" or "Koramangala, Bangalore"
```

**Input Type**: Free text input
**Action**: Store in user_location variable → Go to Step 8

**Validation**:
- Check if location contains city name
- If unclear → "Could you please provide your city and area? (e.g., Sector 15, Gurgaon)"

---

### STEP 8: Date & Time Selection
**Triggered by**: Location input

**Bot Response**:
```
📅 Choose your preferred slot for service:

**Available Dates:** (Next 7 days)
```

**Quick Reply Buttons for Dates**:
- `Today` (if before 2 PM)
- `Tomorrow`  
- `Day After Tomorrow`
- `This Weekend`
- `Next Week`

**Follow-up Time Selection**:
```
🕒 **Preferred Time Slot:**
```
- `Morning (10 AM – 1 PM)`
- `Afternoon (1 PM – 4 PM)`  
- `Evening (4 PM – 7 PM)`
- `Flexible / Call me to discuss`

**Action**: Store preferred_date and preferred_time → Go to Step 9

---

### STEP 9: Interior PPF Add-on (PPF Users Only)
**Triggered by**: Date/time selection + PPF service type

**Bot Response**:
```
🔥 **Special Add-on Available!**

Would you like to include **Interior PPF Protection**? 

✨ Protects dashboard, door panels & high-touch areas
💰 Additional cost: +₹10,000
⚡ Applied same day as exterior PPF
```

**Quick Reply Buttons**:
- `Yes, Add Interior PPF` → Set interior_addon = "yes" → Go to Step 10
- `No, Just Exterior` → Set interior_addon = "no" → Go to Step 10  
- `What's this? Tell me more` → Show explanation → Return to same options

**Explanation Response**:
```
🛡️ **Interior PPF Protection:**

• Invisible film on dashboard, door panels, gear console
• Prevents scratches from keys, phones, accessories  
• UV protection prevents fading
• Easy to clean, maintains car value
• Same 5-10 year warranty as exterior

Would you like to add it?
```

---

### STEP 10: Final Confirmation
**Triggered by**: Interior addon selection (or Step 8 for non-PPF users)

**Bot Response** (Dynamic summary):
```
🎉 **You're almost done!** Please confirm your selection:

✅ **Service:** {{user_service_type}}
✅ **Package:** {{selected_package}} - ₹{{calculated_price}}
✅ **Vehicle:** {{vehicle_type}}
✅ **Location:** {{user_location}}  
✅ **Date & Time:** {{preferred_date}} at {{preferred_time}}
{{#interior_addon}}✅ **Interior PPF:** Included (+₹10,000){{/interior_addon}}

💰 **Total Amount:** ₹{{total_price}}

*All prices are exclusive of 18% GST*
```

**Quick Reply Buttons**:
- `Proceed to Payment 💳` → Go to Payment Flow
- `Talk to Human First 📞` → Go to Human Handoff
- `Modify Booking ✏️` → Go back to Step 1

---

## 🔄 Additional Flows

### Human Handoff Flow
**Triggered by**: "Talk to Human" buttons

**Bot Response**:
```
📞 **Connecting you with our expert!**

Our specialist will call you within 15 minutes to discuss:
• Detailed service options
• Pricing clarification  
• Custom requirements
• Booking confirmation

Please share your phone number:
```

**Action**: Collect phone number → Notify human agent → Send summary of conversation

---

### Payment Flow
**Triggered by**: "Proceed to Payment" button

**Bot Response**:
```
💳 **Complete Your Booking**

You can pay via:

🌐 **Online Payment:** 
[Website Booking Link] - Pay 25% advance, rest after service

💬 **WhatsApp Payment:**
Send payment link → UPI/Card options

📞 **Pay on Call:**  
Our team will call for payment & confirmation

Which option do you prefer?
```

---

### Error Handling & Fallbacks

**Unknown Input Response**:
```
I didn't quite understand that. Could you please:
• Use the buttons provided, or
• Type 'menu' to see all options, or  
• Type 'human' to talk to our expert
```

**Menu Command**:
```
📋 **Quick Menu:**
• 'start' - Begin new booking
• 'services' - View all services  
• 'prices' - Check pricing
• 'human' - Talk to expert
• 'location' - Check service areas
```

**Technical Issue Response**:
```
⚠️ We're experiencing a small technical issue. 

Please either:
• Try again in a moment, or
• Call us directly at [Phone Number], or
• Our expert will call you back

Sorry for the inconvenience! 🙏
```

---

## 🎯 ManyChat Setup Configuration

### Growth Tools Setup:
1. **Keywords**: Set up auto-responses for "PPF", "ceramic", "detailing", "price", "booking"
2. **Welcome Message**: Trigger greeting flow for new subscribers
3. **Menu**: Persistent menu with key options

### Flow Actions:
1. **Tagging**: Tag users by service type, vehicle type, location
2. **Custom Fields**: Store all user variables for CRM integration
3. **Sequences**: Follow-up sequences for incomplete bookings

### Integration Points:
1. **Calendar API**: For real-time slot availability
2. **Payment Gateway**: Razorpay/PayU integration  
3. **CRM**: Lead data sync to sales system
4. **SMS**: Confirmation messages via SMS

### Analytics Tracking:
- Conversion rate at each step
- Drop-off points identification  
- Popular service combinations
- Geographic distribution

This comprehensive workflow ensures smooth user experience while capturing all necessary information for booking completion.