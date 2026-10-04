-- Create registrations table to store client registrations
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  folio text unique not null,
  client_name text not null,
  person_count integer not null check (person_count > 0),
  amount_paid numeric(10, 2) not null check (amount_paid >= 0),
  created_at timestamptz default now() not null,
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  updated_at timestamptz default now() not null
);

-- Create qr_codes table to store individual QR codes (one per person)
create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  qr_hash text unique not null,
  person_number integer not null check (person_number > 0),
  is_used boolean default false not null,
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now() not null
);

-- Create audit_logs table for security tracking
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now() not null
);

-- Create indexes for better performance
create index if not exists idx_registrations_folio on public.registrations(folio);
create index if not exists idx_registrations_created_by on public.registrations(created_by);
create index if not exists idx_qr_codes_registration_id on public.qr_codes(registration_id);
create index if not exists idx_qr_codes_qr_hash on public.qr_codes(qr_hash);
create index if not exists idx_qr_codes_is_used on public.qr_codes(is_used);
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);

-- Enable Row Level Security
alter table public.registrations enable row level security;
alter table public.qr_codes enable row level security;
alter table public.audit_logs enable row level security;

-- RLS Policies for registrations
create policy "Allow authenticated users to view all registrations"
  on public.registrations for select
  using (auth.role() = 'authenticated');

create policy "Allow authenticated users to insert registrations"
  on public.registrations for insert
  with check (auth.role() = 'authenticated');

create policy "Allow authenticated users to update registrations"
  on public.registrations for update
  using (auth.role() = 'authenticated');

create policy "Allow authenticated users to delete registrations"
  on public.registrations for delete
  using (auth.role() = 'authenticated');

-- RLS Policies for qr_codes
create policy "Allow authenticated users to view all qr_codes"
  on public.qr_codes for select
  using (auth.role() = 'authenticated');

create policy "Allow authenticated users to insert qr_codes"
  on public.qr_codes for insert
  with check (auth.role() = 'authenticated');

create policy "Allow authenticated users to update qr_codes"
  on public.qr_codes for update
  using (auth.role() = 'authenticated');

-- RLS Policies for audit_logs
create policy "Allow authenticated users to view audit_logs"
  on public.audit_logs for select
  using (auth.role() = 'authenticated');

create policy "Allow authenticated users to insert audit_logs"
  on public.audit_logs for insert
  with check (auth.role() = 'authenticated');
