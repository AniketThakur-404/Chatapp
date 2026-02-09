require("dotenv").config();
const { upsertLeadToSheet } = require("./googleSheetsSync");

(async () => {
  try {
    const result = await upsertLeadToSheet({
      phone_number: "919999999999",
      name: "Sheet Test",
      last_seen: new Date(),
      current_step: "test",
      last_message_text: "Hello from testSheet.js",
      last_message_at: new Date(),
      
    });

    console.log("✅ SHEET TEST SUCCESS:", result);
    process.exit(0);
  } catch (e) {
    console.error("❌ SHEET TEST FAILED:", e?.response?.data || e.message || e);
    process.exit(1);
  }
})();
