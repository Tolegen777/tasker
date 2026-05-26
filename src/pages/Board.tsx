import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Center,
  Group,
  Loader,
  ScrollArea,
  SegmentedControl,
  Stack,
  TextInput,
} from '@mantine/core';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconSearch, IconUsers } from '@tabler/icons-react';
import { useAuth } from '@/lib/auth';
import { useTasksStore } from '@/store/tasks';
import { useMeetingsStore } from '@/store/meetings';
import { STATUS_LABEL, type TaskStatus, type TaskWithRelations } from '@/types/db';
import { KanbanColumn } from '@/components/KanbanColumn';
import { TaskCard } from '@/components/TaskCard';
import { TaskModal } from '@/components/TaskModal';
import { MeetingModal } from '@/components/MeetingModal';

const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'done'];

export default function BoardPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const { tasks, loaded, load, subscribe, updateTask } = useTasksStore();
  const loadMeetings = useMeetingsStore((s) => s.load);
  const subMeetings = useMeetingsStore((s) => s.subscribe);
  const meetingsLoaded = useMeetingsStore((s) => s.loaded);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modalTask, setModalTask] = useState<TaskWithRelations | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitStatus, setModalInitStatus] = useState<TaskStatus>('todo');
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterAssignee, setFilterAssignee] = useState<'all' | 'mine'>('all');

  useEffect(() => {
    if (!loaded) void load();
    if (!meetingsLoaded) void loadMeetings();
    const unsub = subscribe();
    const unsubM = subMeetings();
    return () => {
      unsub();
      unsubM();
    };
  }, [load, subscribe, loaded, loadMeetings, subMeetings, meetingsLoaded]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (filterAssignee === 'mine' && t.assignee_id !== profile?.id) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [tasks, search, filterAssignee, profile?.id]);

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, TaskWithRelations[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    filtered
      .slice()
      .sort((a, b) => a.position - b.position)
      .forEach((t) => map[t.status].push(t));
    return map;
  }, [filtered]);

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;

    let targetStatus: TaskStatus | null = null;
    const overData = over.data.current;
    if (overData?.type === 'column') targetStatus = overData.status as TaskStatus;
    else if (overData?.type === 'task') targetStatus = overData.status as TaskStatus;

    if (!targetStatus || targetStatus === task.status) return;

    if (targetStatus === 'done' && !isAdmin) {
      notifications.show({
        color: 'red',
        title: 'Нет прав',
        message: 'Только администратор может переводить задачи в «Завершено».',
      });
      return;
    }

    try {
      const maxPos = Math.max(
        0,
        ...tasks.filter((t) => t.status === targetStatus).map((t) => t.position)
      );
      await updateTask(task.id, { status: targetStatus, position: maxPos + 1 });
    } catch (err: unknown) {
      notifications.show({
        color: 'red',
        title: 'Ошибка',
        message: err instanceof Error ? err.message : 'Не удалось переместить задачу',
      });
    }
  };

  const openCreate = (status: TaskStatus) => {
    if (status === 'done' && !isAdmin) return;
    setModalTask(null);
    setModalInitStatus(status);
    setModalOpen(true);
  };

  const openTask = (t: TaskWithRelations) => {
    setModalTask(t);
    setModalOpen(true);
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  if (!loaded) {
    return (
      <Center mih={300}>
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Group gap="sm" wrap="wrap" style={{ flex: 1 }}>
          <TextInput
            placeholder="Поиск по задачам"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            w={260}
          />
          <SegmentedControl
            value={filterAssignee}
            onChange={(v) => setFilterAssignee(v as 'all' | 'mine')}
            data={[
              { value: 'all', label: 'Все' },
              { value: 'mine', label: 'Мои' },
            ]}
          />
        </Group>
        <Group gap="xs">
          <Button
            variant="default"
            leftSection={<IconUsers size={16} />}
            onClick={() => setMeetingModalOpen(true)}
          >
            Новое совещание
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => openCreate('todo')}
          >
            Новая задача
          </Button>
        </Group>
      </Group>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <ScrollArea offsetScrollbars>
          <Group align="stretch" gap="md" wrap="nowrap" style={{ minWidth: 'min-content' }}>
            {COLUMNS.map((s) => (
              <KanbanColumn
                key={s}
                status={s}
                tasks={byStatus[s]}
                onOpenTask={openTask}
                onAdd={openCreate}
                addDisabled={s === 'done' && !isAdmin}
                addDisabledReason={
                  s === 'done' && !isAdmin
                    ? `Только администратор может добавлять в «${STATUS_LABEL.done}»`
                    : undefined
                }
              />
            ))}
          </Group>
        </ScrollArea>
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} onOpen={() => {}} /> : null}
        </DragOverlay>
      </DndContext>

      <TaskModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        task={modalTask}
        initialStatus={modalInitStatus}
      />
      <MeetingModal
        opened={meetingModalOpen}
        onClose={() => setMeetingModalOpen(false)}
        meeting={null}
      />
    </Stack>
  );
}
