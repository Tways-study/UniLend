# UniLend — University Equipment Reservation System

UniLend is a web-based equipment management system built for a university setting. It allows students to browse and reserve equipment for classes or events, and gives administrators full control over inventory, approvals, and overdue tracking — all in real time.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [File Structure](#file-structure)
4. [How the Codebase Works](#how-the-codebase-works)
5. [Database Schema](#database-schema)
6. [Setup Guide](#setup-guide)
7. [Changelog](#changelog)
8. [License](#license)

---

## Features

| Feature            | Details                                                                   |
| ------------------ | ------------------------------------------------------------------------- |
| Student Dashboard  | Browse equipment, reserve with date and time, track request status        |
| Admin Dashboard    | Approve/deny requests, track overdue items, restock inventory, live stats |
| Role-Based Auth    | Separate login flows for students and admins via Supabase Auth            |
| Email Verification | New accounts must verify email before logging in                          |
| Password Reset     | Reset password via emailed link, update from within the app               |
| Time Selection     | Students pick a pickup time and return time when reserving                |
| Overdue Detection  | Flags approved reservations past their return datetime                    |
| Real-Time Updates  | Dashboards sync live using Supabase Realtime channels                     |
| Responsive UI      | Works on desktop and mobile via Bootstrap 5                               |

---

## Tech Stack

### Frontend

| Technology              | Version | Purpose                                                 |
| ----------------------- | ------- | ------------------------------------------------------- |
| HTML5                   | —       | Page structure                                          |
| CSS3                    | —       | Custom styling (inline `<style>` blocks, CSS variables) |
| JavaScript (ES Modules) | ES2020+ | All application logic in `app.js`                       |
| Bootstrap               | 5.3.3   | Responsive layout, modals, toasts, tables, forms        |
| Bootstrap Icons         | 1.11.3  | Icon set used throughout the UI                         |
| Google Fonts (Inter)    | —       | Primary typeface                                        |

All frontend dependencies are loaded from CDN — **no npm install or build step required**.

### Backend (Supabase)

| Service                        | Purpose                                                          |
| ------------------------------ | ---------------------------------------------------------------- |
| Supabase Auth                  | User registration, login, email verification, password reset     |
| Supabase Database (PostgreSQL) | Stores users, equipment, and reservations                        |
| Row Level Security (RLS)       | Enforces per-row access rules (students see only their own data) |
| Supabase Realtime              | Pushes live DB change events to connected browsers               |
| Supabase RPC Functions         | Atomic DB operations (`decrement_available`, `return_equipment`) |

---

## File Structure

```
UniLend/
│
├── index.html          # Login, register, forgot password, reset password
├── student.html        # Student dashboard UI
├── admin.html          # Admin dashboard UI
│
├── index.css           # Styles for login/student/admin pages (shared)
├── admin.css           # Admin-specific overrides and layout styles
├── student.css         # Student dashboard specific styles
│
├── app.js              # All JavaScript logic for every page
├── supabase-config.js  # Supabase client initialisation (URL + anon key)
│
├── schema.sql          # Full PostgreSQL schema + seed data + migrations
│
├── assets/
│   └── usa-logo.png    # University logo used in navbar and login card
│
├── package.json        # Project metadata (no runtime dependencies)
└── README.md           # This file
```

---

## How the Codebase Works

### Entry Point & Page Detection — `app.js`

`app.js` is a single ES module that handles **all three pages**. At the top it detects which page is currently loaded by inspecting `window.location.pathname`:

```js
const currentPage = (() => {
  const path = window.location.pathname;
  if (path.includes("student.html")) return "student";
  if (path.includes("admin.html")) return "admin";
  return "login";
})();
```

The rest of the file is divided into three `if (currentPage === "...")` blocks — one for login, one for the student dashboard, and one for the admin dashboard. Only the relevant block runs on any given page.

---

### Supabase Client — `supabase-config.js`

Exports a single `supabase` client instance, imported at the top of `app.js`:

```js
import { supabase } from "./supabase-config.js";
```

All database queries, auth calls, and realtime subscriptions flow through this one client. The file reads your project URL and anon key — the only values you need to change when deploying to a new Supabase project.

---

### Login Page — `index.html` + `app.js` (login block)

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

### Student Dashboard — `student.html` + `app.js` (student block)

**Session guard:** If no active session is found on load, the user is immediately redirected to `index.html`.

**Equipment section:**

- `loadEquipment()` queries the `equipment` table, renders cards with availability bars
- Cards with `available > 0` show a blue "Reserve" button; others show a disabled "Unavailable" button
- Clicking Reserve opens `#reserveModal` — student picks a **date**, **pickup time**, and **return time**
- On confirm, `app.js` validates that return time is after pickup time, then inserts a row into `reservations` with `status: 'pending'`

**My Requests section:**

- `loadMyRequests()` queries `reservations` joined with `equipment` for the current user
- Overdue detection: an approved reservation is flagged overdue if its **return datetime** (`reservation_date + return_time`) is in the past
- Status badges: `pending` (yellow), `approved` (green), `denied` (red), `returned` (purple), `overdue` (red)

**Real-time:** Two Supabase channels (`equipment-changes`, `my-requests`) subscribe to Postgres changes and re-run `loadEquipment()` / `loadMyRequests()` automatically.

---

### Admin Dashboard — `admin.html` + `app.js` (admin block)

**Session + role guard:** Checks session exists and that `role === 'admin'` in `public.users`. Any non-admin is signed out and redirected.

**Stats row:** Live counts for Pending, Total Items, In Stock, Low/Out, and Overdue.

**Pending Requests table:**

- Shows student email, equipment name, reservation date + time range
- Approve → `UPDATE reservations SET status='approved'` + `decrement_available()` RPC (atomic, prevents race conditions)
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

The schema lives in `schema.sql`. Run the entire file in the Supabase SQL Editor to set up a fresh database.

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

| Function                                         | Purpose                                                                                |
| ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `decrement_available(equipment_id)`              | Atomically reduces `available` by 1 (prevents race conditions on concurrent approvals) |
| `return_equipment(reservation_id, equipment_id)` | Sets status to `returned` and increments `available`                                   |

### Row Level Security

- Students can only read and insert their own reservations
- Only admins can update reservation status or modify equipment
- `is_admin()` helper function used in all RLS policies

---

## Setup Guide

### Prerequisites

- A free [Supabase](https://supabase.com) account
- A code editor (VS Code recommended)
- A local web server (VS Code Live Server extension, or any static server)
  > **Why a server?** `app.js` uses ES Modules (`import`/`export`) which require HTTP — opening `index.html` directly as a `file://` URL will not work.

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
2. Copy the entire contents of `schema.sql` and paste it into the editor
3. Click **Run**

This creates all tables, RLS policies, triggers, RPC functions, seeds the equipment data, and enables Realtime for the required tables.

---

### Step 4 — Configure the Supabase client

1. In Supabase, go to **Project Settings → API**
2. Copy your **Project URL** and **anon public** key
3. Open `supabase-config.js` and replace the two values:

```js
const SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
const SUPABASE_ANON = "YOUR_ANON_KEY";
```

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

## License

This project is for educational purposes only.
