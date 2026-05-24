import { useState } from 'react';
import { NavLink as RouterNavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  AppShell,
  Avatar,
  Badge,
  Burger,
  Divider,
  Group,
  Menu,
  NavLink,
  ScrollArea,
  Text,
  Title,
  Tooltip,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconCalendarMonth,
  IconLayoutKanban,
  IconLogout,
  IconMoon,
  IconSun,
  IconUser,
  IconUsersGroup,
} from '@tabler/icons-react';
import { useAuth } from '@/lib/auth';
import { ROLE_LABEL } from '@/types/db';

const NAV = [
  { to: '/', label: 'Задачи', icon: IconLayoutKanban, end: true },
  { to: '/calendar', label: 'Календарь', icon: IconCalendarMonth },
  { to: '/team', label: 'Команда', icon: IconUsersGroup },
];

function Logo() {
  return (
    <Group gap={10} wrap="nowrap">
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #7c5cff 0%, #22d3ee 100%)',
          display: 'grid',
          placeItems: 'center',
          color: 'white',
          fontWeight: 800,
        }}
      >
        T
      </div>
      <div>
        <Text fw={800} lh={1}>
          Tasker
        </Text>
        <Text size="xs" c="dimmed" lh={1.2}>
          командная работа
        </Text>
      </div>
    </Group>
  );
}

export default function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const { profile, signOut } = useAuth();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 48em)');
  const location = useLocation();
  const [, setBuster] = useState(0);

  const closeOnMobile = () => {
    if (isMobile) close();
    setBuster((x) => x + 1);
  };

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 260,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding={{ base: 'sm', sm: 'lg' }}
    >
      <AppShell.Header className="glass" withBorder={false}>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Logo />
          </Group>
          <Group gap="xs">
            <Tooltip label={isDark ? 'Светлая тема' : 'Тёмная тема'}>
              <ActionIcon
                variant="default"
                size="lg"
                onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
                aria-label="toggle theme"
              >
                {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
              </ActionIcon>
            </Tooltip>
            <Menu position="bottom-end" withArrow shadow="md">
              <Menu.Target>
                <Group gap={8} style={{ cursor: 'pointer' }}>
                  <Avatar
                    src={profile?.avatar_url ?? undefined}
                    radius="xl"
                    color="violet"
                    size={36}
                  >
                    {(profile?.full_name || 'U').slice(0, 1).toUpperCase()}
                  </Avatar>
                  <div style={{ display: isMobile ? 'none' : 'block' }}>
                    <Text size="sm" fw={600} lh={1}>
                      {profile?.full_name || 'Пользователь'}
                    </Text>
                    <Badge
                      size="xs"
                      color={profile?.role === 'admin' ? 'violet' : 'gray'}
                      variant="light"
                      mt={4}
                    >
                      {profile ? ROLE_LABEL[profile.role] : ''}
                    </Badge>
                  </div>
                </Group>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconUser size={16} />} onClick={() => navigate('/profile')}>
                  Профиль
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={signOut}>
                  Выйти
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" className="glass" withBorder={false}>
        <AppShell.Section grow component={ScrollArea}>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <RouterNavLink
              key={to}
              to={to}
              end={end}
              onClick={closeOnMobile}
              style={{ textDecoration: 'none' }}
            >
              {({ isActive }) => (
                <NavLink
                  label={label}
                  leftSection={<Icon size={18} />}
                  active={isActive}
                  variant={isActive ? 'filled' : 'subtle'}
                  mb={4}
                />
              )}
            </RouterNavLink>
          ))}
        </AppShell.Section>
        <Divider my="sm" />
        <Text size="xs" c="dimmed" px="xs">
          {location.pathname}
        </Text>
      </AppShell.Navbar>

      <AppShell.Main>
        <Title order={2} mb="md" visibleFrom="sm">
          {NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))?.label ??
            'Профиль'}
        </Title>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
