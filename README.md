# UniLend

UniLend is a simple Equipment Management System built as a course requirement. It allows students and admins to manage, borrow, and track equipment efficiently.

## Features

- **Student and Admin Dashboards:** Separate interfaces for students and admins.
- **Authentication:** User login and registration powered by Supabase.
- **Equipment Management:** Admins can add, update, and manage equipment inventory.
- **Borrowing System:** Students can request and return equipment.
- **Responsive UI:** Built with Bootstrap 5 and modern design.

## Tech Stack

- **Frontend:** HTML, CSS, Bootstrap, JavaScript
- **Backend:** Supabase (PostgreSQL, Auth)
- **Icons:** Bootstrap Icons

## Project Structure

- `index.html` — Login and registration page
- `student.html` — Student dashboard
- `admin.html` — Admin dashboard
- `app.js` — Main application logic
- `supabase-config.js` — Supabase client configuration
- `schema.sql` — Database schema for Supabase
- `assets/` — Static assets (e.g., logos)

## Setup

1. **Clone the repository**
2. **Configure Supabase**
	- Update `supabase-config.js` with your Supabase project URL and anon key.
	- Run the SQL in `schema.sql` in your Supabase SQL editor to set up tables.
3. **Open `index.html` in your browser** to start using the app.

## License

This project is for educational purposes.
