# Blood Letting Donation Event Manager
## System Overview

A comprehensive admin portal and donor registration system for managing blood donation events. Administrators can create events, build custom registration forms, generate secure public registration links, scan QR codes for donor check-in, and track donations through a full lifecycle — all from a single responsive interface.

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase PostgreSQL + Row Level Security |
| Auth | Supabase Auth (email/password) with custom context |
| QR Codes | `qrcode.react` (generation), `html5-qrcode` (scanning) |
| Icons | lucide-react |
| Routing | Multi-domain — admin on main domain, donor portal on configurable `NEXT_PUBLIC_DONOR_PORTAL_URL` |

---

## Core Features

### 1. Blood Drive Event Management

- **Create and manage events** with title, description, date/time, location, and status (draft / active / completed / cancelled).
- **Custom form builder** — per-event dynamic fields (text, number, date, select, checkbox) with optional descriptions and required toggle. Schema stored as JSONB in `blood_events.custom_form_schema`.
- **Event cards** on the events listing page with search and sort. Click any card to open the full event detail page.
- **Inline 3-dot menu** for quick edit / delete actions.
- **Status badge** with color coding for each event state.

### 2. Donor Registration

- **Admin-side registration** — register donors directly from the event detail page.
- **Public registration form** — accessible without login at `/register/[event_id]`. Supports both baseline fields (name, email, blood type) and dynamic custom fields defined by the admin.
- **QR ticket generation** — on successful registration, a downloadable ticket is displayed with:
  - Event title and date
  - QR code encoding the registration UUID
  - Donor name, blood type, and registration ID
  - High-res canvas rendering with Geist font for print quality
- **Duplicate prevention** — email + blood type + event uniqueness enforced.

### 3. QR Code System

- **QR generation** — SVG QR codes embedded in on-screen display and downloadable canvas tickets.
- **QR scanning** — camera-based QR scanner modal (`html5-qrcode`) for rapid check-in at donation venues. Scanner reads the UUID from the QR code and looks up the donor via the API.
- **Donor lookup fallback** — when a scanned donor isn't found in the local event list, the system falls back to a GET API call to find the donor across events.
- **Check-in flow** — mark donors as `arrived` (boolean) and update `donation_status` (pending → passed / failed).

### 4. Donation Workflow

Four statuses tracked per donor registration:

| Status | Meaning |
|---|---|
| `pending` | Donor arrived, donation not yet processed |
| `passed` | Donation completed successfully |
| `failed` | Donor was ineligible or donation failed |

- `arrived` boolean flag tracks physical arrival.
- Status and arrival can be updated from the event detail donor table or via QR scan check-in.

### 5. Dashboard

Full-width analytics dashboard with:

- **Stat cards** — total donors, active events, completed donations, and other key metrics.
- **Blood type distribution** — CSS donut chart (conic-gradient) showing donor breakdown by blood type.
- **Top events** — bar chart of events by registration count.
- **Upcoming events** — list of upcoming blood drives.
- **Recent registrations** — latest donor entries across all events.
- **API endpoint** — `GET /api/dashboard/stats` runs parallel Supabase queries for all dashboard data.

### 6. Master Registry

Searchable, sortable, filterable table of **all donors across all events**:

- **Search** by name or email.
- **Filter** by blood type and donation status.
- **Sort** by name, email, blood type, event, registration date, or status.
- **Pagination** with prev/next controls.
- **Click-through** — click any row to navigate to the parent event detail page.
- **API endpoint** — `GET /api/registry` with query parameters for search, filter, sort, and pagination.

### 7. Google Sheets Import

- Import donor data from Google Sheets into the system.
- Connector form for entering spreadsheet details and mapping columns.

### 8. Settings

Full-width settings page with three sections:

- **Profile** — current user name and email from auth context.
- **Portal Configuration** — donor portal URL display and copy button (sourced from `NEXT_PUBLIC_DONOR_PORTAL_URL`).
- **System Info** — application name, framework version, database, and environment badge.

---

## Security

| Control | Implementation |
|---|---|
| Row Level Security | Supabase RLS on `donor_registrations` — anonymous users can only INSERT, no SELECT |
| Admin access | Service-role key used for all admin API routes |
| Route protection | `src/proxy.ts` whitelists public paths (`/register/*`), all others require auth |
| Origin validation | API routes verify request origin against expected domain |
| Rate limiting | Applied to public registration endpoints |
| Input validation | Zod schema validation on all API inputs |
| Input sanitization | XSS prevention on all user-supplied data |

---

## Database Schema

### Migrations

| Migration | Purpose |
|---|---|
| `001_initial_schema.sql` | Core tables — users, admins, base schema |
| `002_blood_events.sql` | `blood_events` table with JSONB `custom_form_schema` |
| `003_donation_workflow.sql` | `arrived` boolean + `donation_status` enum on `donor_registrations` |

### Key Tables

- **`blood_events`** — event metadata, custom form schema (JSONB), status
- **`donor_registrations`** — donor info, event reference, custom form responses (JSONB), arrival flag, donation status, QR registration ID

---

## File Structure

```
blood-letting-system/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── auth/                     # Login & signup pages
│   │   ├── dashboard/                # Analytics dashboard
│   │   ├── events/                   # Event CRUD + detail + edit
│   │   ├── forms/                    # Google Sheets Import
│   │   ├── grids/                    # Dynamic data grids
│   │   ├── register/[event_id]/      # Public donor registration form
│   │   ├── registry/                 # Master donor registry
│   │   ├── settings/                 # System settings
│   │   └── api/                      # API routes
│   │       ├── auth/                 # Authentication endpoints
│   │       ├── config/               # App config (portal URL)
│   │       ├── dashboard/stats/      # Dashboard aggregation
│   │       ├── events/               # Event + donor CRUD
│   │       ├── records/              # Generic table record access
│   │       ├── registry/             # Registry query endpoint
│   │       └── sheets/               # Google Sheets integration
│   │
│   ├── components/
│   │   ├── ui/                       # Design system (Button, Input, Modal, Dropdown, Spinner, Toast)
│   │   ├── layout/                   # Shell, Sidebar (mobile hamburger + desktop)
│   │   ├── grid/                     # Dynamic data grid engine
│   │   ├── forms/                    # SheetsImporter
│   │   ├── auth-guard.tsx            # Route protection component
│   │   └── QRScanner.tsx             # Camera QR scanner modal
│   │
│   ├── hooks/                        # useDynamicSchema, useRealtimeSync
│   ├── lib/                          # Auth context, Supabase clients, API client, validators
│   ├── types/                        # TypeScript interfaces and shared types
│   ├── styles/                       # Theme tokens
│   └── proxy.ts                      # Next.js 16 route protection (replaces middleware)
│
├── supabase/migrations/              # SQL schema migrations (001–003)
├── scripts/apps-script-template/     # Google Apps Script templates
└── docs/                             # Documentation
```

---

## Mobile Responsiveness

- **Sidebar** — toggles via hamburger icon on mobile; overlay + backdrop on small screens, permanent sidebar on desktop.
- **Pages** — responsive padding (`px-4 sm:px-6`), responsive grid layouts (`grid-cols-2 lg:grid-cols-4`), horizontal scroll on data tables for small screens.
- **Event detail** — full-width donor table with hidden columns on mobile, QR scanner as full-screen modal.
- **Registration form** — single-column layout on mobile, multi-field on desktop.

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/login` | POST | Sign in with email/password |
| `/api/auth/signup` | POST | Create new account |
| `/api/auth/logout` | POST | Sign out |
| `/api/auth/session` | GET | Get current session |
| `/api/config` | GET | Returns portal URL config |
| `/api/dashboard/stats` | GET | Aggregated dashboard statistics |
| `/api/events` | GET / POST | List all events / Create new event |
| `/api/events/[id]` | GET / PUT / DELETE | Get / Update / Delete single event |
| `/api/events/[id]/donors` | POST | Register a donor for an event |
| `/api/events/[id]/donors/[donorId]` | GET / PATCH | Look up donor / Update arrival & status |
| `/api/registry` | GET | Search, filter, sort, and paginate all donors |
| `/api/sheets` | GET / POST | List / Create Google Sheets connections |
| `/api/sheets/[id]` | GET / PUT / DELETE | Manage individual sheet connection |
| `/api/sheets/[id]/sync` | POST | Trigger sync from a connected sheet |
| `/api/sheets/connect` | POST | Connect to a Google Sheet |
| `/api/records/[tableName]` | GET / POST | Generic record access for dynamic tables |
