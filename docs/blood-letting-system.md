# Blood Donor Admin Portal & Dynamic Data Hub
## System Overview

The system is a highly scalable Admin Portal and Dynamic Data Hub designed for the rapid intake, processing, and management of blood donors. Instead of relying on a static setup, the system is fully customizable — allowing administrators to instantly connect external Google Forms on the fly, auto-generate corresponding database tables, and manage records in tailored, high-performance data grids.

The system must be built with a **modern UI/UX component library** (clean, responsive, accessible, and consistent across all screens) and must follow a **scalable file architecture** that supports maintainable growth as new forms, tables, and features are added over time.

---

## Core Features

### 1. Form Integration Manager (Dynamic Connection Setup)

- **No-Code Connector Form:** A dedicated administration configuration screen where the admin can input a friendly name for a new blood drive (e.g., "Barangay Central Drive - August 2026").
- **Secure Token Authentication:** The system auto-generates a unique security secret key (`Connection Token`) for each setup. This key is pasted into the universal Google Apps Script to verify and authorize incoming traffic.
- **Auto-Schema & Table Generation:** When the first test payload arrives from Google Forms, the system's backend intelligently reads the question titles and automatically executes database scripts to create a brand new, custom table mapping exactly to that form's specific structure.

### 2. Multi-Donor Batch Entry Grid (Context-Aware Tables)

- **Dynamic Data Layouts:** Once a form is connected, a dedicated tab appears in the navigation panel, opening up an Excel-like editable grid formatted precisely to match that specific form's columns.
- **Rapid Keyboard Intake:** Optimized heavily for speed, allowing an admin at a registration venue to add new rows, type out entries, and navigate cells purely using arrow keys, `Tab`, and `Enter` without touching a mouse.
- **Inline Controls & Validation:** Features context-aware dropdown elements right within table cells for swift data selection (e.g., Blood Type, Eligibility Status) to eliminate manual typo errors.

### 3. Real-Time Webhook Engine

- **Instant Sync:** Powered by a lightweight, reusable Google Apps Script template attached to your forms. The moment a donor clicks "Submit" on a Google Form, the webhook pushes the data as a clean JSON package directly to your admin portal backend.
- **Multi-Form Capability:** The system can securely manage and sort incoming donor submissions from multiple different forms (e.g., running separate drives for different locations simultaneously) into their respective intake grids seamlessly.

### 4. Master Registry & Archive

- **Historic Repository:** A read-only central warehouse of all historical, validated donor records across all blood drives.
- **Search & Filter Mechanics:** Equipped with robust search bar capabilities allowing admins to look up past records by Name, Contact Number, or specific Blood Type on demand.

---

## Additional System Requirements

### Modern UI/UX Components

- The interface must use a modern, consistent component library (e.g., accessible design system components for forms, tables, modals, dropdowns, and navigation).
- Responsive layouts that work across desktop and tablet devices, since admins may register donors on-site using different hardware.
- Clear visual feedback for real-time actions (e.g., new submission notifications, save states, validation errors).
- Consistent theming, typography, and spacing across all admin screens for a polished, professional experience.

### Scalable File Architecture

- The codebase must be organized to support continuous growth — new dynamically generated forms/tables should not require restructuring the core application.
- Clear separation of concerns: frontend components, backend services/API routes, database schema/migrations, and webhook handlers should live in distinct, well-defined modules.
- Support for dynamically generated resources (auto-created tables and their corresponding UI grids) without hardcoding form-specific logic into the core system.
- Maintainable naming conventions and folder structures that allow multiple developers to work on the system in parallel as it scales.

---

## Suggested File Architecture

A scalable architecture suited to this system's needs — dynamic schema generation, webhook ingestion, and a data-grid-heavy admin UI. It follows a modular monorepo pattern so backend, frontend, and dynamic resources stay decoupled as the system grows.

```
blood-donor-admin-portal/
│
├── apps/
│   ├── web/                          # Frontend (Admin Portal)
│   │   ├── src/
│   │   │   ├── app/                  # Routes/pages (e.g. Next.js app router)
│   │   │   │   ├── dashboard/
│   │   │   │   ├── forms/            # Form Integration Manager screens
│   │   │   │   ├── grids/            # Dynamic per-form data grid views
│   │   │   │   │   └── [formId]/     # Dynamically rendered grid per connected form
│   │   │   │   ├── registry/         # Master Registry & Archive
│   │   │   │   └── auth/
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── ui/               # Design system primitives (buttons, modals, inputs)
│   │   │   │   ├── grid/             # Reusable dynamic data-grid engine
│   │   │   │   │   ├── DynamicGrid.tsx
│   │   │   │   │   ├── CellEditor.tsx
│   │   │   │   │   ├── DropdownCell.tsx
│   │   │   │   │   └── KeyboardNav.ts
│   │   │   │   ├── forms/            # Connector setup form components
│   │   │   │   └── layout/           # Nav panel, shell, theming
│   │   │   │
│   │   │   ├── hooks/                # useDynamicSchema, useRealtimeSync, etc.
│   │   │   ├── lib/                  # API client, formatters, validators
│   │   │   ├── styles/               # Theme tokens, global styles
│   │   │   └── types/                # Shared frontend types
│   │   └── package.json
│   │
│   └── api/                          # Backend service
│       ├── src/
│       │   ├── modules/
│       │   │   ├── form-integration/         # No-code connector logic
│       │   │   │   ├── controller.ts
│       │   │   │   ├── service.ts
│       │   │   │   ├── token.service.ts      # Connection Token generation/validation
│       │   │   │   └── schema-generator.ts   # Auto-schema & table creation logic
│       │   │   │
│       │   │   ├── webhook/                  # Real-Time Webhook Engine
│       │   │   │   ├── controller.ts         # Receives Google Apps Script payloads
│       │   │   │   ├── payload-parser.ts
│       │   │   │   └── dispatcher.ts         # Routes payload to correct dynamic table
│       │   │   │
│       │   │   ├── dynamic-records/          # CRUD for auto-generated tables
│       │   │   │   ├── controller.ts
│       │   │   │   ├── service.ts
│       │   │   │   └── query-builder.ts      # Generic query layer for dynamic schemas
│       │   │   │
│       │   │   ├── registry/                 # Master Registry & Archive
│       │   │   │   ├── controller.ts
│       │   │   │   ├── service.ts
│       │   │   │   └── search.service.ts
│       │   │   │
│       │   │   └── auth/                     # Admin authentication & authorization
│       │   │
│       │   ├── db/
│       │   │   ├── migrations/               # Static/core schema migrations
│       │   │   ├── dynamic-migrations/       # Auto-generated table migration logs
│       │   │   ├── models/                   # Core models (Admin, FormConnection, Token)
│       │   │   └── client.ts                 # DB connection instance
│       │   │
│       │   ├── middleware/                   # Token validation, rate limiting, logging
│       │   ├── config/                       # Env config, constants
│       │   └── utils/
│       └── package.json
│
├── packages/                          # Shared code across web & api
│   ├── types/                         # Shared TypeScript interfaces (Form, Record, Token)
│   ├── validators/                    # Shared schema validation (zod/yup)
│   └── constants/                     # Blood types, eligibility statuses, enums
│
├── scripts/
│   └── apps-script-template/          # Reusable Google Apps Script webhook template
│       └── webhook.gs
│
├── infra/                             # Deployment & infrastructure
│   ├── docker/
│   ├── ci-cd/
│   └── env/
│
└── docs/
    ├── system-overview.md
    └── architecture.md
```

### Key Design Principles

- **Dynamic schema isolation** — `schema-generator.ts` and `dynamic-migrations/` keep auto-created tables separate from core (static) tables like `Admin` or `FormConnection`, so dynamic growth never touches core migration history.
- **Generic query layer** — `query-builder.ts` lets one service handle CRUD for *any* dynamically generated table instead of writing custom code per form.
- **Grid engine as a reusable module** — `components/grid/` is form-agnostic; it renders based on schema metadata fetched per `formId`, so a new blood drive form needs zero new frontend code.
- **Webhook decoupling** — the webhook module only parses and dispatches; it doesn't know about UI or grid logic, keeping ingestion resilient even if the frontend changes.
- **Shared packages** — types/enums (like blood types) live in one place so frontend and backend never drift out of sync.