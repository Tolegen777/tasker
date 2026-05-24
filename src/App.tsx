import { Navigate, Route, Routes } from 'react-router-dom';
import { Center, Loader } from '@mantine/core';
import { useAuth } from './lib/auth';
import LoginPage from './pages/Login';
import AdminSignupPage from './pages/AdminSignup';
import AppLayout from './components/Layout';
import BoardPage from './pages/Board';
import CalendarPage from './pages/Calendar';
import TeamPage from './pages/Team';
import ProfilePage from './pages/Profile';

function FullPageLoader() {
  return (
    <Center h="100vh">
      <Loader size="lg" />
    </Center>
  );
}

export default function App() {
  const { session, loading } = useAuth();

  if (loading) return <FullPageLoader />;

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/secret-admin-portal-9k4m2p7q3xr8" element={<AdminSignupPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<BoardPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/secret-admin-portal-9k4m2p7q3xr8" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
