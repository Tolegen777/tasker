import { useEffect } from 'react';
import {
  ActionIcon,
  Button,
  Group,
  Modal,
  MultiSelect,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { IconTrash } from '@tabler/icons-react';
import { useAuth } from '@/lib/auth';
import { useTasksStore } from '@/store/tasks';
import { useMeetingsStore } from '@/store/meetings';
import { DURATION_PRESETS, type MeetingWithRelations } from '@/types/db';

interface Props {
  opened: boolean;
  onClose: () => void;
  meeting: MeetingWithRelations | null;
  initialDate?: Date;
}

interface FormValues {
  title: string;
  description: string;
  location: string;
  starts_at: Date | null;
  duration_minutes: string; // храним как строку для Select
  participant_ids: string[];
}

function roundUpToNextHour(d = new Date()) {
  const r = new Date(d);
  r.setMinutes(0, 0, 0);
  r.setHours(r.getHours() + 1);
  return r;
}

export function MeetingModal({ opened, onClose, meeting, initialDate }: Props) {
  const { profile } = useAuth();
  const profiles = useTasksStore((s) => s.profiles);
  const isAdmin = profile?.role === 'admin';
  const createMeeting = useMeetingsStore((s) => s.createMeeting);
  const updateMeeting = useMeetingsStore((s) => s.updateMeeting);
  const deleteMeeting = useMeetingsStore((s) => s.deleteMeeting);

  const isEditing = !!meeting;
  const canEdit = !meeting || isAdmin || meeting.created_by === profile?.id;

  const form = useForm<FormValues>({
    initialValues: {
      title: '',
      description: '',
      location: '',
      starts_at: roundUpToNextHour(),
      duration_minutes: '30',
      participant_ids: [],
    },
    validate: {
      title: (v) => (v.trim().length < 2 ? 'Минимум 2 символа' : null),
      starts_at: (v) => (v ? null : 'Укажите дату и время'),
    },
  });

  useEffect(() => {
    if (meeting) {
      form.setValues({
        title: meeting.title,
        description: meeting.description ?? '',
        location: meeting.location ?? '',
        starts_at: new Date(meeting.starts_at),
        duration_minutes: String(meeting.duration_minutes),
        participant_ids: meeting.participants.map((p) => p.id),
      });
    } else {
      const base = initialDate ? new Date(initialDate) : roundUpToNextHour();
      // если передана только дата (без часов) — поставим 10:00
      if (initialDate && initialDate.getHours() === 0 && initialDate.getMinutes() === 0) {
        base.setHours(10, 0, 0, 0);
      }
      form.setValues({
        title: '',
        description: '',
        location: '',
        starts_at: base,
        duration_minutes: '30',
        participant_ids: [],
      });
    }
    form.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting, initialDate, opened]);

  const submit = form.onSubmit(async (values) => {
    if (!profile || !values.starts_at) return;
    try {
      const payload = {
        title: values.title.trim(),
        description: values.description.trim() || null,
        location: values.location.trim() || null,
        starts_at: values.starts_at.toISOString(),
        duration_minutes: Number(values.duration_minutes),
        participant_ids: values.participant_ids,
      };
      if (isEditing && meeting) {
        await updateMeeting(meeting.id, payload);
        notifications.show({ color: 'teal', message: 'Совещание обновлено' });
      } else {
        await createMeeting({ ...payload, created_by: profile.id });
        notifications.show({ color: 'teal', message: 'Совещание создано' });
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
    if (!meeting) return;
    modals.openConfirmModal({
      title: 'Удалить совещание?',
      children: <Text size="sm">Действие нельзя отменить.</Text>,
      labels: { confirm: 'Удалить', cancel: 'Отмена' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteMeeting(meeting.id);
          notifications.show({ color: 'teal', message: 'Совещание удалено' });
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

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={
        <Group gap="xs">
          <Text fw={700}>{isEditing ? 'Совещание' : 'Новое совещание'}</Text>
          {isEditing && canEdit && (
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
        <fieldset
          disabled={!canEdit}
          style={{ border: 0, padding: 0, margin: 0 }}
        >
          <Stack>
            <TextInput
              label="Тема"
              placeholder="Что обсуждаем?"
              data-autofocus
              {...form.getInputProps('title')}
            />
            <Textarea
              label="Повестка / описание"
              placeholder="Что нужно решить, какие материалы посмотреть…"
              minRows={3}
              autosize
              {...form.getInputProps('description')}
            />
            <Group grow>
              <DateTimePicker
                label="Дата и время"
                valueFormat="D MMMM YYYY, HH:mm"
                clearable={false}
                {...form.getInputProps('starts_at')}
              />
              <Select
                label="Длительность"
                data={DURATION_PRESETS.map((p) => ({
                  value: String(p.value),
                  label: p.label,
                }))}
                {...form.getInputProps('duration_minutes')}
              />
            </Group>
            <TextInput
              label="Место или ссылка"
              placeholder="Zoom / Meet ссылка, переговорка, адрес…"
              {...form.getInputProps('location')}
            />
            <MultiSelect
              label="Участники"
              placeholder="Выберите коллег"
              data={profiles.map((p) => ({
                value: p.id,
                label: p.full_name || p.email || p.id,
              }))}
              searchable
              clearable
              {...form.getInputProps('participant_ids')}
            />
            {canEdit && (
              <Group justify="flex-end" mt="sm">
                <Button variant="default" onClick={onClose}>
                  Отмена
                </Button>
                <Button type="submit">{isEditing ? 'Сохранить' : 'Создать'}</Button>
              </Group>
            )}
            {!canEdit && (
              <Text size="xs" c="dimmed" ta="center">
                Редактировать может только автор совещания или администратор.
              </Text>
            )}
          </Stack>
        </fieldset>
      </form>
    </Modal>
  );
}
