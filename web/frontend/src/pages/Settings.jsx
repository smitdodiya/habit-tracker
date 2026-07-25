import { useState } from 'react';
import { Sun, Moon, Desktop, DownloadSimple, FilePdf, FileCsv, Lock, SignOut } from '@phosphor-icons/react';

import { useAuthStore } from '../store/authStore.js';
import { useThemeStore } from '../store/themeStore.js';
import { toast } from '../store/toastStore.js';
import { errorMessage, fieldErrors } from '../api/client.js';
import { authApi, downloadExport } from '../api/endpoints.js';

import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Toggle } from '../components/ui/Toggle.jsx';
import { Modal } from '../components/ui/Modal.jsx';

/**
 * Profile / Settings (brief §04): account, theme, notification preferences and
 * data export.
 */

const RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '365d', label: 'Last year' },
];

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const logout = useAuthStore((state) => state.logout);

  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);

  const [name, setName] = useState(user?.name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [exportRange, setExportRange] = useState('30d');
  const [exporting, setExporting] = useState(null);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const handleSaveName = async (event) => {
    event.preventDefault();
    if (!name.trim() || name === user?.name) return;

    setSavingName(true);
    try {
      await updateProfile({ name: name.trim() });
      toast.success('Name updated');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save your name'));
    } finally {
      setSavingName(false);
    }
  };

  const handleThemeChange = async (value) => {
    // Apply locally first so the change is instant, then persist to the profile
    // so it follows the user to another device.
    setPreference(value);
    try {
      await updateProfile({ theme: value });
    } catch {
      // The local preference still holds; syncing is a nicety, not critical.
    }
  };

  const handleExport = async (format) => {
    setExporting(format);
    try {
      await downloadExport({ format, range: exportRange });
      toast.success(`${format.toUpperCase()} downloaded`);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not generate that export'));
    } finally {
      setExporting(null);
    }
  };

  const handleNotificationPref = async (enabled) => {
    try {
      await updateProfile({ notificationsEnabled: enabled });
      toast.success(enabled ? 'Reminders resumed' : 'All reminders paused');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not update that setting'));
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">Settings</h1>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">Your account and preferences</p>
      </header>

      {/* ---- Account ---- */}
      <Section title="Account">
        <form onSubmit={handleSaveName} className="space-y-3.5">
          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />

          <Input
            label="Email"
            value={user?.email ?? ''}
            disabled
            hint="Your email can't be changed here — contact support if you need it moved."
          />

          <Input
            label="Timezone"
            value={user?.timezone ?? 'UTC'}
            disabled
            hint="Detected from your browser. Check-ins and reminders follow this."
          />

          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" loading={savingName} disabled={!name.trim() || name === user?.name}>
              Save changes
            </Button>
            <Button type="button" variant="secondary" onClick={() => setPasswordOpen(true)}>
              <Lock size={15} />
              Change password
            </Button>
          </div>
        </form>
      </Section>

      {/* ---- Appearance ---- */}
      <Section title="Appearance" description="Dark mode is a designed palette, not an inversion.">
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'light', label: 'Light', icon: Sun },
            { value: 'dark', label: 'Dark', icon: Moon },
            { value: 'system', label: 'System', icon: Desktop },
          ].map((option) => {
            const Icon = option.icon;
            const selected = preference === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleThemeChange(option.value)}
                aria-pressed={selected}
                className={[
                  'flex flex-col items-center gap-2 rounded-[13px] border py-4 transition-colors',
                  selected
                    ? 'border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]',
                ].join(' ')}
              >
                <Icon size={21} weight={selected ? 'fill' : 'regular'} />
                <span className="text-[0.8125rem] font-semibold">{option.label}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ---- Notifications ---- */}
      <Section title="Notifications">
        <Toggle
          checked={user?.notificationsEnabled ?? true}
          onChange={handleNotificationPref}
          label="Habit reminders"
          description="A master switch. Turning this off pauses every reminder without changing your individual times."
        />
      </Section>

      {/* ---- Export ---- */}
      <Section
        title="Export your data"
        description="Download your habit history as a spreadsheet or a formatted report."
      >
        <div className="space-y-3.5">
          <div>
            <label htmlFor="export-range" className="mb-1.5 block text-[0.8125rem] font-semibold text-[var(--text)]">
              Period
            </label>
            <select
              id="export-range"
              value={exportRange}
              onChange={(event) => setExportRange(event.target.value)}
              className="w-full rounded-[12px] border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] focus:border-[var(--accent-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] sm:w-56"
            >
              {RANGES.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="secondary"
              onClick={() => handleExport('csv')}
              loading={exporting === 'csv'}
            >
              <FileCsv size={16} />
              Download CSV
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleExport('pdf')}
              loading={exporting === 'pdf'}
            >
              <FilePdf size={16} />
              Download PDF
            </Button>
          </div>

          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-[var(--text-subtle)]">
            <DownloadSimple size={13} className="mt-0.5 shrink-0" />
            CSV gives one row per check-in for your own analysis. PDF is a formatted report with streaks,
            completion rates and your notes.
          </p>
        </div>
      </Section>

      {/* ---- Sign out ---- */}
      <Section title="Session">
        <Button variant="danger-soft" onClick={logout}>
          <SignOut size={16} />
          Sign out
        </Button>
      </Section>

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="card p-5">
      <h2 className="text-[0.8125rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">{title}</h2>
      {description && <p className="mt-1 text-[0.8125rem] text-[var(--text-muted)]">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ChangePasswordModal({ open, onClose }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    setSaving(true);

    try {
      await authApi.changePassword(form);
      toast.success('Password changed');
      setForm({ currentPassword: '', newPassword: '' });
      onClose();
    } catch (error) {
      setErrors(fieldErrors(error));
      setFormError(errorMessage(error, 'Could not change your password'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Change password" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div role="alert" className="rounded-[11px] bg-[var(--danger-soft)] px-3.5 py-2.5 text-[0.8125rem] font-medium text-[var(--danger)]">
            {formError}
          </div>
        )}

        <Input
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={set('currentPassword')}
          error={errors.currentPassword}
          required
        />

        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={set('newPassword')}
          error={errors.newPassword}
          hint="At least 8 characters, including a letter and a number"
          required
        />

        <div className="flex gap-2.5 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button type="submit" loading={saving} fullWidth>
            Update password
          </Button>
        </div>
      </form>
    </Modal>
  );
}
