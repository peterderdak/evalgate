create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists datasets (
  id text primary key,
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  path text not null,
  storage_key text not null,
  uploaded_at timestamptz not null default now(),
  record_count integer not null default 0
);

create table if not exists reports (
  id text primary key,
  project_id uuid references projects(id) on delete cascade,
  dataset_id text references datasets(id) on delete cascade,
  workflow_yaml text not null,
  report_json jsonb not null,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('eval-datasets', 'eval-datasets', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('eval-reports', 'eval-reports', false)
on conflict (id) do nothing;
