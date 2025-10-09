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
