create extension if not exists pgcrypto;

create table users (
  id uuid primary key,
  email text unique not null,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  name text not null,
  description text,
  template_type text not null default 'custom',
  default_schema jsonb,
  default_thresholds jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table datasets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  version integer not null,
  filename text not null,
  storage_path text not null,
  row_count integer not null,
  sha256 text not null,
  uploaded_at timestamptz not null default now(),
  unique(project_id, version)
);

create table run_configs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  prompt_text text not null,
  prompt_version text,
  model_provider text not null,
  model_name text not null,
  schema_json jsonb not null,
  thresholds_json jsonb not null,
  created_at timestamptz not null default now()
);

create table runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  dataset_id uuid not null references datasets(id) on delete restrict,
  run_config_id uuid not null references run_configs(id) on delete restrict,
  trigger_source text not null default 'manual',
  status text not null default 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  total_cases integer,
  processed_cases integer not null default 0,
  cost_estimate_usd numeric(12,6),
  error_message text,
  created_at timestamptz not null default now()
);

create table run_results (
  run_id uuid primary key references runs(id) on delete cascade,
  metrics_json jsonb not null,
  gate_pass boolean not null,
  report_path text not null,
  summary_json jsonb not null,
  created_at timestamptz not null default now()
);

create table failures (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references runs(id) on delete cascade,
  testcase_id text not null,
  failure_type text not null,
  expected_json jsonb,
  actual_json jsonb,
  diff_json jsonb,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create table case_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references runs(id) on delete cascade,
  testcase_id text not null,
  input_json jsonb not null,
  expected_json jsonb,
  actual_json jsonb,
  schema_valid boolean not null default false,
  enum_correct boolean,
  field_accuracy numeric(5,4),
  latency_ms integer,
  error_type text,
  created_at timestamptz not null default now()
);

create table ci_tokens (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  token_hash text not null,
  label text,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  run_id uuid references runs(id) on delete cascade,
  status text not null default 'pending',
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  available_at timestamptz not null default now(),
  leased_at timestamptz,
  lease_owner text,
  error_message text,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_projects_owner_id on projects(owner_id);
create index idx_datasets_project_id on datasets(project_id);
create index idx_run_configs_project_id on run_configs(project_id);
create index idx_runs_project_id on runs(project_id);
create index idx_runs_status on runs(status);
create index idx_failures_run_id on failures(run_id);
create index idx_case_results_run_id on case_results(run_id);
create index idx_jobs_status_available_at on jobs(status, available_at);
