-- ============================================================
-- UniLend — Supabase SQL Schema
-- Paste this entire file into: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- ============================================================
-- 1. USERS TABLE
-- Extends Supabase Auth (auth.users). Stores role per user.
-- ============================================================
create table if not exists public.users (
    id uuid primary key references auth.users (id) on delete cascade,
    email text not null,
    role text not null check (role in ('student', 'admin')) default 'student'
);

-- Auto-populate users row when a new Auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, role)
  values (new.id, new.email, 'student');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. EQUIPMENT TABLE
-- ============================================================
create table if not exists public.equipment (
    id uuid primary key default gen_random_uuid (),
    name text not null,
    icon text not null default 'bi-box',
    description text,
    total_stock integer not null default 0 check (total_stock >= 0),
    available integer not null default 0 check (available >= 0)
);

-- Seed equipment rows
insert into
    public.equipment (
        name,
        icon,
        description,
        total_stock,
        available
    )
values (
        'Sony Projector',
        'bi-projector',
        'Full HD portable projector, ideal for presentations and movie screenings.',
        5,
        5
    ),
    (
        'HDMI Cable',
        'bi-usb-plug',
        '2-meter high-speed HDMI cable for connecting laptops to displays.',
        20,
        20
    ),
    (
        'PA System',
        'bi-speaker',
        'Portable public address system with wireless microphone.',
        3,
        3
    ),
    (
        'Extension Cord',
        'bi-plug',
        'Heavy-duty 10-meter extension cord with surge protection, ideal for event setups.',
        15,
        15
    ),
    (
        'Wireless Microphone',
        'bi-mic',
        'Rechargeable handheld wireless microphone with receiver, great for speeches and performances.',
        8,
        8
    ),
    (
        'Projector Screen',
        'bi-easel',
        'Portable 100-inch tripod projector screen for presentations and film screenings.',
        4,
        4
    )
on conflict do nothing;

-- ============================================================
-- 3. RESERVATIONS TABLE
-- ============================================================
create table if not exists public.reservations (
    id uuid primary key default gen_random_uuid (),
    student_id uuid not null references auth.users (id) on delete cascade,
    student_email text not null,
    equipment_id uuid not null references public.equipment (id) on delete cascade,
    reservation_date date not null,
    status text not null check (
        status in (
            'pending',
            'approved',
            'denied'
        )
    ) default 'pending',
    created_at timestamptz not null default now ()
);

-- Index for fast per-student and per-status queries
create index if not exists reservations_student_id_idx on public.reservations (student_id);

create index if not exists reservations_status_idx on public.reservations (status);

-- ============================================================
-- 4. ATOMIC DECREMENT FUNCTION
-- Called by admin approve action. Prevents race conditions.
-- ============================================================
create or replace function public.decrement_available(equipment_id uuid)
returns void as $$
begin
  update public.equipment
  set available = available - 1
  where id = equipment_id and available > 0;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table public.users enable row level security;

alter table public.equipment enable row level security;

alter table public.reservations enable row level security;

-- Helper: check if current user is admin
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- ---- users policies ----
create policy "Users can read their own profile" on public.users for
select using (
        id = auth.uid ()
        or public.is_admin ()
    );

create policy "Only admins can update roles" on public.users for
update using (public.is_admin ());

-- ---- equipment policies ----
create policy "Any signed-in user can read equipment" on public.equipment for
select using (
        auth.role () = 'authenticated'
    );

create policy "Only admins can modify equipment" on public.equipment for all using (public.is_admin ());

-- ---- reservations policies ----
create policy "Students see only their own reservations" on public.reservations for
select using (
        student_id = auth.uid ()
        or public.is_admin ()
    );

create policy "Students can create their own reservations" on public.reservations for insert
with
    check (student_id = auth.uid ());

create policy "Only admins can update reservation status" on public.reservations for
update using (public.is_admin ());

-- ============================================================
-- 6. REALTIME
-- Enable Postgres replication for real-time subscriptions
-- ============================================================
alter publication supabase_realtime add table public.equipment;

alter publication supabase_realtime add table public.reservations;

-- ============================================================
-- DONE.
-- Next steps:
--   1. Go to Authentication → Users → Add user (set email + password)
--   2. To make someone an admin, run:
--      UPDATE public.users SET role = 'admin' WHERE email = 'admin@yourdomain.com';
-- ============================================================