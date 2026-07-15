# Blood Letting Donation Event Manager

A comprehensive admin portal and donor registration system for managing blood donation events. Administrators can create events, build custom registration forms, generate secure public registration links, scan QR codes for donor check-in, and track donations through a full lifecycle.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase PostgreSQL + Row Level Security |
| Auth | Supabase Auth (email/password) |
| QR Codes | `qrcode.react` (generation), `html5-qrcode` (scanning) |

---

## Prerequisites

- **Node.js** 18+ (recommended: 20)
- **npm** or **yarn**
- A **Supabase** project ([supabase.com](https://supabase.com))
- (Optional) A **Vercel** account for deployment ([vercel.com](https://vercel.com))

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL — found in **Project Settings > API** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key — found in **Project Settings > API** |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key — found in **Project Settings > API**. **Never expose this client-side.** |
| `GOOGLE_SHEETS_API_KEY` | No | Google Sheets API key for the sheets import feature. Get one at [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) |
| `PORTAL_URL` | Yes | Public URL where the app is hosted (e.g., `https://your-app.vercel.app` or `http://localhost:3000`) |
| `NEXT_PUBLIC_PORTAL_URL` | Yes | Same as `PORTAL_URL` but exposed to the client bundle |
| `NEXT_PUBLIC_DONOR_PORTAL_URL` | Yes | External domain where donors access registration forms (e.g., `https://bloodserve-portal.com`). Set to `http://localhost:3000` for local dev |

---

## Local Development

### 1. Clone and install

```bash
git clone <your-repo-url>
cd blood-letting-system
npm install
```

### 2. Set up environment

```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### 3. Run database migrations

In your Supabase dashboard, go to **SQL Editor** and run each migration file in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_blood_events.sql
supabase/migrations/003_donation_workflow.sql
```

Or use the Supabase CLI:

```bash
npx supabase db push
```

### 4. Start the dev server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

### 2. Import on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel will auto-detect Next.js — keep the default settings

### 3. Configure environment variables

In the Vercel project dashboard, go to **Settings > Environment Variables** and add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `GOOGLE_SHEETS_API_KEY` | Your Google Sheets API key (optional) |
| `PORTAL_URL` | Your Vercel deployment URL (e.g., `https://your-app.vercel.app`) |
| `NEXT_PUBLIC_PORTAL_URL` | Same as `PORTAL_URL` |
| `NEXT_PUBLIC_DONOR_PORTAL_URL` | Your donor portal domain (e.g., `https://bloodserve-portal.com`) |

> **Note:** Set `SUPABASE_SERVICE_ROLE_KEY` to **Environment: Production** only — never expose it to the client.

### 4. Deploy

Click **Deploy**. Vercel will build and deploy your app automatically.

### 5. Custom domain (optional)

In **Settings > Domains**, add your custom domain and follow the DNS configuration steps.

---

## Post-Deployment Checklist

- [ ] Run all three SQL migrations in your Supabase project
- [ ] Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` is **not** exposed to the client (server-side only)
- [ ] Set `PORTAL_URL` and `NEXT_PUBLIC_PORTAL_URL` to your production domain
- [ ] Set `NEXT_PUBLIC_DONOR_PORTAL_URL` to your donor-facing domain
- [ ] Create your admin account via the signup page
- [ ] Test creating an event with custom form fields
- [ ] Test the public registration link at `/register/[event_id]`
- [ ] Test QR code generation and download
- [ ] Test QR code scanning with a mobile device camera
- [ ] Verify the dashboard loads with stats

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Database Migrations

| Migration | Purpose |
|---|---|
| `001_initial_schema.sql` | Core tables — users, admins, base schema |
| `002_blood_events.sql` | `blood_events` table with JSONB `custom_form_schema` |
| `003_donation_workflow.sql` | `arrived` boolean + `donation_status` enum on `donor_registrations` |

Run these in order via the Supabase SQL Editor or CLI.

---

## Project Structure

```
blood-letting-system/
├── src/
│   ├── app/                          # Next.js App Router pages & API routes
│   │   ├── auth/                     # Login & signup
│   │   ├── dashboard/                # Analytics dashboard
│   │   ├── events/                   # Event CRUD + detail + edit
│   │   ├── forms/                    # Google Sheets Import
│   │   ├── register/[event_id]/      # Public donor registration (no auth required)
│   │   ├── registry/                 # Master donor registry
│   │   ├── settings/                 # System settings
│   │   └── api/                      # REST API endpoints
│   │
│   ├── components/
│   │   ├── ui/                       # Design system primitives
│   │   ├── layout/                   # Shell, Sidebar
│   │   ├── grid/                     # Dynamic data grid engine
│   │   ├── forms/                    # SheetsImporter
│   │   └── QRScanner.tsx             # Camera QR scanner
│   │
│   ├── hooks/                        # Custom React hooks
│   ├── lib/                          # Auth, Supabase clients, utilities
│   ├── types/                        # TypeScript interfaces
│   └── proxy.ts                      # Next.js 16 route protection
│
├── supabase/migrations/              # SQL schema migrations
├── scripts/apps-script-template/     # Google Apps Script templates
├── docs/                             # System documentation
└── .env.example                      # Environment variable template
```

---

## License

Private — internal use only.
