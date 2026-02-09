// googleSheetsSync.js (Vercel-safe)
// Uses GOOGLE_SERVICE_ACCOUNT_JSON env var (NOT local file)

const { google } = require("googleapis");

const SPREADSHEET_ID = (process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "").trim();
const TAB_NAME = (process.env.GOOGLE_SHEETS_TAB_NAME || "Sheet1").trim();

// Keep these headers EXACTLY in this order (A..T)
const HEADERS = [
  "phone_number",
  "name",
  "user_id",
  "session_id",
  "first_seen",
  "last_seen",
  "current_step",
  "user_service_type",
  "vehicle_type",
  "ppf_coverage_type",
  "selected_package",
  "protection_duration",
  "ppf_interior_addon",
  "expert_requested",
  "location",
  "preferred_date",
  "preferred_time",
  "total_price",
  "last_message_text",
  "last_message_at",
];

function must(value, envName) {
  if (!value) throw new Error(`Missing environment variable: ${envName}`);
  return value;
}

function toSheetValue(v) {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

// ✅ Vercel-safe auth (no fs, no keyFile)
async function getSheetsClient() {
  must(SPREADSHEET_ID, "GOOGLE_SHEETS_SPREADSHEET_ID");
  must(TAB_NAME, "GOOGLE_SHEETS_TAB_NAME");

  const raw = (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "").trim();
  must(raw, "GOOGLE_SERVICE_ACCOUNT_JSON");

  let creds;
  try {
    creds = JSON.parse(raw);
  } catch (e) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON. Paste full service-account.json content into Vercel env."
    );
  }

  // Important for Vercel/env formatting
  if (creds.private_key) {
    creds.private_key = creds.private_key.replace(/\\n/g, "\n");
  }

  if (!creds.client_email || !creds.private_key) {
    throw new Error(
      "Service account JSON missing client_email or private_key. Re-download service-account.json and paste again."
    );
  }

  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

async function ensureHeaderRow(sheets) {
  // Read first row A1:T1
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB_NAME}!A1:T1`,
  });

  const existing =
    res.data.values && res.data.values[0] ? res.data.values[0] : [];

  // If first cell is not "phone_number", assume headers missing/different
  if (existing.length === 0 || String(existing[0] || "").trim() !== "phone_number") {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TAB_NAME}!A1:T1`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADERS] },
    });
  }
}

async function findRowByPhone(sheets, phone) {
  // Read column A to locate existing row
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB_NAME}!A:A`,
  });

  const colA = res.data.values || [];

  // colA[0] is header row
  for (let i = 1; i < colA.length; i++) {
    const cell = String((colA[i] && colA[i][0]) || "").trim();
    if (cell === phone) return i + 1; // sheet row number
  }
  return -1;
}

/**
 * Upsert lead by phone_number:
 * - If phone exists -> update row A..T
 * - Else -> append new row A..T
 */
async function upsertLeadToSheet(lead) {
  const sheets = await getSheetsClient();

  const phone = String(lead.phone_number || "").trim();
  if (!phone) throw new Error("upsertLeadToSheet: lead.phone_number is required");

  await ensureHeaderRow(sheets);

  const rowValues = HEADERS.map((key) => toSheetValue(lead[key]));
  const foundRow = await findRowByPhone(sheets, phone);

  if (foundRow > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TAB_NAME}!A${foundRow}:T${foundRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [rowValues] },
    });
    return { action: "updated", row: foundRow };
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB_NAME}!A:T`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [rowValues] },
  });

  return { action: "inserted" };
}

module.exports = { upsertLeadToSheet, HEADERS };
