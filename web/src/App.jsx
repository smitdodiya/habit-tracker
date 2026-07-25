import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { useAuthStore } from './store/authStore.js';
import { useThemeStore } from './store/themeStore.js';

import { AppShell } from './components/layout/AppShell.jsx';
import { ToastHost } from './components/ui/Toast.jsx';
import { ProtectedRoute, PublicOnlyRoute, AdminRoute } from './routes.jsx';

import { OnboardingPage } from './pages/Onboarding.jsx';
import { LoginPage, SignupPage } from './pages/Auth.jsx';
import { TodayPage } from './pages/Today.jsx';
import { HabitDetailPage } from './pages/HabitDetail.jsx';
import { DashboardPage } from './pages/Dashboard.jsx';
import { RemindersPage } from './pages/Reminders.jsx';
import { SettingsPage } from './pages/Settings.jsx';
import { AdminPage } from './pages/Admin.jsx';
import { NotFoundPage } from './pages/NotFound.jsx';

/** Wraps a page in the signed-in chrome. */
const shell = (element) => (
  <ProtectedRoute>
    <AppShell>{element}</AppShell>
  </ProtectedRoute>
);

export default function App() {
  const initialiseAuth = useAuthStore((state) => state.initialise);
  const initialiseTheme = useThemeStore((state) => state.initialise);

  useEffect(() => {
    // Theme first: it is synchronous and prevents a flash while the async
    // session check is still in flight.
    const cleanup = initialiseTheme();
    initialiseAuth();
    return cleanup;
  }, [initialiseAuth, initialiseTheme]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route
          path="/"
          element={
            <PublicOnlyRoute>
              <OnboardingPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicOnlyRoute>
              <SignupPage />
            </PublicOnlyRoute>
          }
        />

        {/* Signed in */}
        <Route path="/today" element={shell(<TodayPage />)} />
        <Route path="/habits/:id" element={shell(<HabitDetailPage />)} />
        <Route path="/dashboard" element={shell(<DashboardPage />)} />
        <Route path="/reminders" element={shell(<RemindersPage />)} />
        <Route path="/settings" element={shell(<SettingsPage />)} />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AppShell>
                <AdminPage />
              </AppShell>
            </AdminRoute>
          }
        />

        {/* Legacy path kept so old links don't 404. */}
        <Route path="/home" element={<Navigate to="/today" replace />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <ToastHost />
    </BrowserRouter>
  );
}
