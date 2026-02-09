require('dotenv').config();
const { google } = require('googleapis');
const { HEADERS } = require('../googleSheetsSync');

const SPREADSHEET_ID = (process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '').trim();
const SOURCE_TAB = (process.env.GOOGLE_SHEETS_TAB_NAME || 'Sheet1').trim();

function getArg(name) {
  const prefix = `${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

const inPlace = process.argv.includes('--in-place');
const TARGET_TAB = (
  getArg('--target') ||
  process.env.GOOGLE_SHEETS_CLEAN_TAB_NAME ||
  `${SOURCE_TAB}_Clean`
).trim();

if (!SPREADSHEET_ID) {
  console.error('Missing GOOGLE_SHEETS_SPREADSHEET_ID in env.');
  process.exit(1);
}

function must(value, envName) {
  if (!value) throw new Error(`Missing environment variable: ${envName}`);
  return value;
}

function toSheetValue(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function getColumnLetter(index) {
  let result = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

async function getSheetsClient() {
  const raw = (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '').trim();
  must(raw, 'GOOGLE_SERVICE_ACCOUNT_JSON');
  let creds;
  try {
    creds = JSON.parse(raw);
  } catch (e) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.');
  }
  if (creds.private_key) {
    creds.private_key = creds.private_key.replace(/\\n/g, '\n');
  }
  if (!creds.client_email || !creds.private_key) {
    throw new Error('Service account JSON missing client_email or private_key.');
  }
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

const HEADER_LABELS = HEADERS.map((header) => header.label);
const NEW_KEYS = HEADERS.map((header) => header.key);
const LAST_COLUMN = getColumnLetter(HEADER_LABELS.length - 1);

const OLD_SCHEMA_KEYS = [
  'phone_number',
  'name',
  'user_id',
  'session_id',
  'first_seen',
  'last_seen',
  'current_step',
  'user_service_type',
  'vehicle_type',
  'ppf_coverage_type',
  'selected_package',
  'protection_duration',
  'ppf_interior_addon',
  'expert_requested',
  'location',
  'preferred_date',
  'preferred_time',
  'total_price',
  'last_message_text',
  'last_message_at',
];

const HEADER_ALIASES = {
  phone: 'phone_number',
  phone_number: 'phone_number',
  name: 'name',
  'current step': 'current_step',
  current_step: 'current_step',
  service: 'service',
  user_service_type: 'service',
  vehicle: 'vehicle',
  vehicle_type: 'vehicle',
  coverage: 'coverage',
  ppf_coverage_type: 'coverage',
  package: 'package',
  selected_package: 'package',
  duration: 'duration',
  protection_duration: 'duration',
  'interior addon': 'interior_addon',
  ppf_interior_addon: 'interior_addon',
  'expert requested': 'expert_requested',
  expert_requested: 'expert_requested',
  location: 'location',
  'preferred date': 'preferred_date',
  preferred_date: 'preferred_date',
  'preferred time': 'preferred_time',
  preferred_time: 'preferred_time',
  'total price': 'total_price_display',
  total_price: 'total_price_raw',
  'total price (raw)': 'total_price_raw',
  'last message': 'last_message_text',
  last_message_text: 'last_message_text',
  'last message (ist)': 'last_message_at_ist',
  last_message_at_ist: 'last_message_at_ist',
  'last message (utc)': 'last_message_at_utc',
  last_message_at_utc: 'last_message_at_utc',
  'first seen (ist)': 'first_seen_ist',
  first_seen_ist: 'first_seen_ist',
  'last seen (ist)': 'last_seen_ist',
  last_seen_ist: 'last_seen_ist',
  'message source': 'message_source',
  message_source: 'message_source',
  'session id': 'session_id',
  session_id: 'session_id',
  'user id': 'user_id',
  user_id: 'user_id',
  'session summary': 'session_summary_text',
  session_summary_text: 'session_summary_text',
  'recent messages': 'conversation_tail_text',
  conversation_tail_text: 'conversation_tail_text',
  'session snapshot (json)': 'session_snapshot_json',
  session_snapshot_json: 'session_snapshot_json',
};

function normalizeHeader(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTitleCase(value) {
  if (!value) return '';
  const words = String(value).replace(/_/g, ' ').trim().split(/\s+/);
  return words
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === 'ppf') return 'PPF';
      if (lower === 'gst') return 'GST';
      if (lower === 'id') return 'ID';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function formatYesNo(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    if (normalized === 'true' || normalized === 'yes') return 'Yes';
    if (normalized === 'false' || normalized === 'no') return 'No';
  }
  return value ? 'Yes' : 'No';
}

function formatServiceType(value) {
  if (!value) return '';
  const normalized = String(value).toLowerCase();
  if (normalized === 'ppf') return 'PPF';
  if (normalized === 'ceramic') return 'Ceramic';
  if (normalized === 'graphene') return 'Graphene';
  return toTitleCase(value);
}

function formatVehicleType(value) {
  if (!value) return '';
  const map = {
    compact: 'Compact SUV/Sedan',
    large_suv: 'Full-Size SUV/MUV',
    luxury: 'Luxury',
    bike: 'Bike/Superbike',
  };
  return map[value] || toTitleCase(value);
}

function formatCoverageType(coverage, interiorAddon) {
  if (!coverage) return '';
  if (coverage === 'both') return 'Exterior + Interior';
  if (coverage === 'exterior' && isTruthy(interiorAddon)) return 'Exterior + Interior';
  if (coverage === 'exterior') return 'Exterior';
  if (coverage === 'interior') return 'Interior';
  return toTitleCase(coverage);
}

function formatDuration(value) {
  if (!value) return '';
  const match = String(value).match(/^(\d+)\s*yr$/i);
  if (match) {
    const years = parseInt(match[1], 10);
    return `${years} Year${years === 1 ? '' : 's'}`;
  }
  return toTitleCase(value);
}

function formatPackage(value) {
  if (!value) return '';
  if (String(value).toLowerCase().includes('collection') || String(value).toLowerCase().includes('package')) {
    return value;
  }
  return toTitleCase(value);
}

function formatPriceInr(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(num);
  return `INR ${formatted}`;
}

function toDateSafe(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDateTime(value, timeZone) {
  const date = toDateSafe(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function toIsoString(value) {
  const date = toDateSafe(value);
  return date ? date.toISOString() : '';
}

function trimText(value, maxLen = 900) {
  if (!value) return '';
  const text = String(value);
  if (text.length <= maxLen) return text;
  return `${text.slice(0, Math.max(0, maxLen - 3))}...`;
}

function compactText(value, maxLen = 180) {
  if (!value) return '';
  const cleaned = String(value).replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLen - 3))}...`;
}

function normalizeWhitespace(value) {
  if (!value) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function stripOuterQuotes(value) {
  if (!value) return '';
  const text = String(value).trim();
  if (text.startsWith('"') && text.endsWith('"')) {
    return text.slice(1, -1);
  }
  return text;
}

function isTruthy(value) {
  if (value === true) return true;
  if (value === false) return false;
  if (value === null || value === undefined) return false;
  const normalized = String(value).toLowerCase().trim();
  return normalized === 'true' || normalized === 'yes' || normalized === '1';
}

function parseMaybeJson(value) {
  if (!value) return null;
  const text = stripOuterQuotes(String(value).trim());
  if (!text.startsWith('{')) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function stripMessagePrefix(text) {
  if (!text) return '';
  const cleaned = stripOuterQuotes(String(text).trim());
  const match = cleaned.match(/^(WEBHOOK|TEST)_[^_]+_(.*)$/);
  return match ? match[2] : text;
}

function formatSessionSummaryFromSnapshot(snapshot) {
  if (!snapshot) return '';
  const parts = [];
  if (snapshot.step) parts.push(`Step: ${toTitleCase(snapshot.step)}`);
  if (snapshot.user_service_type) parts.push(`Service: ${formatServiceType(snapshot.user_service_type)}`);
  if (snapshot.vehicle_type) parts.push(`Vehicle: ${formatVehicleType(snapshot.vehicle_type)}`);
  if (snapshot.ppf_coverage_type) {
    parts.push(
      `Coverage: ${formatCoverageType(snapshot.ppf_coverage_type, snapshot.ppf_interior_addon)}`
    );
  }
  if (snapshot.selected_package) parts.push(`Package: ${formatPackage(snapshot.selected_package)}`);
  if (snapshot.protection_duration) parts.push(`Duration: ${formatDuration(snapshot.protection_duration)}`);
  if (snapshot.user_location) parts.push(`Location: ${snapshot.user_location}`);
  if (snapshot.preferred_date || snapshot.preferred_time) {
    const when = [snapshot.preferred_date, snapshot.preferred_time].filter(Boolean).join(' at ');
    parts.push(`Preferred: ${toTitleCase(when)}`);
  }
  parts.push(`Expert: ${formatYesNo(snapshot.expert_requested) || 'No'}`);
  if (snapshot.ppf_interior_addon !== undefined) {
    parts.push(`Interior Addon: ${formatYesNo(snapshot.ppf_interior_addon)}`);
  }
  return trimText(parts.join(' | '));
}

function formatConversationTailFromSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.conversation_history_tail)) return '';
  const lines = snapshot.conversation_history_tail
    .map((item) => {
      if (item.user) return `U: ${compactText(item.user, 80)}`;
      if (item.bot) return `B: ${compactText(item.bot, 80)}`;
      return '';
    })
    .filter(Boolean);
  return trimText(lines.join(' | '));
}

function buildSummaryFromRow(row) {
  const parts = [];
  if (row.current_step) parts.push(`Step: ${toTitleCase(row.current_step)}`);
  if (row.service) parts.push(`Service: ${formatServiceType(row.service)}`);
  if (row.vehicle) parts.push(`Vehicle: ${formatVehicleType(row.vehicle)}`);
  if (row.coverage) parts.push(`Coverage: ${formatCoverageType(row.coverage, row.interior_addon)}`);
  if (row.package) parts.push(`Package: ${formatPackage(row.package)}`);
  if (row.duration) parts.push(`Duration: ${formatDuration(row.duration)}`);
  if (row.location) parts.push(`Location: ${row.location}`);
  if (row.preferred_date || row.preferred_time) {
    const when = [row.preferred_date, row.preferred_time].filter(Boolean).join(' at ');
    parts.push(`Preferred: ${toTitleCase(when)}`);
  }
  if (row.expert_requested !== undefined) {
    parts.push(`Expert: ${formatYesNo(row.expert_requested) || 'No'}`);
  }
  if (row.interior_addon !== undefined) {
    parts.push(`Interior Addon: ${formatYesNo(row.interior_addon)}`);
  }
  return trimText(parts.join(' | '));
}

function mapRowFromHeader(headerMap, row) {
  const data = {};
  headerMap.forEach((key, index) => {
    if (!key) return;
    data[key] = row[index];
  });
  return data;
}

function mapRowFromOldSchema(row) {
  const data = {};
  OLD_SCHEMA_KEYS.forEach((key, index) => {
    data[key] = row[index];
  });
  return data;
}

function normalizeRow(row, headerMap, headerIsNew) {
  let data = {};
  if (headerIsNew && row.length <= OLD_SCHEMA_KEYS.length) {
    data = mapRowFromOldSchema(row);
  } else if (headerMap.some(Boolean)) {
    data = mapRowFromHeader(headerMap, row);
  } else if (row.length >= OLD_SCHEMA_KEYS.length) {
    data = mapRowFromOldSchema(row);
  }

  const snapshot = parseMaybeJson(data.session_snapshot_json || data.session_summary_text);
  const sessionSummaryRaw = data.session_summary_text || '';
  const sessionSummary = formatSessionSummaryFromSnapshot(snapshot) ||
    buildSummaryFromRow(data) ||
    normalizeWhitespace(stripOuterQuotes(sessionSummaryRaw));
  const conversationTailRaw = data.conversation_tail_text || '';
  const conversationTail = formatConversationTailFromSnapshot(snapshot) ||
    normalizeWhitespace(stripOuterQuotes(conversationTailRaw));

  const lastMessageRaw = data.last_message_text || '';
  const cleanedMessage = stripMessagePrefix(lastMessageRaw);
  const messageSource =
    data.message_source ||
    (String(lastMessageRaw).startsWith('TEST_') ? 'test' : '') ||
    (String(lastMessageRaw).startsWith('WEBHOOK_') ? 'webhook' : '') ||
    '';

  const totalRaw = data.total_price_raw || data.total_price;
  const totalNumber = Number(totalRaw);
  const totalDisplayRaw = normalizeWhitespace(stripOuterQuotes(data.total_price_display || ''));
  const totalDisplayIsZero =
    totalDisplayRaw === '0' ||
    /^inr\s*0(\.0+)?$/i.test(totalDisplayRaw);
  const totalDisplay =
    totalDisplayIsZero
      ? ''
      : (totalDisplayRaw ||
          (Number.isFinite(totalNumber) && totalNumber > 0 ? formatPriceInr(totalNumber) : ''));

  const lastSeen = data.last_message_at || data.last_message_at_utc || data.last_seen;
  const firstSeen = data.first_seen_ist || data.first_seen;

  const normalized = {
    phone_number: data.phone_number || data.phone || '',
    name: data.name || '',
    current_step: toTitleCase(data.current_step || ''),
    service: formatServiceType(data.service || data.user_service_type || ''),
    vehicle: formatVehicleType(data.vehicle || data.vehicle_type || ''),
    coverage: formatCoverageType(data.coverage || data.ppf_coverage_type || '', data.interior_addon || data.ppf_interior_addon),
    package: formatPackage(data.package || data.selected_package || ''),
    duration: formatDuration(data.duration || data.protection_duration || ''),
    interior_addon: formatYesNo(data.interior_addon || data.ppf_interior_addon),
    expert_requested: formatYesNo(data.expert_requested),
    location: data.location || '',
    preferred_date: toTitleCase(data.preferred_date || ''),
    preferred_time: toTitleCase(data.preferred_time || ''),
    total_price_display: totalDisplay,
    total_price_raw: Number.isFinite(totalNumber) && totalNumber > 0 ? totalNumber : '',
    last_message_text: compactText(cleanedMessage),
    last_message_at_ist: data.last_message_at_ist || formatDateTime(lastSeen, 'Asia/Kolkata'),
    last_message_at_utc: data.last_message_at_utc || toIsoString(lastSeen),
    first_seen_ist: data.first_seen_ist || formatDateTime(firstSeen, 'Asia/Kolkata'),
    last_seen_ist: data.last_seen_ist || formatDateTime(lastSeen, 'Asia/Kolkata'),
    message_source: messageSource,
    session_id: data.session_id || '',
    user_id: data.user_id || '',
    session_summary_text: trimText(sessionSummary),
    conversation_tail_text: trimText(conversationTail),
  };

  return normalized;
}

async function ensureSheetExists(sheets, title) {
  const metadata = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = metadata.data.sheets?.some((sheet) => sheet.properties?.title === title);
  if (exists) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }],
    },
  });
}

async function main() {
  const sheets = await getSheetsClient();
  const range = `${SOURCE_TAB}!A1:${LAST_COLUMN}`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  const rows = res.data.values || [];
  if (rows.length === 0) {
    console.log('No data found in source sheet.');
    return;
  }

  const headerRow = rows[0] || [];
  const headerIsNew = headerRow.some(
    (value) => normalizeHeader(value) === 'session summary'
  );
  const headerMap = headerRow.map((value) => {
    const normalized = normalizeHeader(value);
    return HEADER_ALIASES[normalized] || null;
  });

  const cleanedRows = rows.slice(1).map((row) => normalizeRow(row, headerMap, headerIsNew));
  const outputRows = cleanedRows.map((row) =>
    NEW_KEYS.map((key) => toSheetValue(row[key]))
  );

  const target = inPlace ? SOURCE_TAB : TARGET_TAB;
  await ensureSheetExists(sheets, target);

  const targetRange = `${target}!A1:${LAST_COLUMN}${outputRows.length + 1}`;
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${target}!A1:${LAST_COLUMN}`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: targetRange,
    valueInputOption: 'RAW',
    requestBody: {
      values: [HEADER_LABELS, ...outputRows],
    },
  });

  console.log(`Cleaned data written to tab: ${target}`);
}

main().catch((error) => {
  console.error('Sheet cleanup failed:', error);
  process.exit(1);
});
