create extension if not exists pgcrypto;

do $$
begin
  create type public.workspace_role as enum ('owner', 'admin', 'member', 'viewer');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.permission_level as enum ('read_only', 'suggest_only', 'draft_only', 'execute_with_approval', 'execute_auto');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.risk_level as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.room_status as enum ('active', 'planning', 'paused', 'archived');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.agent_status as enum ('idle', 'thinking', 'planning', 'working', 'reviewing', 'waiting_for_approval', 'blocked', 'done');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.task_status as enum ('backlog', 'next', 'in_progress', 'review', 'done');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.approval_status as enum ('pending', 'approved', 'denied', 'expired');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.actor_type as enum ('user', 'agent', 'integration', 'system');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.integration_status as enum ('connected', 'disconnected', 'needs_setup', 'error');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.integration_health as enum ('healthy', 'degraded', 'failing', 'unknown');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.workflow_status as enum ('active', 'draft', 'paused');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.workflow_run_status as enum ('queued', 'running', 'waiting_for_approval', 'completed', 'failed', 'canceled');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.console_message_kind as enum ('user', 'agent', 'tool', 'approval', 'task', 'system');
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  avatar_url text,
  default_workspace_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_default_workspace_id_fkey
  foreign key (default_workspace_id) references public.workspaces(id) on delete set null;

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  mission text not null default '',
  status public.room_status not null default 'planning',
  accent_color text not null default '#7dd3fc',
  launch_progress integer not null default 0 check (launch_progress between 0 and 100),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug),
  unique (id, workspace_id)
);

create table if not exists public.room_context (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  room_id uuid not null,
  objective text not null default '',
  project_type text,
  github_repo text,
  vercel_project text,
  website_url text,
  notes text,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id),
  foreign key (room_id, workspace_id) references public.rooms(id, workspace_id) on delete cascade
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  role text not null,
  description text not null default '',
  status public.agent_status not null default 'idle',
  role_prompt text not null default '',
  permission_level public.permission_level not null default 'suggest_only',
  tool_keys text[] not null default '{}',
  memory_summary text not null default '',
  is_template boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);

create table if not exists public.room_agents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  room_id uuid not null,
  agent_id uuid not null,
  status public.agent_status not null default 'idle',
  current_task_id uuid,
  permission_override public.permission_level,
  custom_name text,
  memory_summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, agent_id),
  unique (id, workspace_id),
  foreign key (room_id, workspace_id) references public.rooms(id, workspace_id) on delete cascade,
  foreign key (agent_id, workspace_id) references public.agents(id, workspace_id) on delete cascade
);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  category text not null,
  phase text not null,
  capabilities text[] not null default '{}',
  high_risk_actions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  room_id uuid not null,
  integration_id uuid not null references public.integrations(id) on delete restrict,
  status public.integration_status not null default 'needs_setup',
  health public.integration_health not null default 'unknown',
  permission_level public.permission_level not null default 'read_only',
  last_synced_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  credentials_ref text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, integration_id),
  foreign key (room_id, workspace_id) references public.rooms(id, workspace_id) on delete cascade
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  room_id uuid not null,
  title text not null,
  description text not null default '',
  status public.task_status not null default 'backlog',
  priority public.task_priority not null default 'medium',
  due_date date,
  assigned_room_agent_id uuid,
  external_links jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (room_id, workspace_id) references public.rooms(id, workspace_id) on delete cascade,
  foreign key (assigned_room_agent_id) references public.room_agents(id) on delete set null,
  unique (id, workspace_id)
);

alter table public.room_agents
  add constraint room_agents_current_task_id_fkey
  foreign key (current_task_id) references public.tasks(id) on delete set null;

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  room_id uuid,
  requested_by_room_agent_id uuid,
  action_type text not null,
  integration_id uuid references public.integrations(id) on delete set null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  risk_level public.risk_level not null default 'high',
  status public.approval_status not null default 'pending',
  requested_by uuid references public.profiles(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (room_id, workspace_id) references public.rooms(id, workspace_id) on delete cascade,
  foreign key (requested_by_room_agent_id) references public.room_agents(id) on delete set null
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  room_id uuid,
  actor_type public.actor_type not null default 'system',
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_room_agent_id uuid,
  integration_id uuid references public.integrations(id) on delete set null,
  event_type text not null,
  title text not null,
  summary text not null default '',
  payload jsonb not null default '{}'::jsonb,
  risk_level public.risk_level not null default 'low',
  created_at timestamptz not null default now(),
  foreign key (room_id, workspace_id) references public.rooms(id, workspace_id) on delete cascade,
  foreign key (actor_room_agent_id) references public.room_agents(id) on delete set null
);

create table if not exists public.console_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  room_id uuid not null,
  kind public.console_message_kind not null,
  author_name text not null,
  author_user_id uuid references public.profiles(id) on delete set null,
  author_room_agent_id uuid,
  integration_id uuid references public.integrations(id) on delete set null,
  approval_id uuid references public.approvals(id) on delete set null,
  task_id uuid,
  title text,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (room_id, workspace_id) references public.rooms(id, workspace_id) on delete cascade,
  foreign key (author_room_agent_id) references public.room_agents(id) on delete set null,
  foreign key (task_id) references public.tasks(id) on delete set null
);

create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  room_id uuid,
  name text not null,
  description text not null default '',
  status public.workflow_status not null default 'draft',
  trigger_type text not null default 'manual',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (room_id, workspace_id) references public.rooms(id, workspace_id) on delete cascade
);

create table if not exists public.workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  workflow_id uuid not null,
  position integer not null check (position > 0),
  name text not null,
  action_type text not null,
  integration_id uuid references public.integrations(id) on delete set null,
  config jsonb not null default '{}'::jsonb,
  requires_approval boolean not null default false,
  expected_output text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workflow_id, position),
  unique (id, workspace_id),
  foreign key (workflow_id, workspace_id) references public.workflows(id, workspace_id) on delete cascade
);

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  workflow_id uuid not null,
  room_id uuid,
  status public.workflow_run_status not null default 'queued',
  started_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (workflow_id, workspace_id) references public.workflows(id, workspace_id) on delete cascade,
  foreign key (room_id, workspace_id) references public.rooms(id, workspace_id) on delete cascade
);

create table if not exists public.workflow_run_steps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  workflow_run_id uuid not null,
  workflow_step_id uuid not null,
  status public.workflow_run_status not null default 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  output jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workflow_run_id, workflow_step_id),
  foreign key (workflow_run_id, workspace_id) references public.workflow_runs(id, workspace_id) on delete cascade,
  foreign key (workflow_step_id, workspace_id) references public.workflow_steps(id, workspace_id) on delete cascade
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  room_id uuid,
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_room_agent_id uuid,
  action text not null,
  target_type text not null,
  target_id text not null,
  payload jsonb not null default '{}'::jsonb,
  risk_level public.risk_level not null default 'low',
  created_at timestamptz not null default now(),
  foreign key (room_id) references public.rooms(id) on delete set null,
  foreign key (actor_room_agent_id) references public.room_agents(id) on delete set null
);

create index if not exists workspace_members_user_idx on public.workspace_members(user_id);
create index if not exists rooms_workspace_status_idx on public.rooms(workspace_id, status, updated_at desc);
create index if not exists room_agents_room_idx on public.room_agents(room_id);
create index if not exists tasks_room_board_idx on public.tasks(room_id, status, priority, updated_at desc);
create index if not exists approvals_workspace_pending_idx on public.approvals(workspace_id, requested_at desc) where status = 'pending';
create index if not exists approvals_room_pending_idx on public.approvals(room_id, requested_at desc) where status = 'pending';
create index if not exists activity_events_workspace_recent_idx on public.activity_events(workspace_id, created_at desc);
create index if not exists activity_events_room_recent_idx on public.activity_events(room_id, created_at desc);
create index if not exists console_messages_room_recent_idx on public.console_messages(room_id, created_at desc);
create index if not exists room_integrations_room_idx on public.room_integrations(room_id, status, health);
create index if not exists workflow_steps_workflow_position_idx on public.workflow_steps(workflow_id, position);
create index if not exists workflow_runs_workspace_recent_idx on public.workflow_runs(workspace_id, started_at desc);
create index if not exists workflow_run_steps_run_idx on public.workflow_run_steps(workflow_run_id);
create index if not exists audit_logs_workspace_recent_idx on public.audit_logs(workspace_id, created_at desc);

create or replace function public.is_workspace_member(workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace
      and wm.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_workspace_role(workspace uuid, allowed_roles public.workspace_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace
      and wm.user_id = (select auth.uid())
      and wm.role = any(allowed_roles)
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public, anon, authenticated;
revoke all on function public.has_workspace_role(uuid, public.workspace_role[]) from public, anon, authenticated;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, public.workspace_role[]) to authenticated;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.rooms enable row level security;
alter table public.room_context enable row level security;
alter table public.agents enable row level security;
alter table public.room_agents enable row level security;
alter table public.tasks enable row level security;
alter table public.approvals enable row level security;
alter table public.activity_events enable row level security;
alter table public.console_messages enable row level security;
alter table public.integrations enable row level security;
alter table public.room_integrations enable row level security;
alter table public.workflows enable row level security;
alter table public.workflow_steps enable row level security;
alter table public.workflow_runs enable row level security;
alter table public.workflow_run_steps enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "workspaces_select_member" on public.workspaces;
create policy "workspaces_select_member" on public.workspaces
  for select to authenticated
  using ((select public.is_workspace_member(id)));

drop policy if exists "workspaces_insert_owner" on public.workspaces;
create policy "workspaces_insert_owner" on public.workspaces
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));

drop policy if exists "workspaces_update_admin" on public.workspaces;
create policy "workspaces_update_admin" on public.workspaces
  for update to authenticated
  using ((select public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[])))
  with check ((select public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[])));

drop policy if exists "workspace_members_select_member" on public.workspace_members;
create policy "workspace_members_select_member" on public.workspace_members
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));

drop policy if exists "workspace_members_insert_admin" on public.workspace_members;
create policy "workspace_members_insert_admin" on public.workspace_members
  for insert to authenticated
  with check (
    (select public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
    or (
      user_id = (select auth.uid())
      and role = 'owner'
      and exists (
        select 1 from public.workspaces w
        where w.id = workspace_id
          and w.owner_user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "workspace_members_update_admin" on public.workspace_members;
create policy "workspace_members_update_admin" on public.workspace_members
  for update to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])))
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])));

drop policy if exists "workspace_members_delete_admin" on public.workspace_members;
create policy "workspace_members_delete_admin" on public.workspace_members
  for delete to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])));

drop policy if exists "integrations_select_authenticated" on public.integrations;
create policy "integrations_select_authenticated" on public.integrations
  for select to authenticated
  using (true);

drop policy if exists "rooms_select_member" on public.rooms;
create policy "rooms_select_member" on public.rooms
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));

drop policy if exists "rooms_insert_member" on public.rooms;
create policy "rooms_insert_member" on public.rooms
  for insert to authenticated
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "rooms_update_member" on public.rooms;
create policy "rooms_update_member" on public.rooms
  for update to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])))
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "rooms_delete_admin" on public.rooms;
create policy "rooms_delete_admin" on public.rooms
  for delete to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])));

drop policy if exists "room_context_select_member" on public.room_context;
create policy "room_context_select_member" on public.room_context
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));

drop policy if exists "room_context_insert_member" on public.room_context;
create policy "room_context_insert_member" on public.room_context
  for insert to authenticated
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "room_context_update_member" on public.room_context;
create policy "room_context_update_member" on public.room_context
  for update to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])))
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "agents_select_member" on public.agents;
create policy "agents_select_member" on public.agents
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));

drop policy if exists "agents_insert" on public.agents;
create policy "agents_insert" on public.agents
  for insert to authenticated
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "agents_update" on public.agents;
create policy "agents_update" on public.agents
  for update to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])))
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "agents_delete" on public.agents;
create policy "agents_delete" on public.agents
  for delete to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])));

drop policy if exists "room_agents_select_member" on public.room_agents;
create policy "room_agents_select_member" on public.room_agents
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));

drop policy if exists "room_agents_insert" on public.room_agents;
create policy "room_agents_insert" on public.room_agents
  for insert to authenticated
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "room_agents_update" on public.room_agents;
create policy "room_agents_update" on public.room_agents
  for update to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])))
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "room_agents_delete" on public.room_agents;
create policy "room_agents_delete" on public.room_agents
  for delete to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])));

drop policy if exists "tasks_select_member" on public.tasks;
create policy "tasks_select_member" on public.tasks
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));

drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert to authenticated
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
  for update to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])))
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks
  for delete to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])));

drop policy if exists "approvals_select_member" on public.approvals;
create policy "approvals_select_member" on public.approvals
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));

drop policy if exists "approvals_insert_member" on public.approvals;
create policy "approvals_insert_member" on public.approvals
  for insert to authenticated
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "approvals_update_reviewer" on public.approvals;
create policy "approvals_update_reviewer" on public.approvals
  for update to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])))
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "activity_events_select_member" on public.activity_events;
create policy "activity_events_select_member" on public.activity_events
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));

drop policy if exists "activity_events_insert_member" on public.activity_events;
create policy "activity_events_insert_member" on public.activity_events
  for insert to authenticated
  with check ((select public.is_workspace_member(workspace_id)));

drop policy if exists "console_messages_select_member" on public.console_messages;
create policy "console_messages_select_member" on public.console_messages
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));

drop policy if exists "console_messages_insert_member" on public.console_messages;
create policy "console_messages_insert_member" on public.console_messages
  for insert to authenticated
  with check ((select public.is_workspace_member(workspace_id)));

drop policy if exists "room_integrations_select_member" on public.room_integrations;
create policy "room_integrations_select_member" on public.room_integrations
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));

drop policy if exists "room_integrations_insert" on public.room_integrations;
create policy "room_integrations_insert" on public.room_integrations
  for insert to authenticated
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "room_integrations_update" on public.room_integrations;
create policy "room_integrations_update" on public.room_integrations
  for update to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])))
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "room_integrations_delete" on public.room_integrations;
create policy "room_integrations_delete" on public.room_integrations
  for delete to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])));

drop policy if exists "workflows_select_member" on public.workflows;
create policy "workflows_select_member" on public.workflows
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));

drop policy if exists "workflows_insert" on public.workflows;
create policy "workflows_insert" on public.workflows
  for insert to authenticated
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "workflows_update" on public.workflows;
create policy "workflows_update" on public.workflows
  for update to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])))
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "workflows_delete" on public.workflows;
create policy "workflows_delete" on public.workflows
  for delete to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])));

drop policy if exists "workflow_steps_select_member" on public.workflow_steps;
create policy "workflow_steps_select_member" on public.workflow_steps
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));

drop policy if exists "workflow_steps_insert" on public.workflow_steps;
create policy "workflow_steps_insert" on public.workflow_steps
  for insert to authenticated
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "workflow_steps_update" on public.workflow_steps;
create policy "workflow_steps_update" on public.workflow_steps
  for update to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])))
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "workflow_steps_delete" on public.workflow_steps;
create policy "workflow_steps_delete" on public.workflow_steps
  for delete to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])));

drop policy if exists "workflow_runs_select_member" on public.workflow_runs;
create policy "workflow_runs_select_member" on public.workflow_runs
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));

drop policy if exists "workflow_runs_insert_member" on public.workflow_runs;
create policy "workflow_runs_insert_member" on public.workflow_runs
  for insert to authenticated
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "workflow_runs_update_member" on public.workflow_runs;
create policy "workflow_runs_update_member" on public.workflow_runs
  for update to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])))
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "workflow_run_steps_select_member" on public.workflow_run_steps;
create policy "workflow_run_steps_select_member" on public.workflow_run_steps
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));

drop policy if exists "workflow_run_steps_insert_member" on public.workflow_run_steps;
create policy "workflow_run_steps_insert_member" on public.workflow_run_steps
  for insert to authenticated
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "workflow_run_steps_update_member" on public.workflow_run_steps;
create policy "workflow_run_steps_update_member" on public.workflow_run_steps
  for update to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])))
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "audit_logs_select_member" on public.audit_logs;
create policy "audit_logs_select_member" on public.audit_logs
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));

drop policy if exists "audit_logs_insert_member" on public.audit_logs;
create policy "audit_logs_insert_member" on public.audit_logs
  for insert to authenticated
  with check ((select public.is_workspace_member(workspace_id)));

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_workspaces on public.workspaces;
create trigger set_updated_at_workspaces before update on public.workspaces
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_workspace_members on public.workspace_members;
create trigger set_updated_at_workspace_members before update on public.workspace_members
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_rooms on public.rooms;
create trigger set_updated_at_rooms before update on public.rooms
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_room_context on public.room_context;
create trigger set_updated_at_room_context before update on public.room_context
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_agents on public.agents;
create trigger set_updated_at_agents before update on public.agents
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_room_agents on public.room_agents;
create trigger set_updated_at_room_agents before update on public.room_agents
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_integrations on public.integrations;
create trigger set_updated_at_integrations before update on public.integrations
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_room_integrations on public.room_integrations;
create trigger set_updated_at_room_integrations before update on public.room_integrations
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_tasks on public.tasks;
create trigger set_updated_at_tasks before update on public.tasks
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_approvals on public.approvals;
create trigger set_updated_at_approvals before update on public.approvals
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_workflows on public.workflows;
create trigger set_updated_at_workflows before update on public.workflows
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_workflow_steps on public.workflow_steps;
create trigger set_updated_at_workflow_steps before update on public.workflow_steps
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_workflow_runs on public.workflow_runs;
create trigger set_updated_at_workflow_runs before update on public.workflow_runs
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_workflow_run_steps on public.workflow_run_steps;
create trigger set_updated_at_workflow_run_steps before update on public.workflow_run_steps
  for each row execute function public.set_updated_at();

insert into public.integrations (key, name, category, phase, capabilities, high_risk_actions)
values
  ('github', 'GitHub', 'code', 'phase_1', array['activity', 'status', 'pull_requests', 'issues'], array['merge_pr']),
  ('vercel', 'Vercel', 'deployment', 'phase_1', array['activity', 'status', 'deployments', 'domains'], array['deploy_production', 'update_env_vars']),
  ('supabase', 'Supabase', 'database', 'phase_1', array['activity', 'logs', 'schema', 'edge_functions'], array['delete_database_rows', 'modify_auth_settings']),
  ('stripe', 'Stripe', 'payments', 'phase_1', array['customers', 'subscriptions', 'prices', 'invoices'], array['create_stripe_product', 'change_billing']),
  ('sentry', 'Sentry', 'monitoring', 'phase_1', array['issues', 'events', 'releases'], array[]::text[]),
  ('linear', 'Linear', 'project_management', 'phase_2', array['issues', 'projects', 'cycles'], array[]::text[]),
  ('notion', 'Notion', 'docs', 'phase_2', array['pages', 'databases', 'docs'], array[]::text[]),
  ('figma', 'Figma', 'design', 'phase_2', array['files', 'comments', 'handoff'], array[]::text[]),
  ('canva', 'Canva', 'marketing', 'phase_3', array['designs', 'brand_assets', 'exports'], array['send_email']),
  ('jam', 'Jam', 'monitoring', 'phase_2', array['bug_reports', 'console_logs', 'network_logs'], array[]::text[]),
  ('amplitude', 'Amplitude', 'analytics', 'phase_2', array['events', 'funnels', 'retention'], array[]::text[]),
  ('cloudflare', 'Cloudflare', 'infrastructure', 'phase_3', array['dns', 'security', 'edge'], array['change_dns'])
on conflict (key) do update set
  name = excluded.name,
  category = excluded.category,
  phase = excluded.phase,
  capabilities = excluded.capabilities,
  high_risk_actions = excluded.high_risk_actions,
  updated_at = now();
