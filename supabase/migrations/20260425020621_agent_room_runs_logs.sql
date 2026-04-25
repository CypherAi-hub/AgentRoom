do $$
begin
  create type public.agent_run_status as enum ('queued', 'running', 'blocked', 'completed', 'failed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.run_log_level as enum ('debug', 'info', 'warn', 'error');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.tool_call_status as enum ('queued', 'running', 'succeeded', 'failed', 'blocked', 'approval_required');
exception when duplicate_object then null;
end $$;

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  room_id uuid not null,
  room_agent_id uuid,
  task_id uuid,
  approval_id uuid references public.approvals(id) on delete set null,
  status public.agent_run_status not null default 'queued',
  command text not null default '',
  input jsonb not null default '{}'::jsonb,
  output text not null default '',
  error text,
  started_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (room_id, workspace_id) references public.rooms(id, workspace_id) on delete cascade,
  foreign key (room_agent_id) references public.room_agents(id) on delete set null,
  foreign key (task_id) references public.tasks(id) on delete set null
);

create table if not exists public.run_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  agent_run_id uuid not null,
  level public.run_log_level not null default 'info',
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (agent_run_id, workspace_id) references public.agent_runs(id, workspace_id) on delete cascade
);

create table if not exists public.tool_calls (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  agent_run_id uuid not null,
  integration_id uuid references public.integrations(id) on delete set null,
  call_name text not null,
  status public.tool_call_status not null default 'queued',
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (agent_run_id, workspace_id) references public.agent_runs(id, workspace_id) on delete cascade
);

create index if not exists agent_runs_workspace_recent_idx on public.agent_runs(workspace_id, created_at desc);
create index if not exists agent_runs_room_status_idx on public.agent_runs(room_id, status, created_at desc);
create index if not exists agent_runs_task_idx on public.agent_runs(task_id) where task_id is not null;
create index if not exists run_logs_run_recent_idx on public.run_logs(agent_run_id, created_at asc);
create index if not exists tool_calls_run_recent_idx on public.tool_calls(agent_run_id, created_at asc);
create index if not exists tool_calls_integration_idx on public.tool_calls(integration_id) where integration_id is not null;

alter table public.agent_runs enable row level security;
alter table public.run_logs enable row level security;
alter table public.tool_calls enable row level security;

drop policy if exists "agent_runs_select_member" on public.agent_runs;
create policy "agent_runs_select_member" on public.agent_runs
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));

drop policy if exists "agent_runs_insert_member" on public.agent_runs;
create policy "agent_runs_insert_member" on public.agent_runs
  for insert to authenticated
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "agent_runs_update_member" on public.agent_runs;
create policy "agent_runs_update_member" on public.agent_runs
  for update to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])))
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "run_logs_select_member" on public.run_logs;
create policy "run_logs_select_member" on public.run_logs
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));

drop policy if exists "run_logs_insert_member" on public.run_logs;
create policy "run_logs_insert_member" on public.run_logs
  for insert to authenticated
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "tool_calls_select_member" on public.tool_calls;
create policy "tool_calls_select_member" on public.tool_calls
  for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));

drop policy if exists "tool_calls_insert_member" on public.tool_calls;
create policy "tool_calls_insert_member" on public.tool_calls
  for insert to authenticated
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop policy if exists "tool_calls_update_member" on public.tool_calls;
create policy "tool_calls_update_member" on public.tool_calls
  for update to authenticated
  using ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])))
  with check ((select public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.workspace_role[])));

drop trigger if exists set_updated_at_agent_runs on public.agent_runs;
create trigger set_updated_at_agent_runs before update on public.agent_runs
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_tool_calls on public.tool_calls;
create trigger set_updated_at_tool_calls before update on public.tool_calls
  for each row execute function public.set_updated_at();
