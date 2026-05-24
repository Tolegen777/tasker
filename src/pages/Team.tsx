import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Card,
  Center,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSearch } from '@tabler/icons-react';
import { useAuth } from '@/lib/auth';
import { useTasksStore } from '@/store/tasks';
import { supabase } from '@/lib/supabase';
import { ROLE_LABEL, type Role } from '@/types/db';

export default function TeamPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { profiles, loaded, load, subscribe, tasks } = useTasksStore();
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!loaded) void load();
    const unsub = subscribe();
    return unsub;
  }, [loaded, load, subscribe]);

  const counts = useMemo(() => {
    const map = new Map<string, { todo: number; in_progress: number; done: number }>();
    tasks.forEach((t) => {
      if (!t.assignee_id) return;
      const c = map.get(t.assignee_id) ?? { todo: 0, in_progress: 0, done: 0 };
      c[t.status] += 1;
      map.set(t.assignee_id, c);
    });
    return map;
  }, [tasks]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return profiles;
    return profiles.filter(
      (p) =>
        (p.full_name ?? '').toLowerCase().includes(s) ||
        (p.email ?? '').toLowerCase().includes(s)
    );
  }, [profiles, q]);

  const changeRole = async (id: string, role: Role) => {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
    if (error) {
      notifications.show({ color: 'red', title: 'Ошибка', message: error.message });
    } else {
      notifications.show({ color: 'teal', message: 'Роль обновлена' });
    }
  };

  if (!loaded) {
    return (
      <Center mih={300}>
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <Group>
        <TextInput
          placeholder="Поиск сотрудника"
          leftSection={<IconSearch size={16} />}
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          w={300}
        />
        <Badge variant="light">{filtered.length} чел.</Badge>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {filtered.map((p) => {
          const c = counts.get(p.id) ?? { todo: 0, in_progress: 0, done: 0 };
          return (
            <Card key={p.id} className="glass" padding="lg" radius="lg">
              <Group wrap="nowrap" align="flex-start">
                <Avatar
                  src={p.avatar_url ?? undefined}
                  size={56}
                  radius="xl"
                  color="violet"
                >
                  {(p.full_name || p.email || '?').slice(0, 1).toUpperCase()}
                </Avatar>
                <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                  <Group justify="space-between" wrap="nowrap">
                    <Text fw={700} truncate>
                      {p.full_name || '(без имени)'}
                    </Text>
                    <Badge
                      color={p.role === 'admin' ? 'violet' : 'gray'}
                      variant="light"
                    >
                      {ROLE_LABEL[p.role]}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed" truncate>
                    {p.email}
                  </Text>
                  <Group gap="xs" mt={6}>
                    <Badge color="blue" variant="light">К работе: {c.todo}</Badge>
                    <Badge color="yellow" variant="light">В процессе: {c.in_progress}</Badge>
                    <Badge color="teal" variant="light">Готово: {c.done}</Badge>
                  </Group>
                </Stack>
              </Group>

              {isAdmin && p.id !== profile?.id && (
                <Select
                  mt="md"
                  label="Роль"
                  value={p.role}
                  onChange={(v) => v && changeRole(p.id, v as Role)}
                  data={[
                    { value: 'employee', label: ROLE_LABEL.employee },
                    { value: 'admin', label: ROLE_LABEL.admin },
                  ]}
                />
              )}
            </Card>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}
