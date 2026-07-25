import { useEffect, useState } from 'react';
import { Users, ListChecks, Pulse, MagnifyingGlass } from '@phosphor-icons/react';

import { adminApi } from '../api/endpoints.js';
import { errorMessage } from '../api/client.js';
import { toast } from '../store/toastStore.js';

import { Input } from '../components/ui/Input.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { categoryLabel, formatDate, relativeDay, describeFrequency } from '../lib/format.js';
import { todayKey } from '../lib/dates.js';

/**
 * Basic admin panel (brief §08, "Admin / Backend Panel — view users, habits,
 * activity logs").
 *
 * Deliberately read-only. Its job is visibility into what's happening on the
 * platform, not editing other people's data — an admin who can silently change
 * a user's habits is a support problem waiting to happen.
 *
 * The route is gated on the client by role and enforced on the server by
 * requireAdmin, so hiding the tab is a convenience, not the security boundary.
 */

const TABS = [
  { value: 'overview', label: 'Overview', icon: Pulse },
  { value: 'users', label: 'Users', icon: Users },
  { value: 'habits', label: 'Habits', icon: ListChecks },
  { value: 'activity', label: 'Activity', icon: Pulse },
];

export function AdminPage() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">Admin</h1>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">Platform activity across all accounts</p>
      </header>

      <div
        role="tablist"
        aria-label="Admin sections"
        className="no-scrollbar flex gap-1 overflow-x-auto rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-1"
      >
        {TABS.map((item) => (
          <button
            key={item.value}
            role="tab"
            aria-selected={tab === item.value}
            onClick={() => setTab(item.value)}
            className={[
              'shrink-0 rounded-[9px] px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors',
              tab === item.value
                ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'habits' && <HabitsTab />}
      {tab === 'activity' && <ActivityTab />}
    </div>
  );
}

/** Loads a section's data, handling the loading and error states uniformly. */
function useAdminData(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    loader()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((error) => toast.error(errorMessage(error, 'Could not load admin data')))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls the deps
  }, deps);

  return { data, loading };
}

function OverviewTab() {
  const { data, loading } = useAdminData(() => adminApi.overview());

  if (loading) return <LoadingCards count={3} />;
  if (!data) return null;

  const peak = Math.max(1, ...data.activity.map((d) => d.count));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Users" value={data.totals.users} />
        <Stat label="Habits" value={data.totals.habits} />
        <Stat label="Check-ins" value={data.totals.checkIns} />
        <Stat label="Active today" value={data.activeUsersToday} hint={`${data.checkInsThisWeek} this week`} />
      </div>

      <section className="card p-5" aria-label="Check-ins over the last 14 days">
        <h2 className="mb-4 text-[0.8125rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Check-ins, last 14 days
        </h2>

        <div className="flex h-32 items-end gap-1.5">
          {data.activity.map((day) => (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className="w-full rounded-t-[4px] bg-[var(--accent)] transition-all"
                style={{ height: `${(day.count / peak) * 100}%`, minHeight: day.count > 0 ? 3 : 0 }}
                title={`${formatDate(day.date)}: ${day.count} check-ins`}
              />
              <span className="text-[0.5625rem] text-[var(--text-subtle)]">{day.date.slice(-2)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function UsersTab() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  // Debounced so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, loading } = useAdminData(() => adminApi.users(debounced), [debounced]);

  return (
    <div className="space-y-4">
      <Input
        icon={MagnifyingGlass}
        placeholder="Search by name or email…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {loading ? (
        <LoadingCards count={4} />
      ) : (
        <Table
          headers={['User', 'Role', 'Habits', 'Check-ins', 'Joined']}
          rows={(data?.users ?? []).map((user) => [
            <div key="u" className="min-w-0">
              <p className="truncate text-[0.8125rem] font-semibold text-[var(--text)]">{user.name}</p>
              <p className="truncate text-xs text-[var(--text-muted)]">{user.email}</p>
            </div>,
            <span
              key="r"
              className={[
                'rounded-full px-2 py-0.5 text-[0.6875rem] font-bold uppercase',
                user.role === 'admin'
                  ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                  : 'bg-[var(--surface-3)] text-[var(--text-muted)]',
              ].join(' ')}
            >
              {user.role}
            </span>,
            user.habits,
            user.checkIns,
            new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          ])}
          emptyMessage="No users match that search."
        />
      )}
    </div>
  );
}

function HabitsTab() {
  const { data, loading } = useAdminData(() => adminApi.habits());

  if (loading) return <LoadingCards count={4} />;

  return (
    <Table
      headers={['Habit', 'Owner', 'Category', 'Schedule', 'Created']}
      rows={(data?.habits ?? []).map((habit) => [
        <div key="h" className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: habit.color }} />
          <span className="truncate text-[0.8125rem] font-semibold text-[var(--text)]">{habit.name}</span>
          {habit.archived && (
            <span className="shrink-0 rounded-full bg-[var(--surface-3)] px-1.5 text-[0.625rem] font-semibold text-[var(--text-subtle)]">
              archived
            </span>
          )}
        </div>,
        <span key="o" className="truncate text-xs text-[var(--text-muted)]">
          {habit.owner?.email ?? '—'}
        </span>,
        categoryLabel(habit.category),
        describeFrequency(habit.frequency),
        new Date(habit.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      ])}
      emptyMessage="No habits yet."
    />
  );
}

function ActivityTab() {
  const { data, loading } = useAdminData(() => adminApi.activity());
  const today = todayKey();

  if (loading) return <LoadingCards count={5} />;

  const activity = data?.activity ?? [];

  if (activity.length === 0) {
    return <p className="card p-8 text-center text-sm text-[var(--text-muted)]">No activity recorded yet.</p>;
  }

  return (
    <section className="card divide-y divide-[var(--border)]" aria-label="Recent activity">
      {activity.map((entry) => (
        <div key={entry.id} className="flex items-start gap-3 p-3.5">
          <span
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: entry.habit?.color ?? 'var(--border-strong)' }}
          />

          <div className="min-w-0 flex-1">
            <p className="text-[0.8125rem] text-[var(--text)]">
              <span className="font-semibold">{entry.user?.name ?? 'Deleted user'}</span>
              {' checked in — '}
              <span className="font-semibold">{entry.habit?.name ?? 'deleted habit'}</span>
            </p>

            {entry.note && (
              <p className="mt-0.5 truncate text-xs italic text-[var(--text-muted)]">"{entry.note}"</p>
            )}
          </div>

          <span className="shrink-0 text-xs text-[var(--text-subtle)]">{relativeDay(entry.date, today)}</span>
        </div>
      ))}
    </section>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="card p-4">
      <p className="text-[0.6875rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--text)]">{value}</p>
      {hint && <p className="mt-0.5 text-[0.6875rem] text-[var(--text-subtle)]">{hint}</p>}
    </div>
  );
}

/** Responsive table — horizontally scrollable rather than squashed on mobile. */
function Table({ headers, rows, emptyMessage }) {
  if (rows.length === 0) {
    return <p className="card p-8 text-center text-sm text-[var(--text-muted)]">{emptyMessage}</p>;
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] text-left">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {headers.map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-wide text-[var(--text-muted)]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="transition-colors hover:bg-[var(--surface-2)]">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 text-[0.8125rem] text-[var(--text-muted)]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LoadingCards({ count }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full" rounded="rounded-[14px]" />
      ))}
    </div>
  );
}
