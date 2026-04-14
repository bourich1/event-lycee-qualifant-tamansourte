-- ================================================================
-- EVENT REGISTRATION SYSTEM — Supabase SQL Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ================================================================

-- 1. Schools table
create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp default now()
);

-- 2. Attendees table
create table attendees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text unique not null,
  school_id uuid references schools(id),
  qr_code text unique not null,
  checked_in boolean default false,
  checked_in_at timestamp,
  created_at timestamp default now()
);

-- 3. Admins table (optional reference table)
create table admins (
  id uuid primary key default gen_random_uuid(),
  email text unique not null
);

-- ================================================================
-- Row Level Security (RLS)
-- ================================================================

alter table schools enable row level security;
alter table attendees enable row level security;
alter table admins enable row level security;

-- Schools: anyone can read
create policy "Public can read schools"
  on schools for select
  using (true);

-- Attendees: anyone can register
create policy "Public can insert attendees"
  on attendees for insert
  with check (true);

-- Attendees: only authenticated users (admins) can read
create policy "Admins can read attendees"
  on attendees for select
  using (auth.role() = 'authenticated');

-- Attendees: only authenticated users (admins) can update
create policy "Admins can update attendees"
  on attendees for update
  using (auth.role() = 'authenticated');

-- ================================================================
-- Enable Realtime on attendees table
-- ================================================================
-- Go to Supabase Dashboard > Database > Replication
-- and enable replication for the 'attendees' table
-- OR run:
-- alter publication supabase_realtime add table attendees;

-- ================================================================
-- Sample data — schools (optional, for testing)
-- ================================================================
insert into schools (name) values
  ('Lycée Qualifiant Tamansourte'),
  ('Lycée Qualifiant Al Massira'),
  ('Lycée Qualifiant Ibn Rochd'),
  ('Lycée Qualifiant Hassan II'),
  ('Lycée Qualifiant Mohammed VI');
