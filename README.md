<div align="center">
  <h1>UniLend</h1>
  <em>University Equipment Reservation System</em>

<br /><br />

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2020+-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3.3-7952B3?style=flat&logo=bootstrap&logoColor=white)](https://getbootstrap.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/License-Educational-lightgrey?style=flat)](./README.md#license)

</div>

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [File & Directory Structure](#file--directory-structure)
5. [Architecture & How the Code Works Together](#architecture--how-the-code-works-together)
6. [Database Schema](#database-schema)
7. [Getting Started](#getting-started)
8. [Changelog](#changelog)
9. [Contributing](#contributing)
10. [License](#license)

---

## Overview

UniLend is a zero-dependency, browser-only web application for managing university equipment loans. Students browse available gear and submit timed reservations; admins approve or deny requests, track overdue returns, and restock inventory — all with live updates delivered via Supabase Realtime. No build step, no local backend, and no package installs are required to run the project.

---

## Features

| Feature            | Details                                                                          |
| ------------------ | -------------------------------------------------------------------------------- |
| Student Dashboard  | Browse equipment, reserve with date and time, track request status               |
| Admin Dashboard    | Approve/deny requests, track overdue items, restock inventory, live stats        |
| Role-Based Auth    | Separate login flows for students and admins via Supabase Auth                   |
| Email Verification | New accounts must verify email before logging in                                 |
| Password Reset     | Reset password via emailed link, update from within the app                      |
| Time Selection     | Students pick a pickup time and return time when reserving                       |
| Overdue Detection  | Flags approved reservations past their full return datetime                      |
| Real-Time Updates  | Dashboards sync live using Supabase Realtime channels                            |
| Atomic Operations  | Approve, return, and restock all use server-side RPCs to prevent race conditions |
| Responsive UI      | Works on desktop and mobile via Bootstrap 5                                      |

---

## Tech Stack

### Frontend

| Technology              | Version | Purpose                                           |
| ----------------------- | ------- | ------------------------------------------------- |
| HTML5                   | —       | Page structure                                    |
| CSS3                    | —       | Custom styling per page (`css/` folder)           |
| JavaScript (ES Modules) | ES2020+ | All application logic in `js/app.js`              |
| Bootstrap               | 5.3.3   | Responsive layout, modals, toasts, tables, forms  |
| Bootstrap Icons         | 1.11.3  | Icon set used throughout the UI                   |
| Google Fonts (Sora, DM Sans) | — | Primary typefaces                                |

All frontend dependencies are loaded from CDN — **no npm install or build step required**.

### Backend (Supabase)

| Service                        | Purpose                                                          |
| ------------------------------ | ---------------------------------------------------------------- |
| Supabase Auth                  | User registration, login, email verification, password reset     |
| Supabase Database (PostgreSQL) | Stores users, equipment, and reservations                        |
| Row Level Security (RLS)       | Enforces per-row access rules (students see only their own data) |
| Supabase Realtime              | Pushes live DB change events to connected browsers               |
| Supabase RPC Functions         | Atomic DB operations (`approve_reservation`, `return_equipment`, `restock_equipment`) |

---

## File & Directory Structure

```
UniLend/
├── index.html              # Login, register, forgot password, reset password
├── student.html            # Student dashboard UI
├── admin.html              # Admin dashboard UI
├── favicon.svg             # Browser tab icon
├── package.json            # Project metadata (no runtime dependencies)
├── README.md               # This file
│
├── css/                    # Page-scoped stylesheets
│   ├── index.css           # Styles for the auth / login page
│   ├── student.css         # Student dashboard styles
│   └── admin.css           # Admin dashboard styles
│
├── js/                     # Client-side JavaScript
│   ├── app.js              # All page logic (login, student, admin) in one ES module
│   └── supabase-config.js  # Supabase client initialisation — credentials go here
│
├── db/                     # Database
│   └── schema.sql          # Full PostgreSQL schema, RPCs, RLS policies, seed data
│
└── assets/                 # Static assets
    └── usa-logo.png        # University of San Agustin logo (navbar + login card)
```

**Key design decisions:**

- **`css/`, `js/`, `db/` subdirectories** — stylesheets, scripts, and the database schema each live in a dedicated folder, keeping the project root clean and navigable.
- **Single JS file** — `js/app.js` detects the current page at runtime and executes only the relevant block, avoiding any bundler or module routing complexity.
- **CDN-only dependencies** — Bootstrap, Bootstrap Icons, Google Fonts, and the Supabase JS client are all loaded from CDN. There is nothing to install or build locally.
- **One SQL file** — `db/schema.sql` contains everything needed to recreate the database from scratch, plus idempotent migration blocks for upgrading an existing deployment.
- **No `.env` file** — Supabase credentials are stored directly in `js/supabase-config.js`. See the [Getting Started](#getting-started) section for how to handle this safely.

---

## Architecture & How the Code Works Together

The architecture follows a **serverless, client-rendered** pattern. The browser loads static HTML/CSS/JS files from any web server; all data access, auth, and real-time events are handled directly against Supabase over HTTPS and WebSockets — there is no custom backend server.

```mermaid
graph TD
    Browser["Browser (HTML / CSS / JS)"]
    AppJS["js/app.js — Page Controller"]
    SupaClient["js/supabase-config.js — Supabase Client"]
    Auth["Supabase Auth\n(register / login / reset)"]
    DB["Supabase Database\n(PostgreSQL + RLS)"]
    RPCs["RPC Functions\n(approve / return / restock)"]
    RT["Supabase Realtime\n(live DB events)"]

    Browser --> AppJS
    AppJS --> SupaClient
    SupaClient --> Auth
    SupaClient --> DB
    SupaClient --> RPCs
    SupaClient --> RT
    RT -->|"equipment & reservations changes"| AppJS
```

### Entry Point & Page Detection — `js/app.js`

`js/app.js` is a single ES module that handles **all three pages**. At the top it detects which page is currently loaded by inspecting `window.location.pathname`:

```js
const currentPage = (() => {
  const path = window.location.pathname;
  if (path.includes("student.html")) return "student";
  if (path.includes("admin.html"))   return "admin";
  return "login";
})();
```

The rest of the file is divided into three `if (currentPage === "...")` blocks — one for login, one for the student dashboard, and one for the admin dashboard. Only the relevant block runs on any given page.

---

### Supabase Client — `js/supabase-config.js`

Exports a single `supabase` client instance, imported at the top of `app.js`:

```js
import { supabase } from "./supabase-config.js";
```

All database queries, auth calls, and realtime subscriptions flow through this one client. The file reads your project URL and anon key — the only values you need to change when deploying to a new Supabase project.

---

### Login Page — `index.html` + `js/app.js` (login block)

The login page contains five views that toggle visibility with `d-none`. Only one is shown at a time:

| View                 | Element             | Shown when                           |
| -------------------- | ------------------- | ------------------------------------ |
| Login form           | `#loginForm`        | Default on page load                 |
| Register form        | `#registerForm`     | User clicks "Sign up"                |
| Forgot password form | `#forgotForm`       | User clicks "Forgot password?"       |
| Reset password form  | `#resetForm`        | User arrives via email reset link    |
| Verification modal   | `#verifyEmailModal` | After registering (email confirm on) |
| Reset-sent modal     | `#resetSentModal`   | After requesting a reset link        |

**Auth flow:**

- `supabase.auth.signUp()` → if `session === null`, Supabase requires email confirmation → modal shown
- `supabase.auth.signInWithPassword()` → if error is `"Email not confirmed"`, a clear message is shown and sign-out is called
- `supabase.auth.resetPasswordForEmail()` → sends reset link with `redirectTo` set to `index.html`
- `supabase.auth.onAuthStateChange("PASSWORD_RECOVERY")` → detected on page load after clicking the reset link → shows the reset form
- `supabase.auth.updateUser({ password })` → saves the new password, then signs out and returns to login

After a successful login, `app.js` reads the user's `role` from the `public.users` table and redirects to either `student.html` or `admin.html`.

---

### Student Dashboard — `student.html` + `js/app.js` (student block)

**Session guard:** If no active session is found on load, the user is immediately redirected to `index.html`.

**Equipment section:**

- `loadEquipment()` queries the `equipment` table, renders cards with availability bars
- Cards with `available > 0` show a "Reserve" button; others show a disabled "Unavailable" button
- Clicking Reserve opens `#reserveModal` — student picks a **date**, **pickup time**, and **return time**
- On confirm, `app.js` validates that return time is after pickup time, then inserts a row into `reservations` with `status: 'pending'`

**My Requests section:**

- `loadMyRequests()` queries `reservations` joined with `equipment` for the current user
- Overdue detection: an approved reservation is flagged overdue if its **return datetime** (`reservation_date + return_time`) is in the past
- Status badges: `pending` (yellow), `approved` (green), `denied` (red), `returned` (purple), `overdue` (red)

**Real-time:** Two Supabase channels (`equipment-changes`, `my-requests`) subscribe to Postgres changes and re-run `loadEquipment()` / `loadMyRequests()` automatically.

---

### Admin Dashboard — `admin.html` + `js/app.js` (admin block)

**Session + role guard:** Checks session exists and that `role === 'admin'` in `public.users`. Any non-admin is signed out and redirected.

**Stats row:** Live counts for Pending, Total Items, In Stock, Low/Out, and Overdue.

**Pending Requests table:**

- Shows student email, equipment name, reservation date + time range
- Approve → `approve_reservation()` RPC (atomic, prevents race conditions)
- Deny → `UPDATE reservations SET status='denied'`

**Overdue Reservations table:**

- Queries approved reservations with `reservation_date ≤ today`, then client-filters for items whose `return_time` has passed
- "Mark Returned" → `return_equipment()` RPC (sets status to `returned` + restores stock)

**Inventory table:**

- Shows all equipment with total/available counts and an In Stock / Low Stock / Out of Stock badge
- "Restock" opens `#restockModal` — admin enters units to add, live preview shows new totals

**Real-time:** Two channels (`admin-equipment`, `admin-reservations`) keep all sections in sync.

---

## Database Schema

The schema lives in `db/schema.sql`. Run the entire file in the Supabase SQL Editor to set up a fresh database.

### Tables

#### `public.users`

Mirrors `auth.users`. Auto-populated by a trigger when any new Supabase Auth user is created.

| Column  | Type | Notes                              |
| ------- | ---- | ---------------------------------- |
| `id`    | UUID | FK → `auth.users.id`               |
| `email` | text |                                    |
| `role`  | text | `'student'` (default) or `'admin'` |

#### `public.equipment`

| Column        | Type    | Notes                                          |
| ------------- | ------- | ---------------------------------------------- |
| `id`          | UUID    | Primary key                                    |
| `name`        | text    |                                                |
| `icon`        | text    | Bootstrap Icons class (e.g. `bi-projector`)    |
| `description` | text    |                                                |
| `total_stock` | integer |                                                |
| `available`   | integer | Decremented on approval, incremented on return |

#### `public.reservations`

| Column             | Type        | Notes                                        |
| ------------------ | ----------- | -------------------------------------------- |
| `id`               | UUID        | Primary key                                  |
| `student_id`       | UUID        | FK → `auth.users.id`                         |
| `student_email`    | text        | Denormalised for fast admin display          |
| `equipment_id`     | UUID        | FK → `equipment.id`                          |
| `reservation_date` | date        |                                              |
| `pickup_time`      | time        | Default `08:00`                              |
| `return_time`      | time        | Default `17:00`                              |
| `status`           | text        | `pending` → `approved`/`denied` → `returned` |
| `created_at`       | timestamptz | Auto-set                                     |

### RPC Functions

| Function                                            | Purpose                                                                                        |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `approve_reservation(reservation_id, equipment_id)` | Atomically sets status to `approved` and decrements `available` in one transaction             |
| `return_equipment(reservation_id, equipment_id)`    | Sets status to `returned` and increments `available`; validates equipment_id match             |
| `restock_equipment(eq_id, amount)`                  | Increments both `total_stock` and `available` relatively to avoid TOCTOU race conditions       |
| `decrement_available(equipment_id)`                 | Legacy: atomically reduces `available` by 1 (superseded by `approve_reservation` for new code) |

### Row Level Security

- Students can only read and insert their own reservations
- Only admins can update reservation status or modify equipment
- `is_admin()` helper function used in all RLS policies

---

## Getting Started

### Prerequisites

- A free [Supabase](https://supabase.com) account
- A code editor (**VS Code** recommended)
- A local web server — VS Code [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension, Python, or Node.js `npx serve`
  > **Why a server?** `js/app.js` uses ES Modules (`import`/`export`) which require an HTTP origin. Opening `index.html` as a `file://` URL will not work.

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/Tways-study/UniLend.git
cd UniLend
```

---

### Step 2 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a name, set a strong database password, and pick a region close to your users
3. Wait for the project to finish provisioning (~1 minute)

---

### Step 3 — Run the database schema

1. In your Supabase project, go to **SQL Editor → New Query**
2. Copy the entire contents of `db/schema.sql` and paste it into the editor
3. Click **Run**

This creates all tables, RLS policies, triggers, RPC functions, seeds the equipment data, and enables Realtime for the required tables.

---

### Step 4 — Configure the Supabase client

#### 🔑 Credentials

This project does not use a `.env` file. Supabase credentials are set directly in `js/supabase-config.js`. **Never commit real secrets to a public repository.** Replace the placeholder values with your own project credentials:

1. In Supabase, go to **Project Settings → API**
2. Copy your **Project URL** and **anon public** key
3. Open `js/supabase-config.js` and replace the two values:

```js
const SUPABASE_URL  = "your_supabase_project_url_here";
const SUPABASE_ANON = "your_supabase_anon_key_here";
```

| Variable        | Description                           | Required | Where to Obtain                             |
| --------------- | ------------------------------------- | -------- | ------------------------------------------- |
| `SUPABASE_URL`  | Your Supabase project's REST endpoint | Yes      | Supabase Dashboard → Project Settings → API |
| `SUPABASE_ANON` | Public anon key (safe for browsers)   | Yes      | Supabase Dashboard → Project Settings → API |

> The anon key is safe to expose in browser code because Row Level Security policies enforce all access rules at the database level.

---

### Step 5 — Enable Email Confirmation (Auth)

1. In Supabase, go to **Authentication → Settings → Email**
2. Turn on **Confirm email**
3. Go to **Authentication → URL Configuration**
4. Add your site URL to **Redirect URLs**, e.g.:
   - `http://localhost:5500/index.html` (local dev with Live Server)
   - `https://your-app.vercel.app/index.html` (production)

> This is required for both email verification on registration and the password reset link to redirect correctly.

---

### Step 6 — Create an admin account

After running the schema, you need to manually promote one user to admin.

1. Start the app and **register** with an email you want to be the admin
2. Verify that email (click the link in your inbox)
3. In Supabase, go to **SQL Editor** and run:

```sql
UPDATE public.users
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';
```

---

### Step 7 — Run the app

**Option A — VS Code Live Server**

- Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension
- Right-click `index.html` → **Open with Live Server**
- Opens at `http://localhost:5500/index.html`

**Option B — Python**

```bash
python -m http.server 5500
# then open http://localhost:5500/index.html
```

**Option C — Node.js (npx)**

```bash
npx serve .
# then open the URL shown in the terminal
```

---

## Changelog

### April 2026 — Project Restructure

#### File & Folder Organisation

- Moved all stylesheet files (`index.css`, `student.css`, `admin.css`) into a dedicated `css/` directory
- Moved all JavaScript files (`app.js`, `supabase-config.js`) into a dedicated `js/` directory
- Moved the database schema (`schema.sql`) into a dedicated `db/` directory
- Moved the root-level `USA Logo.png` into `assets/` alongside `usa-logo.png`
- Updated all `<link href="...">` and `<script src="...">` references across `index.html`, `student.html`, and `admin.html` to reflect the new paths
- The `import { supabase } from "./supabase-config.js"` relative import in `app.js` remains correct as both files are co-located in `js/`

### April 2026 — Feature Update

#### Reservation Time Selection

- Students now select a **Pickup Time** and a **Return Time** (in addition to a date) when reserving equipment
- Times are bounded to operating hours (`07:00`–`21:00`); return time must be strictly after pickup time
- Time ranges are displayed in the student's "My Requests" table and on admin Pending/Overdue cards
- Database: two new columns added to `reservations` — `pickup_time TIME` and `return_time TIME`
- Overdue logic updated: a reservation is only overdue once the full return **datetime** has passed (not just the date)

#### Secure Authentication — Email Verification

- New student accounts now require **email verification** before they can log in
- After registering, a styled modal popup appears confirming the verification email was sent (cannot be dismissed accidentally)
- Attempting to log in with an unverified account shows a clear error message
- Requires "Confirm email" to be enabled in Supabase Auth settings (see Setup Guide)

#### Forgot / Reset Password

- "Forgot password?" link added below the password field on the login form
- Submitting the forgot form sends a reset link via Supabase (`resetPasswordForEmail`)
- A modal confirms the link was sent (uses the same anti-enumeration design — always shows success)
- Clicking the reset link in email redirects back to `index.html`, which automatically detects the `PASSWORD_RECOVERY` event and shows a "Set new password" form
- New password requires minimum 8 characters with confirmation
- After a successful reset, the user is signed out and returned to the login form

#### Security Hardening

- Password minimum raised from 6 to 8 characters on registration
- Login handler explicitly catches and handles `"Email not confirmed"` errors
- `PASSWORD_RECOVERY` listener registered before `getSession()` to prevent auto-redirect race condition during password reset flow

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "feat: describe your change"`
4. Push the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request against `main` and describe what you changed and why

**Branch naming conventions:**

- `feature/` — new functionality
- `fix/` — bug fixes
- `docs/` — documentation-only changes
- `chore/` — schema migrations, dependency updates, config changes

---

## License

This project is for educational purposes only.

