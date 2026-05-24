# Tasker — командный таск-трекер

Аналог Jira/Asana без своего бэкенда. Канбан + календарь, две роли (админ/сотрудник),
адаптивная вёрстка, реалтайм-обновления, классная тёмная/светлая тема.

**Стек:** Vite + React 19 + TypeScript • Mantine 9 • React Router 7 • Supabase
(Postgres + Auth + RLS + Realtime) • dnd-kit • Zustand • dayjs.

---

## 1. Создать проект в Supabase

1. Зайдите на [supabase.com](https://supabase.com), создайте новый проект.
2. В разделе **SQL Editor** откройте новый запрос, вставьте содержимое файла
   `supabase/schema.sql` целиком и нажмите **Run**.
3. В **Authentication → Providers** убедитесь, что включён `Email`.
   - Для удобства разработки выключите подтверждение email:
     `Authentication → Sign In / Up → Email → Confirm email = OFF`.
4. В **Project Settings → API** скопируйте:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` ключ → `VITE_SUPABASE_ANON_KEY`

## 2. Локальный запуск

```bash
cp .env.example .env.local       # вставьте ключи из шага 1.4
npm install
npm run dev
```

Откройте `http://localhost:5173`.

## 3. Первый администратор

При регистрации можно выбрать роль `Администратор` — удобно для первого аккаунта.
Дальше роли выдавайте через интерфейс на странице «Команда». На уровне БД смена
роли защищена RLS — пользователь не может повысить себя сам.

## 4. Деплой на Vercel

Импортируйте репозиторий в Vercel, добавьте переменные окружения
`VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` — деплой пройдёт автоматически.

## Возможности

- 🗂 **Канбан** с тремя колонками: *Нужно сделать*, *В процессе*, *Завершено*.
- 🔒 **Роли:** только администратор переводит задачи в *Завершено* и меняет роли.
  Контроль и в UI, и в БД (Postgres RLS).
- 🧲 **Drag-and-drop** между колонками (dnd-kit).
- 📅 **Календарь** — месячный вид задач по `due_date`, как в Bitrix.
- ⚡️ **Realtime** — карточки обновляются у всех мгновенно.
- 🌗 Светлая/тёмная тема, адаптив (мобильный бургер-сайдбар).
- 👥 **Команда** — список сотрудников со счётчиками задач.

## Структура

```
src/
├── components/   Layout, KanbanColumn, TaskCard, TaskModal
├── pages/        Login, Board, Calendar, Team, Profile
├── lib/          supabase client, auth context
├── store/        zustand store с realtime
├── types/        типы БД и i18n-метки
├── styles/       глобальные стили (aurora-фон, glass)
└── theme.ts      Mantine theme
supabase/
└── schema.sql    схема + RLS + триггеры
```

## Где править что

- Колонки/статусы → `src/types/db.ts` (`STATUS_LABEL`).
- Тема и цвета → `src/theme.ts` и `src/styles/global.css`.
- Правила доступа → `supabase/schema.sql` (политики RLS).
