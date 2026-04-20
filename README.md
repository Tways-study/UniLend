<h1 align="center">🎓 UniLend</h1>

<p align="center">
  <em>University Equipment Reservation System</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-green?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/status-active-success?style=flat-square" alt="Status">
  <img src="https://img.shields.io/badge/license-Educational-lightgrey?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Bootstrap-7952B3?style=flat-square&logo=bootstrap&logoColor=white" alt="Bootstrap">
</p>

<p align="center">
  A zero-dependency, browser-only web application for managing university equipment loans. Students browse available gear and submit timed reservations; admins approve or deny requests, track overdue returns, and restock inventory — all with live updates delivered via Supabase Realtime.
</p>


---

## Table of Contents

1. [✨ Features](#-features)
2. [🛠️ Tech Stack](#️-tech-stack)
3. [🏗️ Architecture](#️-architecture)
4. [🧩 OOP Design](#-oop-design)
5. [📁 File Structure](#-file-structure)
6. [🗄️ Database Schema](#️-database-schema)
7. [⚙️ Getting Started](#️-getting-started)
8. [🔐 Environment Variables](#-environment-variables)
9. [▶️ Running the Project](#️-running-the-project)
10. [📄 License](#-license)


---

## ✨ Features

| Feature | Details |
|---|---|
| Student Dashboard | Browse equipment, reserve with date and time, track request status |
| Admin Dashboard | Approve/deny requests, track overdue items, restock inventory, live stats |
| Role-Based Auth | Separate login flows for students and admins via Supabase Auth |
| Email Verification | New accounts must verify email before logging in |
| Password Reset | Reset password via emailed link, update from within the app |
| Time Selection | Students pick a pickup time and return time when reserving |
| Overdue Detection | Flags approved reservations past their full return datetime |
| Real-Time Updates | Dashboards sync live using Supabase Realtime channels |
| Atomic Operations | Approve, return, and restock all use server-side RPCs to prevent race conditions |
| Responsive UI | Works on desktop and mobile via Bootstrap 5 |
| XSS Protection | All DB-sourced strings are sanitised via `escapeHTML()` before DOM insertion |

---

## 🛠️ Tech Stack

<p>
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Bootstrap-7952B3?style=flat-square&logo=bootstrap&logoColor=white" alt="Bootstrap">
</p>

| Category | Technology | Purpose |
|---|---|---|
| Language | JavaScript (ES Modules, ES2020+) | All application logic |
| Markup | HTML5 | Page structure |
| Styling | CSS3 + Bootstrap 5.3.3 | Custom styles + responsive layout |
| Icons | Bootstrap Icons 1.11.3 | Icon set throughout the UI |
| Fonts | Google Fonts (Sora, DM Sans) | Typography |
| Backend | Supabase Auth | Registration, login, email verify, password reset |
| Database | Supabase (PostgreSQL) | Equipment, users, and reservations |
| Access Control | Row Level Security (RLS) | Per-row access policies enforced at DB level |
| Real-Time | Supabase Realtime | Live DB change events pushed to browser |
| RPC | Supabase RPC Functions | Atomic approve / return / restock operations |

> All frontend dependencies are loaded from CDN — **no `npm install` or build step required**.

---

## 🏗️ Architecture

UniLend follows a **serverless, client-rendered** pattern. The browser loads static HTML/CSS/JS from any web server; all data access, auth, and real-time events flow directly to Supabase over HTTPS and WebSockets — no custom backend server.

```
Browser (HTML / CSS / JS)
    │
    └── js/app.js  ──►  js/supabase-config.js  ──►  Supabase Auth
                                                 ──►  Supabase DB (PostgreSQL + RLS)
                                                 ──►  Supabase RPC (approve / return / restock)
                                                 ──►  Supabase Realtime (live DB events)
                                                          │
                                                          └──► js/app.js (re-renders UI)
```

### Page Detection

`js/app.js` is a single ES module that serves all three pages. At the top it detects the current page from `window.location.pathname` and only runs the relevant block:

```js
const currentPage = (() => {
  const path = window.location.pathname;
  if (path.includes("student.html")) return "student";
  if (path.includes("admin.html"))   return "admin";
  return "login";
})();
```

### Data Flow per Role

**Student:** `SessionCheck` → `StudentDashboard.load()` → `#loadEquipment()` + `#loadMyRequests()` → Realtime subscriptions keep both in sync.

**Admin:** `SessionCheck` → `RoleCheck (public.users)` → `AdminDashboard.load()` → `#loadInventory()` + `#loadPendingRequests()` + `#loadOverdueReservations()` → Realtime subscriptions keep all three in sync.

---

## 🧩 OOP Design

`js/app.js` was architected using ES6 classes with all four core OOP principles. See [OOP_Principles_UniLend.md](./OOP_Principles_UniLend.md) for full code examples and explanations.

### Class Hierarchy

```
Dashboard  (abstract base class)
├── constructor(supabaseClient, user)   ← shared: this.db, this.user
├── load()                             ← throws if not overridden
└── _setupLogout(channels)             ← shared logout logic
     │
     ├── StudentDashboard extends Dashboard
     │     overrides load() → greeting, equipment cards, my requests,
     │                         search/filter, reserve form, realtime
     │
     └── AdminDashboard extends Dashboard
           overrides load() → inventory, pending requests, overdue list,
                               restock form, realtime
```

### Principles at a Glance

| Principle | Where Applied | How |
|---|---|---|
| **Abstraction** | `SkeletonLoader`, `Toast`, `Dashboard` | Static methods hide HTML/DOM details; `Dashboard.load()` defines a shared interface without exposing implementation |
| **Encapsulation** | `PasswordStrengthMeter`, `StudentDashboard`, `AdminDashboard` | Private fields (`#config`, `#allEquipment`, channels) and private methods (`#evaluate`, `#loadEquipment`, `#showConfirmModal`) hide internals |
| **Inheritance** | `StudentDashboard extends Dashboard`, `AdminDashboard extends Dashboard` | Both subclasses inherit `this.db`, `this.user`, and `_setupLogout()` without duplicating code |
| **Polymorphism** | `load()` override, `Toast.show(type)`, status badge rendering | Same call site produces role-specific behaviour at runtime; same `Toast.show()` call produces visually distinct output per `type` |

### Page Boot (2 lines per role)

```js
// Student page
const dashboard = new StudentDashboard(supabase, session.user);
await dashboard.load();

// Admin page
const dashboard = new AdminDashboard(supabase, session.user);
await dashboard.load();
```

---

## 📁 File Structure

```
UniLend/
├── index.html                  # Login, register, forgot/reset password
├── student.html                # Student dashboard UI
├── admin.html                  # Admin dashboard UI
├── favicon.svg                 # Browser tab icon
├── package.json                # Project metadata (no runtime dependencies)
├── README.md                   # This file
├── OOP_Principles_UniLend.md   # OOP documentation with code examples
│
├── css/                        # Page-scoped stylesheets
│   ├── index.css               # Auth / login page styles
│   ├── student.css             # Student dashboard styles
│   └── admin.css               # Admin dashboard styles
│
├── js/                         # Client-side JavaScript (ES Modules)
│   ├── app.js                  # All page logic — 6 OOP classes + 3 page blocks
│   └── supabase-config.js      # Supabase client initialisation
│
├── db/                         # Database
│   └── schema.sql              # Tables, RLS, triggers, RPCs, seed data
│
└── assets/                     # Static assets
    └── usa-logo.png            # University logo (navbar + login card)
```

**Key design decisions:**

- **Single JS file** — `app.js` detects the current page at runtime; no bundler or router needed.
- **CDN-only dependencies** — Bootstrap, Bootstrap Icons, Google Fonts, and the Supabase JS client are all loaded from CDN. Nothing to install or build.
- **One SQL file** — `db/schema.sql` recreates the entire database from scratch, including seed data and RLS policies.
- **ES6 classes** — All logic is encapsulated in six classes (`SkeletonLoader`, `Toast`, `PasswordStrengthMeter`, `Dashboard`, `StudentDashboard`, `AdminDashboard`).

---

## 🗄️ Database Schema

Run the entire `db/schema.sql` file in the Supabase SQL Editor to create all tables, policies, triggers, RPCs, and seed data.

### Tables

#### `public.users`
Auto-populated by a trigger when any new Supabase Auth user is created.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | FK → `auth.users.id` |
| `email` | text | |
| `role` | text | `'student'` (default) or `'admin'` |

#### `public.equipment`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | text | |
| `icon` | text | Bootstrap Icons class (e.g. `bi-projector`) |
| `description` | text | |
| `total_stock` | integer | |
| `available` | integer | Decremented on approval, incremented on return |

#### `public.reservations`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `student_id` | UUID | FK → `auth.users.id` |
| `student_email` | text | Denormalised for fast admin display |
| `equipment_id` | UUID | FK → `equipment.id` |
| `reservation_date` | date | |
| `pickup_time` | time | |
| `return_time` | time | |
| `quantity` | integer | |
| `status` | text | `pending` → `approved`/`denied` → `returned` |
| `created_at` | timestamptz | Auto-set |

### RPC Functions

| Function | Purpose |
|---|---|
| `approve_reservation(reservation_id, equipment_id)` | Atomically sets status to `approved` and decrements `available` |
| `return_equipment(reservation_id, equipment_id)` | Sets status to `returned` and increments `available` |
| `restock_equipment(eq_id, amount)` | Increments both `total_stock` and `available` |
| `is_admin()` | Helper used in all RLS policies |

### Row Level Security

- Students can only read and insert their **own** reservations
- Only admins can update reservation status or modify equipment
- All RPC functions validate `is_admin()` and raise exceptions on permission failure

---

## ⚙️ Getting Started

### Prerequisites

- A free [Supabase](https://supabase.com) account
- A code editor (VS Code recommended)
- A local web server — [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension, Python, or `npx serve`

> **Why a server?** `app.js` uses ES Modules (`import`/`export`) which require an HTTP origin. Opening `index.html` as a `file://` URL will not work.

### Step 1 — Clone the repository

```bash
git clone https://github.com/your-username/UniLend.git
cd UniLend
```

### Step 2 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Set a name, strong database password, and pick a region
3. Wait for provisioning (~1 minute)

### Step 3 — Run the database schema

1. In your Supabase project → **SQL Editor → New Query**
2. Copy the entire contents of `db/schema.sql` and paste into the editor
3. Click **Run**

### Step 4 — Configure the Supabase client

Open `js/supabase-config.js` and replace the placeholder values:

```js
const SUPABASE_URL  = "your_supabase_project_url_here";
const SUPABASE_ANON = "your_supabase_anon_key_here";
```

### Step 5 — Enable Email Confirmation

In Supabase → **Authentication → Settings → Email** → turn on **Confirm email**.

Then go to **Authentication → URL Configuration** and add your redirect URL:
- Local: `http://localhost:5500/index.html`
- Production: `https://your-app.vercel.app/index.html`

### Step 6 — Create an admin account

1. Register in the app with your admin email, then verify it
2. Run in Supabase SQL Editor:

```sql
UPDATE public.users
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';
```

---

## 🔐 Environment Variables

This project stores credentials directly in `js/supabase-config.js`. The anon key is safe to expose in browser code because all access rules are enforced by Row Level Security at the database level.

| Variable | Description | Where to Obtain |
|---|---|---|
| `SUPABASE_URL` | Your Supabase project's REST endpoint | Supabase Dashboard → Project Settings → API |
| `SUPABASE_ANON` | Public anon key (safe for browsers) | Supabase Dashboard → Project Settings → API |

> **Never commit real secrets to a public repository.** If you fork this project publicly, use environment injection via your hosting platform (e.g. Vercel Environment Variables) instead of hardcoding credentials.

---

## ▶️ Running the Project

**Option A — VS Code Live Server**

```bash
# Install the Live Server extension, then:
# Right-click index.html → Open with Live Server
# Opens at http://localhost:5500/index.html
```

**Option B — Python**

```bash
python -m http.server 5500
# Open http://localhost:5500/index.html
```

**Option C — Node.js**

```bash
npx serve .
# Open the URL shown in the terminal
```

There is no build step. No `npm install` required.

---

## 📄 License

This project is for educational purposes only.

