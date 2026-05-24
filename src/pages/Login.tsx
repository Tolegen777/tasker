import { useState } from 'react';
import {
  Anchor,
  Button,
  Center,
  Container,
  Group,
  Paper,
  PasswordInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconChecks } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';

type Mode = 'sign-in' | 'sign-up';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      full_name: '',
    },
    validate: {
      email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Введите корректный email'),
      password: (v) => (v.length >= 6 ? null : 'Минимум 6 символов'),
      full_name: (v) =>
        mode === 'sign-up' && v.trim().length < 2 ? 'Укажите имя' : null,
    },
  });

  const submit = form.onSubmit(async (values) => {
    setLoading(true);
    try {
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: { full_name: values.full_name, role: 'employee' },
          },
        });
        if (error) throw error;
        notifications.show({
          title: 'Аккаунт создан',
          message: 'Проверьте почту для подтверждения, либо войдите сразу.',
          color: 'teal',
          icon: <IconChecks size={18} />,
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Что-то пошло не так';
      notifications.show({ color: 'red', title: 'Ошибка', message: msg });
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
                background:
                  'linear-gradient(135deg, #7c5cff 0%, #22d3ee 100%)',
                display: 'grid',
                placeItems: 'center',
                color: 'white',
                fontWeight: 800,
                fontSize: 22,
              }}
            >
              T
            </div>
            <Title order={2}>Tasker</Title>
          </Group>
          <Text c="dimmed" size="sm">
            Командные задачи без боли
          </Text>
        </Stack>

        <Paper className="glass" p="xl" radius="lg">
          <SegmentedControl
            fullWidth
            value={mode}
            onChange={(v) => setMode(v as Mode)}
            data={[
              { value: 'sign-in', label: 'Вход' },
              { value: 'sign-up', label: 'Регистрация' },
            ]}
            mb="lg"
          />

          <form onSubmit={submit}>
            <Stack>
              {mode === 'sign-up' && (
                <TextInput
                  label="Имя и фамилия"
                  placeholder="Иван Иванов"
                  {...form.getInputProps('full_name')}
                />
              )}
              <TextInput
                label="Email"
                placeholder="you@company.com"
                {...form.getInputProps('email')}
              />
              <PasswordInput
                label="Пароль"
                placeholder="Минимум 6 символов"
                {...form.getInputProps('password')}
              />
              <Button type="submit" size="md" loading={loading} mt="xs">
                {mode === 'sign-in' ? 'Войти' : 'Создать аккаунт'}
              </Button>
            </Stack>
          </form>

          <Text size="xs" c="dimmed" mt="lg" ta="center">
            {mode === 'sign-in' ? 'Ещё нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
            <Anchor
              size="xs"
              onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
            >
              {mode === 'sign-in' ? 'Зарегистрируйтесь' : 'Войти'}
            </Anchor>
          </Text>
        </Paper>
      </Container>
    </Center>
  );
}
