import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ActionIcon, Badge, Group, Paper, ScrollArea, Stack, Text, Tooltip } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { TaskCard } from './TaskCard';
import { STATUS_LABEL, type TaskStatus, type TaskWithRelations } from '@/types/db';

interface Props {
  status: TaskStatus;
  tasks: TaskWithRelations[];
  onOpenTask: (t: TaskWithRelations) => void;
  onAdd: (s: TaskStatus) => void;
  addDisabled?: boolean;
  addDisabledReason?: string;
}

const ACCENT: Record<TaskStatus, string> = {
  todo: 'blue',
  in_progress: 'yellow',
  done: 'teal',
};

export function KanbanColumn({
  status,
  tasks,
  onOpenTask,
  onAdd,
  addDisabled,
  addDisabledReason,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${status}`, data: { type: 'column', status } });
  const ids = tasks.map((t) => t.id);

  return (
    <Paper
      ref={setNodeRef}
      className={`glass ${isOver ? 'column-drop-active' : ''}`}
      p="md"
      radius="lg"
      style={{ minWidth: 300, flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <Group gap={8}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: `var(--mantine-color-${ACCENT[status]}-6)`,
              display: 'inline-block',
            }}
          />
          <Text fw={700}>{STATUS_LABEL[status]}</Text>
          <Badge variant="light" color="gray" size="sm">
            {tasks.length}
          </Badge>
        </Group>
        <Tooltip label={addDisabled ? addDisabledReason : 'Добавить задачу'} disabled={!addDisabled && false}>
          <ActionIcon
            variant="subtle"
            onClick={() => onAdd(status)}
            disabled={addDisabled}
            aria-label="add task"
          >
            <IconPlus size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <ScrollArea.Autosize mah="calc(100vh - 230px)" type="hover" className="kanban-scroller">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <Stack gap="sm" pb={8}>
            {tasks.map((t) => (
              <TaskCard key={t.id} task={t} onOpen={onOpenTask} />
            ))}
            {tasks.length === 0 && (
              <Text size="sm" c="dimmed" ta="center" py="md">
                Пока пусто
              </Text>
            )}
          </Stack>
        </SortableContext>
      </ScrollArea.Autosize>
    </Paper>
  );
}
