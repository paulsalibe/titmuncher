-- Run this in your Supabase project's SQL Editor (Database > SQL Editor > New query).
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS everywhere, so it works whether
-- you're setting the table up fresh or migrating an existing one.

create table if not exists feedings (
  id uuid primary key default gen_random_uuid(),
  start_time timestamptz not null,
  side text not null check (side in ('left', 'right')),
  created_at timestamptz not null default now()
);

alter table feedings add column if not exists notes text;
alter table feedings add column if not exists tags text[] not null default '{}';

-- Duration is no longer tracked.
alter table feedings drop column if exists duration_minutes;

alter table feedings enable row level security;

drop policy if exists "Allow anon read" on feedings;
create policy "Allow anon read" on feedings
  for select to anon using (true);

drop policy if exists "Allow anon insert" on feedings;
create policy "Allow anon insert" on feedings
  for insert to anon with check (true);

drop policy if exists "Allow anon update" on feedings;
create policy "Allow anon update" on feedings
  for update to anon using (true) with check (true);

drop policy if exists "Allow anon delete" on feedings;
create policy "Allow anon delete" on feedings
  for delete to anon using (true);

-- Enable realtime updates so both devices see new/edited/deleted feeds live
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'feedings'
  ) then
    alter publication supabase_realtime add table feedings;
  end if;
end $$;
