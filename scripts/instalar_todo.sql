-- =====================================================================
-- INSTALACIÓN COMPLETA EN SUPABASE (SQL Editor)
-- Copia TODO este archivo y ejecútalo una sola vez.
-- Es la unión de 001 + 002 + 003 en el orden correcto.
-- =====================================================================

-- 0) Extensión de criptografía (la usa generate_qr_hash con digest/sha256)
create extension if not exists pgcrypto with schema extensions;

-- =====================================================================
-- 1) scripts/001_create_tables.sql
-- =====================================================================

-- Create registrations table to store client registrations
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  folio text unique not null,
  client_name text not null,
  person_count integer not null check (person_count > 0),
  amount_paid numeric(10, 2) not null check (amount_paid >= 0),
  created_at timestamptz default now() not null,
  created_by uuid references auth.users(id) on delete set null,
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

-- =====================================================================
-- 2) scripts/002_create_functions.sql
-- =====================================================================

-- Function to generate unique folio numbers
create or replace function public.generate_folio()
returns text
language plpgsql
security definer
as $$
declare
  new_folio text;
  folio_exists boolean;
begin
  loop
    -- Generate a folio with format: HAL-YYYYMMDD-XXXX (HAL = Halloween)
    new_folio := 'HAL-' || to_char(now(), 'YYYYMMDD') || '-' ||
                 lpad(floor(random() * 10000)::text, 4, '0');

    -- Check if folio already exists
    select exists(select 1 from public.registrations where folio = new_folio) into folio_exists;

    -- Exit loop if folio is unique
    exit when not folio_exists;
  end loop;

  return new_folio;
end;
$$;

-- Function to generate QR hash
create or replace function public.generate_qr_hash(
  p_registration_id uuid,
  p_person_number integer
)
returns text
language plpgsql
security definer
as $$
declare
  hash_input text;
  qr_hash text;
begin
  -- Create a unique hash based on registration ID, person number, and timestamp
  hash_input := p_registration_id::text || '-' || p_person_number::text || '-' || extract(epoch from now())::text;

  -- Generate SHA256 hash
  qr_hash := encode(digest(hash_input, 'sha256'), 'hex');

  return qr_hash;
end;
$$;

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger to automatically update updated_at
create trigger update_registrations_updated_at
  before update on public.registrations
  for each row
  execute function public.update_updated_at_column();

-- Function to log audit trail
create or replace function public.log_audit()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.audit_logs (user_id, action, table_name, record_id, new_data)
    values (auth.uid(), tg_op, tg_table_name, new.id, to_jsonb(new));
    return new;
  elsif (tg_op = 'UPDATE') then
    insert into public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    values (auth.uid(), tg_op, tg_table_name, new.id, to_jsonb(old), to_jsonb(new));
    return new;
  elsif (tg_op = 'DELETE') then
    insert into public.audit_logs (user_id, action, table_name, record_id, old_data)
    values (auth.uid(), tg_op, tg_table_name, old.id, to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$;

-- Audit triggers for registrations
create trigger audit_registrations
  after insert or update or delete on public.registrations
  for each row
  execute function public.log_audit();

-- Audit triggers for qr_codes
create trigger audit_qr_codes
  after insert or update or delete on public.qr_codes
  for each row
  execute function public.log_audit();

-- =====================================================================
-- 3) scripts/003_update_qr_hash_function.sql
-- Sobrescribe generate_qr_hash para devolver 12 caracteres en mayúsculas
-- (de aquí sale el código que va dentro del QR).
-- =====================================================================

create or replace function public.generate_qr_hash(
  p_registration_id uuid,
  p_person_number integer
)
returns text
language plpgsql
security definer
as $$
declare
  hash_input text;
  qr_hash text;
  full_hash text;
begin
  -- Create a unique hash based on registration ID, person number, and timestamp
  hash_input := p_registration_id::text || '-' || p_person_number::text || '-' || extract(epoch from now())::text;

  -- Generate SHA256 hash and take first 8 characters for shorter code
  full_hash := encode(digest(hash_input, 'sha256'), 'hex');
  qr_hash := upper(substring(full_hash from 1 for 12));

  return qr_hash;
end;
$$;

-- =====================================================================
-- 4) Realtime (para que el panel se actualice solo al escanear)
-- Si este bloque falla, actívalo desde la UI:
--   Database → Replication → supabase_realtime → registrar, qr_codes, audit_logs
-- =====================================================================

do $$
begin
  begin
    alter publication supabase_realtime add table public.registrations;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.qr_codes;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.audit_logs;
  exception when duplicate_object then null;
  end;
end;
$$;
