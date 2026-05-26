import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconUsers,
} from '@tabler/icons-react';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/ru';
import isoWeek from 'dayjs/plugin/isoWeek';
import { useTasksStore } from '@/store/tasks';
import { useMeetingsStore } from '@/store/meetings';
import {
  PRIORITY_COLOR,
  type MeetingWithRelations,
  type TaskWithRelations,
} from '@/types/db';
import { TaskModal } from '@/components/TaskModal';
import { MeetingModal } from '@/components/MeetingModal';

dayjs.extend(isoWeek);
dayjs.locale('ru');

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function CalendarPage() {
  const { tasks, loaded: tasksLoaded, load: loadTasks, subscribe: subTasks } = useTasksStore();
  const {
    meetings,
    loaded: meetingsLoaded,
    load: loadMeetings,
    subscribe: subMeetings,
  } = useMeetingsStore();

  const [cursor, setCursor] = useState<Dayjs>(dayjs().startOf('month'));
  const [taskModalTask, setTaskModalTask] = useState<TaskWithRelations | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [meetingModalMeeting, setMeetingModalMeeting] =
    useState<MeetingWithRelations | null>(null);
  const [meetingInitDate, setMeetingInitDate] = useState<Date | undefined>(undefined);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);

  useEffect(() => {
    if (!tasksLoaded) void loadTasks();
    if (!meetingsLoaded) void loadMeetings();
    const u1 = subTasks();
    const u2 = subMeetings();
    return () => {
      u1();
      u2();
    };
  }, [tasksLoaded, meetingsLoaded, loadTasks, loadMeetings, subTasks, subMeetings]);

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

  const meetingsByDay = useMemo(() => {
    const map = new Map<string, MeetingWithRelations[]>();
    meetings.forEach((m) => {
      const key = dayjs(m.starts_at).format('YYYY-MM-DD');
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    });
    // сортируем по времени начала внутри дня
    map.forEach((arr) =>
      arr.sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))
    );
    return map;
  }, [meetings]);

  const openNewMeeting = (date?: Date) => {
    setMeetingModalMeeting(null);
    setMeetingInitDate(date);
    setMeetingModalOpen(true);
  };

  if (!tasksLoaded || !meetingsLoaded) {
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
          <Button
            size="xs"
            variant="subtle"
            onClick={() => setCursor(dayjs().startOf('month'))}
          >
            Сегодня
          </Button>
        </Group>
        <Button
          leftSection={<IconPlus size={16} />}
          color="teal"
          onClick={() => openNewMeeting()}
        >
          Новое совещание
        </Button>
      </Group>

      <Group gap="md" wrap="wrap">
        <Group gap={6}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: 'var(--mantine-color-violet-6)',
            }}
          />
          <Text size="xs" c="dimmed">
            задача (срок)
          </Text>
        </Group>
        <Group gap={6}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: 'var(--mantine-color-teal-6)',
            }}
          />
          <Text size="xs" c="dimmed">
            совещание
          </Text>
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
            const tItems = tasksByDay.get(key) ?? [];
            const mItems = meetingsByDay.get(key) ?? [];
            const total = tItems.length + mItems.length;
            const SHOW = 3;

            return (
              <div
                key={key}
                className={`calendar-day ${isToday ? 'is-today' : ''} ${isOutside ? 'is-outside' : ''}`}
              >
                <Group justify="space-between" wrap="nowrap" gap={4}>
                  <span className="calendar-day-num">{d.format('D')}</span>
                  <Tooltip label="Создать совещание в этот день">
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      color="teal"
                      onClick={() => openNewMeeting(d.startOf('day').toDate())}
                    >
                      <IconPlus size={12} />
                    </ActionIcon>
                  </Tooltip>
                </Group>

                <Stack gap={4}>
                  {/* Совещания сверху — у них есть конкретное время */}
                  {mItems.slice(0, SHOW).map((m) => (
                    <Tooltip
                      key={m.id}
                      label={`${dayjs(m.starts_at).format('HH:mm')} · ${m.title}`}
                      withArrow
                    >
                      <div
                        className="calendar-chip"
                        onClick={() => {
                          setMeetingModalMeeting(m);
                          setMeetingModalOpen(true);
                        }}
                        style={{
                          background: 'var(--mantine-color-teal-light)',
                          color: 'var(--mantine-color-teal-light-color)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <IconUsers size={11} stroke={2.5} />
                        <span style={{ fontWeight: 600 }}>
                          {dayjs(m.starts_at).format('HH:mm')}
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.title}
                        </span>
                      </div>
                    </Tooltip>
                  ))}

                  {/* Задачи под совещаниями */}
                  {tItems
                    .slice(0, Math.max(0, SHOW - mItems.slice(0, SHOW).length))
                    .map((t) => (
                      <Tooltip key={t.id} label={t.title} withArrow>
                        <div
                          className="calendar-chip"
                          onClick={() => {
                            setTaskModalTask(t);
                            setTaskModalOpen(true);
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

                  {total > SHOW && (
                    <Text size="xs" c="dimmed">
                      +{total - SHOW} ещё
                    </Text>
                  )}
                </Stack>
              </div>
            );
          })}
        </Box>
      </Paper>

      <TaskModal
        opened={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        task={taskModalTask}
      />
      <MeetingModal
        opened={meetingModalOpen}
        onClose={() => setMeetingModalOpen(false)}
        meeting={meetingModalMeeting}
        initialDate={meetingInitDate}
      />
    </Stack>
  );
}
