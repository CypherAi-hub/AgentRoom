-- Phase 3: Surgical drop — only the legacy tables whose names collide with
-- the new user-scoped schema. CASCADE pulls FK-dependent zero-row tables
-- (room_agents, room_integrations, room_context, tasks, workflows*,
--  agent_runs, run_logs, tool_calls, activity_events, approvals,
--  console_messages). Kept: workspaces, workspace_members, audit_logs,
--  integrations.
drop table if exists public.rooms cascade;
drop table if exists public.agents cascade;

-- Phase 3: User-scoped product tables.
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  role text not null,
  description text,
  avatar_initials text not null,
  color text not null,
  status text not null default 'idle' check (status in ('idle','working','reviewing','blocked')),
  created_at timestamptz not null default now()
);

create table public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  agent_id uuid references public.agents(id) on delete set null,
  task_prompt text not null,
  status text not null default 'pending' check (status in ('pending','running','completed','stopped','error')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  credits_used integer not null default 0,
  sandbox_id text,
  stream_url text,
  error_message text,
  created_at timestamptz not null default now()
);

create table public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  run_id uuid references public.runs(id) on delete cascade,
  type text not null check (type in ('sandbox_start','minute','agent_step','screenshot')),
  credits_used integer not null,
  created_at timestamptz not null default now()
);

create index runs_user_created_idx on public.runs(user_id, created_at desc);
create index runs_room_idx on public.runs(room_id);
create index usage_logs_user_created_idx on public.usage_logs(user_id, created_at desc);
create index usage_logs_run_idx on public.usage_logs(run_id);
create index rooms_user_idx on public.rooms(user_id);
create index agents_user_idx on public.agents(user_id);

alter table public.rooms enable row level security;
alter table public.agents enable row level security;
alter table public.runs enable row level security;
alter table public.usage_logs enable row level security;

create policy "rooms_select_own" on public.rooms for select to authenticated using (user_id = (select auth.uid()));
create policy "rooms_insert_own" on public.rooms for insert to authenticated with check (user_id = (select auth.uid()));
create policy "rooms_update_own" on public.rooms for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "rooms_delete_own" on public.rooms for delete to authenticated using (user_id = (select auth.uid()));

create policy "agents_select_own" on public.agents for select to authenticated using (user_id = (select auth.uid()));
create policy "agents_insert_own" on public.agents for insert to authenticated with check (user_id = (select auth.uid()));
create policy "agents_update_own" on public.agents for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "agents_delete_own" on public.agents for delete to authenticated using (user_id = (select auth.uid()));

create policy "runs_select_own" on public.runs for select to authenticated using (user_id = (select auth.uid()));
create policy "runs_insert_own" on public.runs for insert to authenticated with check (user_id = (select auth.uid()));
create policy "runs_update_own" on public.runs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "usage_logs_select_own" on public.usage_logs for select to authenticated using (user_id = (select auth.uid()));
create policy "usage_logs_insert_own" on public.usage_logs for insert to authenticated with check (user_id = (select auth.uid()));

drop trigger if exists set_updated_at_rooms on public.rooms;
create trigger set_updated_at_rooms before update on public.rooms
  for each row execute function public.set_profiles_updated_at();

create or replace function public.seed_new_user_workspace(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if exists (select 1 from public.rooms where user_id = p_user_id) then
    return;
  end if;

  insert into public.rooms (user_id, name, description) values
    (p_user_id, 'My First Room', 'Your default workspace. Rename or create new rooms anytime.');

  insert into public.agents (user_id, name, role, description, avatar_initials, color, status) values
    (p_user_id, 'Engineer', 'engineer', 'Builds, fixes, and ships code on a real cloud machine.', 'EA', '#3EE98C', 'idle'),
    (p_user_id, 'Designer', 'designer', 'Crafts UI, mocks, and design pass-throughs.', 'DA', '#a855f7', 'idle'),
    (p_user_id, 'QA', 'qa', 'Validates flows, regression-tests, and reports.', 'QA', '#7dd3fc', 'idle'),
    (p_user_id, 'PM', 'pm', 'Plans, prioritizes, and writes specs.', 'PM', '#FDBA74', 'idle');
end;
$$;

revoke all on function public.seed_new_user_workspace(uuid) from public, anon, authenticated;

create or replace function private.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update set email = excluded.email;

  perform public.seed_new_user_workspace(new.id);

  return new;
end;
$$;

revoke all on function private.handle_new_user_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user_profile();

do $$
declare
  p_id uuid;
begin
  for p_id in select id from public.profiles loop
    perform public.seed_new_user_workspace(p_id);
  end loop;
end $$;

grant select, insert, update, delete on public.rooms to authenticated;
grant select, insert, update, delete on public.agents to authenticated;
grant select, insert, update on public.runs to authenticated;
grant select, insert on public.usage_logs to authenticated;
