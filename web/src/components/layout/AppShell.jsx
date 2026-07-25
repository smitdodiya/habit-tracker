import { NavLink, useLocation } from 'react-router-dom';
import {
  House,
  ChartLineUp,
  BellRinging,
  GearSix,
  Moon,
  Sun,
  ShieldCheck,
  SignOut,
} from '@phosphor-icons/react';

import { useAuthStore } from '../../store/authStore.js';
import { useThemeStore } from '../../store/themeStore.js';
import { BrandMark } from '../illustrations/Illustrations.jsx';

/**
 * The signed-in layout.
 *
 * Responsive strategy: a persistent sidebar from `lg` up, and a bottom tab bar
 * below it. Bottom tabs beat a hamburger on mobile because the primary actions
 * stay reachable with a thumb — this is a habit app people open in seconds,
 * several times a day.
 */

const NAV_ITEMS = [
  { to: '/today', label: 'Today', icon: House },
  { to: '/dashboard', label: 'Progress', icon: ChartLineUp },
  { to: '/reminders', label: 'Reminders', icon: BellRinging },
  { to: '/settings', label: 'Settings', icon: GearSix },
];

export function AppShell({ children }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isDark = useThemeStore((state) => state.isDark);
  const toggleTheme = useThemeStore((state) => state.toggle);
  const location = useLocation();

  const navItems = user?.role === 'admin' ? [...NAV_ITEMS, { to: '/admin', label: 'Admin', icon: ShieldCheck }] : NAV_ITEMS;

  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      {/* Keyboard users land here first and can jump straight past the nav. */}
      <a
        href="#main"
        className="sr-only-focusable absolute left-4 top-4 z-50 rounded-lg bg-[var(--accent-strong)] px-4 py-2 text-sm font-semibold text-white"
      >
        Skip to content
      </a>

      {/* ---- Sidebar (large screens) ---- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[var(--border)] bg-[var(--surface)] px-3 py-5 lg:flex">
        <div className="mb-7 flex items-center gap-2.5 px-2">
          <BrandMark size={30} />
          <span className="text-[0.9375rem] font-extrabold tracking-tight text-[var(--text)]">
            Habit Tracker
          </span>
        </div>

        <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={sidebarLinkClasses}>
              {({ isActive }) => (
                <>
                  <Icon size={19} weight={isActive ? 'fill' : 'regular'} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <Avatar name={user?.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.8125rem] font-semibold text-[var(--text)]">{user?.name}</p>
              <p className="truncate text-xs text-[var(--text-muted)]">{user?.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="mt-1 flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-[0.8125rem] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
          >
            <SignOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ---- Top bar (small screens) ---- */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/92 backdrop-blur-md lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <BrandMark size={26} />
            <span className="text-sm font-extrabold tracking-tight text-[var(--text)]">Habit Tracker</span>
          </div>

          <div className="flex items-center gap-1">
            <ThemeButton isDark={isDark} onToggle={toggleTheme} />
            <button
              type="button"
              onClick={logout}
              aria-label="Sign out"
              className="rounded-[10px] p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
            >
              <SignOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* ---- Content ---- */}
      <div className="lg:pl-60">
        {/* Desktop-only theme toggle, aligned with the page content. */}
        <div className="hidden justify-end px-6 pt-5 lg:flex">
          <ThemeButton isDark={isDark} onToggle={toggleTheme} />
        </div>

        <main
          id="main"
          // Bottom padding clears the mobile tab bar plus the iOS home indicator.
          className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 sm:px-6 lg:pb-12 lg:pt-2"
        >
          {/* Remounting on route change replays the entrance animation, which
              gives navigation a sense of direction. */}
          <div key={location.pathname} className="animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>

      {/* ---- Bottom tabs (small screens) ---- */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <div className="flex items-stretch">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={tabLinkClasses}>
              {({ isActive }) => (
                <>
                  <Icon size={21} weight={isActive ? 'fill' : 'regular'} />
                  <span className="text-[0.6875rem] font-semibold">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function ThemeButton({ isDark, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light theme' : 'Dark theme'}
      className="rounded-[10px] p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
    >
      {isDark ? <Sun size={18} weight="fill" /> : <Moon size={18} />}
    </button>
  );
}

function Avatar({ name = '' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent-strong)]"
    >
      {initials || '?'}
    </span>
  );
}

const sidebarLinkClasses = ({ isActive }) =>
  [
    'flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-sm font-semibold transition-colors',
    isActive
      ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
      : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]',
  ].join(' ');

const tabLinkClasses = ({ isActive }) =>
  [
    'flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 transition-colors',
    isActive ? 'text-[var(--accent-strong)]' : 'text-[var(--text-muted)]',
  ].join(' ');
