import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Center,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/ru';
import isoWeek from 'dayjs/plugin/isoWeek';
import { useTasksStore } from '@/store/tasks';
import { PRIORITY_COLOR, type TaskWithRelations } from '@/types/db';
import { TaskModal } from '@/components/TaskModal';

dayjs.extend(isoWeek);
dayjs.locale('ru');

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function CalendarPage() {
  const { tasks, loaded, load, subscribe } = useTasksStore();
  const [cursor, setCursor] = useState<Dayjs>(dayjs().startOf('month'));
  const [modalTask, setModalTask] = useState<TaskWithRelations | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!loaded) void load();
    const unsub = subscribe();
    return unsub;
  }, [loaded, load, subscribe]);

  const cells = useMemo(() => {
    const start = cursor.startOf('month').startOf('isoWeek');
    const end = cursor.endOf('month').endOf('isoWeek');
    const days: Dayjs[] = [];
    let d = start;
    while (d.isBefore(end) || d.isSame(end, 'day')) {
      days.push(d);
      d = d.add(1, 'day');
    }
    return days;
  }, [cursor]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, TaskWithRelations[]>();
    tasks.forEach((t) => {
      if (!t.due_date) return;
      const key = dayjs(t.due_date).format('YYYY-MM-DD');
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    });
    return map;
  }, [tasks]);

  if (!loaded) {
    return (
      <Center mih={300}>
        <Loader />
      </Center>
    );
  }

  const today = dayjs();

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap">
        <Group gap="xs">
          <ActionIcon
            variant="default"
            size="lg"
            onClick={() => setCursor(cursor.subtract(1, 'month'))}
          >
            <IconChevronLeft size={18} />
          </ActionIcon>
          <Text fw={700} size="lg" tt="capitalize" miw={180} ta="center">
            {cursor.format('MMMM YYYY')}
          </Text>
          <ActionIcon
            variant="default"
            size="lg"
            onClick={() => setCursor(cursor.add(1, 'month'))}
          >
            <IconChevronRight size={18} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            onClick={() => setCursor(dayjs().startOf('month'))}
            title="Сегодня"
          >
            <Badge variant="light">Сегодня</Badge>
          </ActionIcon>
        </Group>
      </Group>

      <Paper className="glass" p="md" radius="lg">
        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: 8,
            marginBottom: 8,
          }}
        >
          {WEEKDAYS.map((d) => (
            <Text key={d} size="xs" c="dimmed" fw={600} ta="center">
              {d}
            </Text>
          ))}
        </Box>
        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: 8,
          }}
        >
          {cells.map((d) => {
            const key = d.format('YYYY-MM-DD');
            const isOutside = d.month() !== cursor.month();
            const isToday = d.isSame(today, 'day');
            const items = tasksByDay.get(key) ?? [];
            return (
              <div
                key={key}
                className={`calendar-day ${isToday ? 'is-today' : ''} ${isOutside ? 'is-outside' : ''}`}
              >
                <div className="calendar-day-num">{d.format('D')}</div>
                <Stack gap={4}>
                  {items.slice(0, 3).map((t) => (
                    <Tooltip key={t.id} label={t.title} withArrow>
                      <div
                        className="calendar-chip"
                        onClick={() => {
                          setModalTask(t);
                          setModalOpen(true);
                        }}
                        style={{
                          background: `var(--mantine-color-${PRIORITY_COLOR[t.priority]}-light)`,
                          color: `var(--mantine-color-${PRIORITY_COLOR[t.priority]}-light-color)`,
                        }}
                      >
                        {t.title}
                      </div>
                    </Tooltip>
                  ))}
                  {items.length > 3 && (
                    <Text size="xs" c="dimmed">
                      +{items.length - 3} ещё
                    </Text>
                  )}
                </Stack>
              </div>
            );
          })}
        </Box>
      </Paper>

      <TaskModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        task={modalTask}
      />
    </Stack>
  );
}
