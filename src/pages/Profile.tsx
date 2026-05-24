import { useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { ROLE_LABEL } from '@/types/db';

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [saving, setSaving] = useState(false);

  if (!profile) return null;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), avatar_url: avatarUrl.trim() || null })
      .eq('id', profile.id);
    setSaving(false);
    if (error) {
      notifications.show({ color: 'red', title: 'Ошибка', message: error.message });
    } else {
      await refreshProfile();
      notifications.show({ color: 'teal', message: 'Профиль обновлён' });
    }
  };

  return (
    <Card className="glass" p="xl" radius="lg" maw={520}>
      <Group mb="lg">
        <Avatar src={avatarUrl || undefined} size={64} radius="xl" color="violet">
          {(fullName || profile.email || '?').slice(0, 1).toUpperCase()}
        </Avatar>
        <Stack gap={2}>
          <Text fw={700} size="lg">
            {profile.full_name || '(без имени)'}
          </Text>
          <Text size="sm" c="dimmed">
            {profile.email}
          </Text>
          <Badge mt={4} color={profile.role === 'admin' ? 'violet' : 'gray'} variant="light">
            {ROLE_LABEL[profile.role]}
          </Badge>
        </Stack>
      </Group>

      <Stack>
        <TextInput
          label="Имя"
          value={fullName}
          onChange={(e) => setFullName(e.currentTarget.value)}
        />
        <TextInput
          label="Ссылка на аватар"
          placeholder="https://…/avatar.png"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button onClick={save} loading={saving}>
            Сохранить
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
