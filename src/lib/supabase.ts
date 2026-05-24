import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
// Supabase Connect отдаёт ключ как VITE_SUPABASE_PUBLISHABLE_KEY,
// старое имя — VITE_SUPABASE_ANON_KEY. Поддерживаем оба.
const anonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Supabase] Не заданы VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY (или VITE_SUPABASE_ANON_KEY). Скопируйте .env.example в .env.local и заполните.'
  );
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
