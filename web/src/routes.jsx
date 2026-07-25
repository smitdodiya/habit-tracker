import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import { BrandMark } from './components/illustrations/Illustrations.jsx';

/**
 * Route guards.
 *
 * Both guards wait for the session check to finish before deciding. Rendering
 * a redirect while `status` is still 'loading' would bounce a signed-in user
 * to the login screen on every page refresh.
 */

/** Full-screen holding state while the session is being restored. */
function SessionLoading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--bg)]">
      <BrandMark size={44} />
      <p className="text-sm text-[var(--text-muted)]">Loading your habits…</p>
      <span className="sr-only" role="status">
        Signing you in
      </span>
    </div>
  );
}

/** Wraps pages that require a signed-in user. */
export function ProtectedRoute({ children }) {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();

  if (status === 'loading') return <SessionLoading />;

  if (status !== 'authed') {
    // Remember where they were headed so login can send them back there.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

/** Wraps the auth screens — a signed-in user has no reason to see them. */
export function PublicOnlyRoute({ children }) {
  const status = useAuthStore((state) => state.status);

  if (status === 'loading') return <SessionLoading />;
  if (status === 'authed') return <Navigate to="/today" replace />;

  return children;
}

/** Admin-only wrapper. The server enforces this too — this is just the UI half. */
export function AdminRoute({ children }) {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);

  if (status === 'loading') return <SessionLoading />;
  if (status !== 'authed') return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/today" replace />;

  return children;
}
