// googleSheetsSync.js (Vercel-safe)
// Uses GOOGLE_SERVICE_ACCOUNT_JSON env var (NOT local file)

const { google } = require("googleapis");

const SPREADSHEET_ID = (process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "").trim();
const TAB_NAME = (process.env.GOOGLE_SHEETS_TAB_NAME || "Sheet1").trim();

// Keep these headers EXACTLY in this order (A..)
const HEADERS = [
  { key: "phone_number", label: "Phone" },
  { key: "name", label: "Name" },
  { key: "current_step", label: "Current Step" },
  { key: "service", label: "Service" },
  { key: "vehicle", label: "Vehicle" },
  { key: "coverage", label: "Coverage" },
  { key: "package", label: "Package" },
  { key: "duration", label: "Duration" },
  { key: "interior_addon", label: "Interior Addon" },
  { key: "expert_requested", label: "Expert Requested" },
  { key: "location", label: "Location" },
  { key: "preferred_date", label: "Preferred Date" },
  { key: "preferred_time", label: "Preferred Time" },
  { key: "total_price_display", label: "Total Price" },
  { key: "total_price_raw", label: "Total Price (Raw)" },
  { key: "last_message_text", label: "Last Message" },
  { key: "last_message_at_ist", label: "Last Message (IST)" },
  { key: "last_message_at_utc", label: "Last Message (UTC)" },
  { key: "first_seen_ist", label: "First Seen (IST)" },
  { key: "last_seen_ist", label: "Last Seen (IST)" },
  { key: "message_source", label: "Message Source" },
  { key: "session_id", label: "Session ID" },
  { key: "user_id", label: "User ID" },
  { key: "session_snapshot_json", label: "Session Snapshot (JSON)" },
];

const HEADER_LABELS = HEADERS.map((header) => header.label);

function getColumnLetter(index) {
  let result = "";
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

const LAST_COLUMN = getColumnLetter(HEADERS.length - 1);

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
    range: `${TAB_NAME}!A1:${LAST_COLUMN}1`,
  });

  const existing =
    res.data.values && res.data.values[0] ? res.data.values[0] : [];

  const normalizedExisting = existing.map((value) => String(value || "").trim());
  const normalizedExpected = HEADER_LABELS.map((value) => String(value || "").trim());
  const headersMatch =
    normalizedExisting.length === normalizedExpected.length &&
    normalizedExpected.every((value, index) => normalizedExisting[index] === value);

  if (!headersMatch) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TAB_NAME}!A1:${LAST_COLUMN}1`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADER_LABELS] },
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

  const rowValues = HEADERS.map((header) => toSheetValue(lead[header.key]));
  const foundRow = await findRowByPhone(sheets, phone);

  if (foundRow > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TAB_NAME}!A${foundRow}:${LAST_COLUMN}${foundRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [rowValues] },
    });
    return { action: "updated", row: foundRow };
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB_NAME}!A:${LAST_COLUMN}`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [rowValues] },
  });

  return { action: "inserted" };
}

module.exports = { upsertLeadToSheet, HEADERS };
