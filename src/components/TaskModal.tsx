import { useEffect } from 'react';
import {
  ActionIcon,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { IconTrash } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useAuth } from '@/lib/auth';
import { useTasksStore } from '@/store/tasks';
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  type TaskPriority,
  type TaskStatus,
  type TaskWithRelations,
} from '@/types/db';

interface Props {
  opened: boolean;
  onClose: () => void;
  task: TaskWithRelations | null;
  initialStatus?: TaskStatus;
}

interface FormValues {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  due_date: Date | null;
}

export function TaskModal({ opened, onClose, task, initialStatus }: Props) {
  const { profile } = useAuth();
  const profiles = useTasksStore((s) => s.profiles);
  const createTask = useTasksStore((s) => s.createTask);
  const updateTask = useTasksStore((s) => s.updateTask);
  const deleteTask = useTasksStore((s) => s.deleteTask);

  const isAdmin = profile?.role === 'admin';
  const isEditing = !!task;
  // Сотрудник не может ставить статус "done"
  const canSetDone = isAdmin;

  const form = useForm<FormValues>({
    initialValues: {
      title: '',
      description: '',
      status: initialStatus ?? 'todo',
      priority: 'medium',
      assignee_id: null,
      due_date: null,
    },
    validate: {
      title: (v) => (v.trim().length < 2 ? 'Минимум 2 символа' : null),
    },
  });

  useEffect(() => {
    if (task) {
      form.setValues({
        title: task.title,
        description: task.description ?? '',
        status: task.status,
        priority: task.priority,
        assignee_id: task.assignee_id,
        due_date: task.due_date ? new Date(task.due_date) : null,
      });
    } else {
      form.setValues({
        title: '',
        description: '',
        status: initialStatus ?? 'todo',
        priority: 'medium',
        assignee_id: null,
        due_date: null,
      });
    }
    form.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, initialStatus, opened]);

  const submit = form.onSubmit(async (values) => {
    try {
      if (!canSetDone && values.status === 'done') {
        notifications.show({
          color: 'red',
          title: 'Нет прав',
          message: 'Только администратор может ставить статус «Завершено».',
        });
        return;
      }
      const payload = {
        title: values.title.trim(),
        description: values.description.trim() || null,
        status: values.status,
        priority: values.priority,
        assignee_id: values.assignee_id,
        due_date: values.due_date ? dayjs(values.due_date).format('YYYY-MM-DD') : null,
      };

      if (isEditing && task) {
        await updateTask(task.id, payload);
        notifications.show({ color: 'teal', message: 'Задача обновлена' });
      } else {
        if (!profile) return;
        await createTask({ ...payload, created_by: profile.id });
        notifications.show({ color: 'teal', message: 'Задача создана' });
      }
      onClose();
    } catch (e: unknown) {
      notifications.show({
        color: 'red',
        title: 'Ошибка',
        message: e instanceof Error ? e.message : 'Не удалось сохранить',
      });
    }
  });

  const confirmDelete = () => {
    if (!task) return;
    modals.openConfirmModal({
      title: 'Удалить задачу?',
      children: <Text size="sm">Действие нельзя отменить.</Text>,
      labels: { confirm: 'Удалить', cancel: 'Отмена' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteTask(task.id);
          notifications.show({ color: 'teal', message: 'Задача удалена' });
          onClose();
        } catch (e: unknown) {
          notifications.show({
            color: 'red',
            title: 'Ошибка',
            message: e instanceof Error ? e.message : 'Не удалось удалить',
          });
        }
      },
    });
  };

  const statusOptions = (Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => ({
    value: s,
    label: STATUS_LABEL[s],
    disabled: s === 'done' && !canSetDone,
  }));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={
        <Group gap="xs">
          <Text fw={700}>{isEditing ? 'Задача' : 'Новая задача'}</Text>
          {isEditing && (
            <Tooltip label="Удалить">
              <ActionIcon variant="subtle" color="red" onClick={confirmDelete}>
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      }
    >
      <form onSubmit={submit}>
        <Stack>
          <TextInput
            label="Название"
            placeholder="Что нужно сделать?"
            data-autofocus
            {...form.getInputProps('title')}
          />
          <Textarea
            label="Описание"
            placeholder="Детали, ссылки, контекст…"
            minRows={3}
            autosize
            {...form.getInputProps('description')}
          />
          <Group grow>
            <Select
              label="Статус"
              data={statusOptions}
              {...form.getInputProps('status')}
            />
            <Select
              label="Приоритет"
              data={(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((p) => ({
                value: p,
                label: PRIORITY_LABEL[p],
              }))}
              {...form.getInputProps('priority')}
            />
          </Group>
          <Group grow>
            <Select
              label="Исполнитель"
              placeholder="Не назначен"
              data={profiles.map((p) => ({ value: p.id, label: p.full_name || p.email || p.id }))}
              clearable
              searchable
              {...form.getInputProps('assignee_id')}
            />
            <DateInput
              label="Срок"
              placeholder="Без срока"
              clearable
              valueFormat="D MMMM YYYY"
              {...form.getInputProps('due_date')}
            />
          </Group>
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit">{isEditing ? 'Сохранить' : 'Создать'}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
