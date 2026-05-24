import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Anchor,
  Badge,
  Button,
  Center,
  Container,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconChecks, IconShieldLock } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';

export default function AdminSignupPage() {
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: { email: '', password: '', full_name: '' },
    validate: {
      email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Введите корректный email'),
      password: (v) => (v.length >= 8 ? null : 'Минимум 8 символов'),
      full_name: (v) => (v.trim().length < 2 ? 'Укажите имя' : null),
    },
  });

  const submit = form.onSubmit(async (values) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { full_name: values.full_name.trim(), role: 'admin' },
        },
      });
      if (error) throw error;
      notifications.show({
        title: 'Администратор создан',
        message: 'Аккаунт с правами администратора зарегистрирован. Можно войти.',
        color: 'teal',
        icon: <IconChecks size={18} />,
      });
      form.reset();
    } catch (e: unknown) {
      notifications.show({
        color: 'red',
        title: 'Ошибка',
        message: e instanceof Error ? e.message : 'Не удалось создать аккаунт',
      });
    } finally {
      setLoading(false);
    }
  });

  return (
    <Center mih="100vh" px="md">
      <Container size={460} w="100%">
        <Stack align="center" mb="xl" gap={6}>
          <Group gap={10} align="center">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #7c5cff 0%, #f472b6 100%)',
                display: 'grid',
                placeItems: 'center',
                color: 'white',
              }}
            >
              <IconShieldLock size={22} />
            </div>
            <Title order={2}>Tasker</Title>
          </Group>
          <Badge color="violet" variant="light" size="lg">
            Регистрация администратора
          </Badge>
          <Text c="dimmed" size="sm" ta="center" maw={360}>
            По этой ссылке создаётся аккаунт с правами администратора.
            Не передавайте ссылку посторонним.
          </Text>
        </Stack>

        <Paper className="glass" p="xl" radius="lg">
          <form onSubmit={submit}>
            <Stack>
              <TextInput
                label="Имя и фамилия"
                placeholder="Иван Иванов"
                {...form.getInputProps('full_name')}
              />
              <TextInput
                label="Email"
                placeholder="admin@company.com"
                {...form.getInputProps('email')}
              />
              <PasswordInput
                label="Пароль"
                placeholder="Минимум 8 символов"
                {...form.getInputProps('password')}
              />
              <Button type="submit" size="md" loading={loading} mt="xs">
                Создать администратора
              </Button>
            </Stack>
          </form>
          <Text size="xs" c="dimmed" mt="lg" ta="center">
            Уже есть аккаунт?{' '}
            <Anchor size="xs" component={RouterLink} to="/login">
              Войти
            </Anchor>
          </Text>
        </Paper>
      </Container>
    </Center>
  );
}
