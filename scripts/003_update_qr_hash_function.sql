-- Update QR hash function to generate shorter codes (8 characters instead of 64)
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
