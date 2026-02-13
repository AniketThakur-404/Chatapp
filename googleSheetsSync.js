const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const SPREADSHEET_ID = (
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
  process.env.GOOGLE_SHEET_ID ||
  ""
).trim();
const TAB_NAME = (
  process.env.GOOGLE_SHEETS_TAB_NAME ||
  process.env.GOOGLE_SHEET_NAME ||
  "Sheet1"
).trim();

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
  { key: "session_summary_text", label: "Session Summary" },
  { key: "conversation_tail_text", label: "Recent Messages" },
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

function normalizeRawJson(raw) {
  let text = String(raw || "").trim();
  if (!text) return "";

  if (text.startsWith("GOOGLE_SERVICE_ACCOUNT_JSON=")) {
    text = text.slice("GOOGLE_SERVICE_ACCOUNT_JSON=".length).trim();
  }

  if (
    (text.startsWith("'") && text.endsWith("'")) ||
    (text.startsWith('"') && text.endsWith('"'))
  ) {
    text = text.slice(1, -1).trim();
  }

  return text;
}

function loadServiceAccountJsonRaw() {
  const fromJson = normalizeRawJson(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (fromJson) {
    return { raw: fromJson, source: "GOOGLE_SERVICE_ACCOUNT_JSON" };
  }

  const fromB64 = (process.env.GOOGLE_SERVICE_ACCOUNT_B64 || "").trim();
  if (fromB64) {
    let decoded;
    try {
      decoded = Buffer.from(fromB64, "base64").toString("utf8");
    } catch (error) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_B64 is not valid base64.");
    }
    return {
      raw: normalizeRawJson(decoded),
      source: "GOOGLE_SERVICE_ACCOUNT_B64",
    };
  }

  const filePath = (
    process.env.GOOGLE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_SERVICE_ACCOUNT_FILE ||
    ""
  ).trim();
  if (filePath) {
    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    let fileContents = "";
    try {
      fileContents = fs.readFileSync(resolvedPath, "utf8");
    } catch (error) {
      throw new Error(
        `Unable to read service account file at ${resolvedPath}: ${error.message}`
      );
    }

    return { raw: normalizeRawJson(fileContents), source: resolvedPath };
  }

  throw new Error(
    "Missing service account credentials. Set one of GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_SERVICE_ACCOUNT_B64, GOOGLE_SERVICE_ACCOUNT_PATH, or GOOGLE_SERVICE_ACCOUNT_FILE."
  );
}

function parseServiceAccount(raw, sourceName) {
  must(raw, sourceName);

  let creds;
  try {
    creds = JSON.parse(raw);
  } catch (e) {
    throw new Error(`${sourceName} is not valid JSON.`);
  }

  // Preserve multiline key formatting when provided with escaped newlines.
  if (creds.private_key) {
    creds.private_key = creds.private_key.replace(/\\n/g, "\n");
  }

  if (!creds.client_email || !creds.private_key) {
    throw new Error(
      `Service account JSON from ${sourceName} is missing client_email or private_key.`
    );
  }

  return creds;
}

async function getSheetsClient() {
  must(SPREADSHEET_ID, "GOOGLE_SHEETS_SPREADSHEET_ID (or GOOGLE_SHEET_ID)");
  must(TAB_NAME, "GOOGLE_SHEETS_TAB_NAME (or GOOGLE_SHEET_NAME)");

  const { raw, source } = loadServiceAccountJsonRaw();
  const creds = parseServiceAccount(raw, source);

  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return {
    sheets: google.sheets({ version: "v4", auth }),
    clientEmail: creds.client_email,
  };
}

async function ensureHeaderRow(sheets) {
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
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB_NAME}!A:A`,
  });

  const colA = res.data.values || [];

  for (let i = 1; i < colA.length; i++) {
    const cell = String((colA[i] && colA[i][0]) || "").trim();
    if (cell === phone) return i + 1;
  }
  return -1;
}

async function upsertLeadToSheet(lead) {
  const { sheets, clientEmail } = await getSheetsClient();

  const phone = String(lead.phone_number || "").trim();
  if (!phone) throw new Error("upsertLeadToSheet: lead.phone_number is required");

  try {
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
  } catch (error) {
    if (error?.response?.status === 403) {
      const baseMessage = error.message || "Google Sheets permission denied";
      error.message = `${baseMessage}. Share spreadsheet ${SPREADSHEET_ID} with ${clientEmail} as Editor.`;
    }
    throw error;
  }
}

module.exports = { upsertLeadToSheet, HEADERS };
