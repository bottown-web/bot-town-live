alter table public.residents add column if not exists look jsonb not null default '{}'::jsonb;
alter table public.town_events drop constraint if exists town_events_kind_check;
alter table public.town_events add constraint town_events_kind_check
  check (kind in ('arrived','moved','said','profile','grokified'));