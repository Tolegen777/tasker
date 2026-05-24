import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Avatar, Badge, Card, Group, Stack, Text, Tooltip } from '@mantine/core';
import { IconCalendarEvent } from '@tabler/icons-react';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import {
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  type TaskWithRelations,
} from '@/types/db';

dayjs.locale('ru');

interface Props {
  task: TaskWithRelations;
  onOpen: (task: TaskWithRelations) => void;
}

export function TaskCard({ task, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { type: 'task', status: task.status } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const due = task.due_date ? dayjs(task.due_date) : null;
  const overdue = due && due.isBefore(dayjs(), 'day') && task.status !== 'done';

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`task-card ${isDragging ? 'dragging' : ''}`}
      withBorder
      shadow="sm"
      padding="md"
      onClick={() => onOpen(task)}
      {...attributes}
      {...listeners}
    >
      <Stack gap={8}>
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Text fw={600} size="sm" lineClamp={2} style={{ flex: 1 }}>
            {task.title}
          </Text>
          <Badge
            color={PRIORITY_COLOR[task.priority]}
            variant="light"
            size="xs"
            radius="sm"
          >
            {PRIORITY_LABEL[task.priority]}
          </Badge>
        </Group>

        {task.description && (
          <Text size="xs" c="dimmed" lineClamp={2}>
            {task.description}
          </Text>
        )}

        <Group justify="space-between" mt={6}>
          <Group gap={6}>
            {due && (
              <Badge
                size="xs"
                variant={overdue ? 'filled' : 'light'}
                color={overdue ? 'red' : 'gray'}
                leftSection={<IconCalendarEvent size={11} />}
              >
                {due.format('D MMM')}
              </Badge>
            )}
          </Group>
          {task.assignee && (
            <Tooltip label={task.assignee.full_name}>
              <Avatar
                src={task.assignee.avatar_url ?? undefined}
                radius="xl"
                color="violet"
                size={24}
              >
                {(task.assignee.full_name || '?').slice(0, 1).toUpperCase()}
              </Avatar>
            </Tooltip>
          )}
        </Group>
      </Stack>
    </Card>
  );
}
