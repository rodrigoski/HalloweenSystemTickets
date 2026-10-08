-- ============================================================
-- 004: Roles de usuario (admin / vendedor)
-- Ejecutar en el SQL Editor de Supabase, en orden.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Función que devuelve el rol del usuario actual (desde el JWT)
-- ------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'vendedor')
$$;

-- ------------------------------------------------------------
-- 2) Función para asignar roles (solo se ejecuta desde el SQL
--    Editor; NUNCA debe poder llamarla un usuario autenticado)
-- ------------------------------------------------------------
create or replace function public.set_user_role(p_email text, p_role text)
returns void
language plpgsql
security definer
as $$
begin
  if p_role not in ('admin', 'vendedor') then
    raise exception 'Rol invalido: % (usa admin o vendedor)', p_role;
  end if;

  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                             || jsonb_build_object('role', p_role)
   where lower(email) = lower(p_email);

  if not found then
    raise exception 'Usuario no encontrado: %', p_email;
  end if;
end;
$$;

revoke execute on function public.set_user_role(text, text) from public, anon, authenticated;
grant execute on function public.current_user_role() to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 3) Todos los usuarios existentes quedan como admin
--    (los nuevos se asignan con: select public.set_user_role('correo@x.com','vendedor');)
-- ------------------------------------------------------------
update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
 where coalesce(raw_app_meta_data ->> 'role', '') = '';

-- ------------------------------------------------------------
-- 4) audit_logs: guardar el email de quien hizo cada accion
-- ------------------------------------------------------------
alter table public.audit_logs add column if not exists user_email text;

update public.audit_logs al
   set user_email = u.email
  from auth.users u
 where al.user_id = u.id
   and al.user_email is null;

create or replace function public.log_audit()
returns trigger
language plpgsql
security definer
as $$
declare
  v_email text;
begin
  select email into v_email from auth.users where id = auth.uid();

  if (tg_op = 'INSERT') then
    insert into public.audit_logs (user_id, user_email, action, table_name, record_id, new_data)
    values (auth.uid(), v_email, tg_op, tg_table_name, new.id, to_jsonb(new));
    return new;
  elsif (tg_op = 'UPDATE') then
    insert into public.audit_logs (user_id, user_email, action, table_name, record_id, old_data, new_data)
    values (auth.uid(), v_email, tg_op, tg_table_name, new.id, to_jsonb(old), to_jsonb(new));
    return new;
  elsif (tg_op = 'DELETE') then
    insert into public.audit_logs (user_id, user_email, action, table_name, record_id, old_data)
    values (auth.uid(), v_email, tg_op, tg_table_name, old.id, to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$;

-- ------------------------------------------------------------
-- 5) RLS: el admin ve todo; el vendedor solo registra y ve lo suyo
-- ------------------------------------------------------------

-- registrations
drop policy if exists "Allow authenticated users to view all registrations" on public.registrations;
drop policy if exists "Allow authenticated users to insert registrations" on public.registrations;
drop policy if exists "Allow authenticated users to update registrations" on public.registrations;
drop policy if exists "Allow authenticated users to delete registrations" on public.registrations;

create policy "registrations_select_admin_or_own"
  on public.registrations for select
  using (public.current_user_role() = 'admin' or created_by = auth.uid());

create policy "registrations_insert_own"
  on public.registrations for insert
  with check (auth.role() = 'authenticated' and created_by = auth.uid());

create policy "registrations_update_admin"
  on public.registrations for update
  using (public.current_user_role() = 'admin');

create policy "registrations_delete_admin"
  on public.registrations for delete
  using (public.current_user_role() = 'admin');

-- qr_codes
drop policy if exists "Allow authenticated users to view all qr_codes" on public.qr_codes;
drop policy if exists "Allow authenticated users to insert qr_codes" on public.qr_codes;
drop policy if exists "Allow authenticated users to update qr_codes" on public.qr_codes;

create policy "qr_codes_select_admin_or_own"
  on public.qr_codes for select
  using (
    public.current_user_role() = 'admin'
    or exists (
      select 1 from public.registrations r
      where r.id = registration_id and r.created_by = auth.uid()
    )
  );

create policy "qr_codes_insert_admin_or_own"
  on public.qr_codes for insert
  with check (
    auth.role() = 'authenticated'
    and (
      public.current_user_role() = 'admin'
      or exists (
        select 1 from public.registrations r
        where r.id = registration_id and r.created_by = auth.uid()
      )
    )
  );

create policy "qr_codes_update_admin"
  on public.qr_codes for update
  using (public.current_user_role() = 'admin');

-- audit_logs
drop policy if exists "Allow authenticated users to view audit_logs" on public.audit_logs;
drop policy if exists "Allow authenticated users to insert audit_logs" on public.audit_logs;

create policy "audit_logs_select_admin"
  on public.audit_logs for select
  using (public.current_user_role() = 'admin');

create policy "audit_logs_insert_authenticated"
  on public.audit_logs for insert
  with check (auth.role() = 'authenticated');
