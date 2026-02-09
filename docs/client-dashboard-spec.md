# Client Dashboard Specification (CRM + Chat History)

Date: 2026-02-03

## Goal
Build a client-facing dashboard so the owner of the WhatsApp number can:
- See all users who chatted with the bot.
- Track conversation history and current step.
- Manage leads (status, notes, follow-up).
- Get basic analytics (counts, conversion).

This dashboard reads data from the existing database used by the bot and makes it visible in a clean web UI.

## Current System (as-is)
Server and bot:
- Express server: `server.js`
- Bot logic and in-memory session fields: `bot.js`

Database (PostgreSQL / NeonDB):
- DB client: `db.js`
- Schema creation: `initDatabase.js`
- Connection: `DATABASE_URL` in `.env` / `.env.example`

Existing tables:
- `ChatUser`: `id`, `phone_number`, `name`, `createdAt`, `updatedAt`
- `Session`: `id`, `userId`, `current_step`, `selected_package`, `location`, `createdAt`, `updatedAt`
- `Message`: `id`, `sessionId`, `sender`, `message_text`, `createdAt`, `updatedAt`

Important: The bot keeps many fields only in memory (see `bot.js`), so they are not stored in the DB yet.

## What the Dashboard Must Show (MVP)
### 1) Users / Leads list
Columns:
- Phone number
- Name (if collected)
- Last message time
- Current step (from latest Session)
- Selected package (if any)
- Location (if any)
- Status (new/active/qualified/etc.)

Filters:
- Date range (last 7/30/90 days)
- Status
- Service type (if stored)
- Has booking info (yes/no)

Actions:
- Open details
- Update lead status
- Add note

### 2) Lead / User detail page
Sections:
- Profile: phone, name, first seen, last seen
- Session snapshot: step, service type, vehicle type, package, location
- Chat history timeline (user + bot)
- Notes / follow-up / assigned owner

### 3) Chat history view
Conversation timeline by session:
- Message direction (user/bot)
- Timestamps
- Message text

### 4) Analytics (simple)
Tiles:
- Total users
- Active users (last 24h / 7d)
- Leads by status
- Messages per day

## Data Gaps and Required Storage
The current DB only stores:
- `current_step`
- `selected_package`
- `location`
- message text

But the bot tracks more fields in memory:
- `user_service_type`
- `vehicle_type`
- `ppf_coverage_type`
- `protection_duration`
- `preferred_date`
- `preferred_time`
- `ppf_interior_addon`
- `expert_requested`
- `user_name` (stored on ChatUser only if collected)

If you want a true CRM dashboard, persist these fields.

## Two Implementation Options
### Option A: MVP with current schema (fast)
Pros:
- No DB migration
- Can ship quickly

Data shown:
- Users list + chat history
- Current step + selected_package + location

Limitations:
- No service/vehicle/booking details
- Weak analytics

### Option B: Full CRM (recommended)
Add a `Lead` table or expand `Session` to store a full snapshot.

Recommended approach (stable):
Create new table `Lead` with 1 row per user, plus `LeadStatusHistory`:

`Lead` fields:
- `id` (PK)
- `userId` (FK -> ChatUser)
- `status` (new, active, qualified, booked, closed_lost)
- `service_type`
- `vehicle_type`
- `ppf_coverage_type`
- `selected_package`
- `protection_duration`
- `ppf_interior_addon` (bool)
- `expert_requested` (bool)
- `location`
- `preferred_date`
- `preferred_time`
- `last_step`
- `last_message_at`
- `assigned_to`
- `notes` (text)
- `tags` (array or JSON)
- `createdAt`, `updatedAt`

`LeadStatusHistory` fields:
- `id`
- `leadId` (FK -> Lead)
- `from_status`
- `to_status`
- `changed_by`
- `changed_at`

Alternative: add a `session_data` JSONB column to `Session` and store the full bot session at each update.

## API Contract (needed for dashboard)
Add admin endpoints in `server.js` (or a new `admin.js` router):

Read:
- `GET /admin/users?search=&status=&dateFrom=&dateTo=`
- `GET /admin/users/:id`
- `GET /admin/users/:id/sessions`
- `GET /admin/sessions/:id/messages`
- `GET /admin/analytics?dateFrom=&dateTo=`

Write:
- `PATCH /admin/leads/:id` (status, notes, tags, assigned_to)
- `POST /admin/leads/:id/notes`

Security (required):
- Admin auth token in header, or basic auth.
- Rate limiting on admin endpoints.

## UI Pages (proposed)
1) Overview
- KPI tiles
- Status distribution chart
- Recent chats table

2) Leads
- Search + filter
- Status update inline
- Quick open to detail

3) Lead detail
- Profile + session snapshot
- Chat timeline
- Notes + follow-up

4) Settings
- API tokens
- Status config

## Tracking “Automation Running on His Number”
To show automation activity:
- Dashboard should show the WhatsApp number that is connected (ENV `PHONE_NUMBER_ID`).
- Display last webhook event time and total messages today.
- Store `last_bot_message_at` in DB.

## Implementation Steps
1) Decide MVP vs Full CRM.
2) Add DB migration:
   - If Full CRM: create `Lead` and `LeadStatusHistory`.
   - If MVP: no schema change.
3) Update webhook flow in `server.js` to persist session fields into Lead/Session.
4) Build admin APIs.
5) Build dashboard UI (static HTML + JS in `public`, or a separate frontend app).
6) Add admin auth and basic rate limit.

## Acceptance Checklist
- Client can see all users and chat history.
- Client can filter users and view details.
- Lead status and notes persist.
- Analytics page shows totals and activity.
- Access is protected by auth.

## Open Questions
- Do you want MVP now, or full CRM?
- Do you want a separate dashboard frontend, or simple HTML inside this server?
- Who will use it (one admin or a team)?
- Do you want exports (CSV) and data retention rules?
