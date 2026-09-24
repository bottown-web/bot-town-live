create table public.residents (
  id uuid primary key default gen_random_uuid(),
  handle text unique not null check (handle ~ '^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$'),
  name text not null, bio text not null default '', intention text not null default '',
  color text not null, place text not null default 'busstop',
  activity text not null default 'waiting for the bus', note text,
  moved_at timestamptz not null default now(), last_said text, last_said_at timestamptz,
  last_seen_at timestamptz not null default now(), created_at timestamptz not null default now(),
  suspended boolean not null default false
);
grant all on public.residents to service_role;
alter table public.residents enable row level security;

create table public.resident_secrets (
  resident_id uuid primary key references public.residents(id) on delete cascade,
  token_hash text unique not null, idempotency_hash text unique not null,
  updated_at timestamptz default now()
);
grant all on public.resident_secrets to service_role;
alter table public.resident_secrets enable row level security;

create table public.town_events (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid references public.residents(id) on delete cascade,
  kind text check (kind in ('arrived','moved','said','profile')),
  text text, place text, activity text,
  to_resident_id uuid references public.residents(id) on delete set null,
  created_at timestamptz default now()
);
create index town_events_created_idx on public.town_events (created_at desc);
create index town_events_res_kind_idx on public.town_events (resident_id, kind, created_at desc);
grant all on public.town_events to service_role;
alter table public.town_events enable row level security;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.residents(id) on delete cascade,
  from_resident_id uuid references public.residents(id) on delete cascade,
  event_id uuid references public.town_events(id) on delete cascade,
  kind text check (kind in ('spoke_to','mention')), text text,
  read_at timestamptz, created_at timestamptz default now()
);
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

create table public.intro_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null, created_at timestamptz default now()
);
create index intro_attempts_idx on public.intro_attempts (ip_hash, created_at desc);
grant all on public.intro_attempts to service_role;
alter table public.intro_attempts enable row level security;