-- ============================================================
-- Tasker — схема и RLS политики для Supabase
-- Применить: Supabase Dashboard → SQL Editor → выполнить файл целиком.
-- ============================================================

-- 1) ENUM'ы
do $$ begin
  create type user_role as enum ('admin', 'employee');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('todo', 'in_progress', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_priority as enum ('low', 'medium', 'high', 'urgent');
exception when duplicate_object then null; end $$;

-- 2) Профили пользователей (1:1 с auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  role user_role not null default 'employee',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- 3) Задачи
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  assignee_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  due_date date,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_assignee_idx on public.tasks(assignee_id);
create index if not exists tasks_due_idx on public.tasks(due_date);

-- 4) Триггер на updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

-- 5) Авто-создание профиля при регистрации
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'employee')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 6) Хелпер: текущий пользователь — админ?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- 7) RLS
alter table public.profiles enable row level security;
alter table public.tasks    enable row level security;

-- --- profiles policies ---
drop policy if exists "profiles: read all (authed)" on public.profiles;
create policy "profiles: read all (authed)" on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "profiles: self update" on public.profiles;
create policy "profiles: self update" on public.profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    -- запрет смены роли самому себе
    and role = (select role from public.profiles where id = auth.uid())
  );

drop policy if exists "profiles: admin update any" on public.profiles;
create policy "profiles: admin update any" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "profiles: admin delete" on public.profiles;
create policy "profiles: admin delete" on public.profiles
  for delete using (public.is_admin());

-- --- tasks policies ---
drop policy if exists "tasks: read all (authed)" on public.tasks;
create policy "tasks: read all (authed)" on public.tasks
  for select using (auth.role() = 'authenticated');

-- Создание задач: и сотрудники, и админы (created_by = auth.uid()).
drop policy if exists "tasks: insert authed" on public.tasks;
create policy "tasks: insert authed" on public.tasks
  for insert with check (auth.uid() = created_by);

-- Сотрудник может править свои задачи или задачи, назначенные на него,
-- но НЕ имеет права ставить статус 'done'. Админ может всё.
drop policy if exists "tasks: update by stakeholders (no done)" on public.tasks;
create policy "tasks: update by stakeholders (no done)" on public.tasks
  for update using (
    public.is_admin()
    or auth.uid() = created_by
    or auth.uid() = assignee_id
  ) with check (
    public.is_admin()
    or (
      status <> 'done'
      and (auth.uid() = created_by or auth.uid() = assignee_id)
    )
  );

-- Удалять может админ или автор
drop policy if exists "tasks: delete by admin or author" on public.tasks;
create policy "tasks: delete by admin or author" on public.tasks
  for delete using (public.is_admin() or auth.uid() = created_by);

-- 8) Realtime
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.profiles;
