-- WAY Equipe de Fotografia — rode TUDO isto no SQL Editor do Supabase.
create table if not exists months (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  month int not null check (month between 1 and 12),
  status text not null default 'open' check (status in ('open','closed')),
  per_service int not null default 2 check (per_service > 0),
  created_at timestamptz not null default now(),
  unique (year, month)
);

create table if not exists availabilities (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references months(id) on delete cascade,
  name text not null,
  name_key text not null,
  slots text[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (month_id, name_key)
);

create table if not exists schedule (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references months(id) on delete cascade,
  service_date date not null,
  slot text not null check (slot in ('qui_noite','dom_manha','dom_noite')),
  names text[] not null default '{}',
  needed int not null default 2,
  unique (month_id, service_date, slot)
);

alter table months enable row level security;
alter table availabilities enable row level security;
alter table schedule enable row level security;

-- Público: só LÊ meses e escala (versão de consulta). Disponibilidades NÃO são públicas.
create policy "months_public_read" on months for select using (true);
create policy "schedule_public_read" on schedule for select using (true);
-- Administrador (usuário autenticado): acesso total.
create policy "months_admin_all" on months for all to authenticated using (true) with check (true);
create policy "schedule_admin_all" on schedule for all to authenticated using (true) with check (true);
create policy "avail_admin_all" on availabilities for all to authenticated using (true) with check (true);

-- Envio de disponibilidade pelos integrantes (sem login), validado no servidor.
create or replace function submit_availability(p_month uuid, p_name text, p_slots text[])
returns void language plpgsql security definer set search_path = public as $$
declare v_status text; v_key text := lower(regexp_replace(trim(p_name), '\s+', ' ', 'g'));
begin
  if length(v_key) < 2 then raise exception 'nome_invalido'; end if;
  if p_slots is null or cardinality(p_slots) = 0 then raise exception 'sem_disponibilidade'; end if;
  if not (p_slots <@ array['qui_noite','dom_manha','dom_noite']) then raise exception 'slot_invalido'; end if;
  select status into v_status from months where id = p_month;
  if v_status is null then raise exception 'mes_inexistente'; end if;
  if v_status <> 'open' then raise exception 'periodo_encerrado'; end if;
  insert into availabilities (month_id, name, name_key, slots)
  values (p_month, trim(regexp_replace(p_name, '\s+', ' ', 'g')), v_key, p_slots)
  on conflict (month_id, name_key) do update set slots = excluded.slots, updated_at = now();
end $$;

-- Permite à pessoa recarregar a própria resposta (só retorna os horários do nome informado).
create or replace function get_my_availability(p_month uuid, p_name text)
returns text[] language sql security definer set search_path = public as $$
  select slots from availabilities
  where month_id = p_month and name_key = lower(regexp_replace(trim(p_name), '\s+', ' ', 'g'));
$$;

grant execute on function submit_availability(uuid, text, text[]) to anon, authenticated;
grant execute on function get_my_availability(uuid, text) to anon, authenticated;
