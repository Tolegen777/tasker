-- ============================================================
-- Tasker — миграция: таблицы для совещаний.
-- Применить ОДИН РАЗ после schema.sql: Supabase Dashboard → SQL Editor → Run.
-- ============================================================

-- 1) Совещания
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text, -- ссылка на Zoom/Meet/Telegram или физический адрес
  starts_at timestamptz not null,
  duration_minutes int not null default 30 check (duration_minutes > 0),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meetings_starts_at_idx on public.meetings(starts_at);
create index if not exists meetings_created_by_idx on public.meetings(created_by);

-- 2) Участники (many-to-many)
create table if not exists public.meeting_participants (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (meeting_id, profile_id)
);

create index if not exists mp_profile_idx on public.meeting_participants(profile_id);

-- 3) Триггер updated_at (использует функцию из schema.sql)
drop trigger if exists trg_meetings_updated_at on public.meetings;
create trigger trg_meetings_updated_at
before update on public.meetings
for each row execute function public.set_updated_at();

-- 4) RLS
alter table public.meetings              enable row level security;
alter table public.meeting_participants  enable row level security;

-- --- meetings policies ---
drop policy if exists "meetings: read all (authed)" on public.meetings;
create policy "meetings: read all (authed)" on public.meetings
  for select using (auth.role() = 'authenticated');

drop policy if exists "meetings: insert authed" on public.meetings;
create policy "meetings: insert authed" on public.meetings
  for insert with check (auth.uid() = created_by);

drop policy if exists "meetings: update by author or admin" on public.meetings;
create policy "meetings: update by author or admin" on public.meetings
  for update using (public.is_admin() or auth.uid() = created_by)
  with check (public.is_admin() or auth.uid() = created_by);

drop policy if exists "meetings: delete by author or admin" on public.meetings;
create policy "meetings: delete by author or admin" on public.meetings
  for delete using (public.is_admin() or auth.uid() = created_by);

-- --- meeting_participants policies ---
drop policy if exists "mp: read all (authed)" on public.meeting_participants;
create policy "mp: read all (authed)" on public.meeting_participants
  for select using (auth.role() = 'authenticated');

-- Записывать/удалять участников может автор совещания или админ
drop policy if exists "mp: write by author or admin" on public.meeting_participants;
create policy "mp: write by author or admin" on public.meeting_participants
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.meetings m
      where m.id = meeting_id and m.created_by = auth.uid()
    )
  ) with check (
    public.is_admin()
    or exists (
      select 1 from public.meetings m
      where m.id = meeting_id and m.created_by = auth.uid()
    )
  );

-- 5) Realtime
alter publication supabase_realtime add table public.meetings;
alter publication supabase_realtime add table public.meeting_participants;
