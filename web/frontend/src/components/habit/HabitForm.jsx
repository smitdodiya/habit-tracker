import { useState } from 'react';
import { Check, PencilSimple, CaretLeft } from '@phosphor-icons/react';

import { Input, Textarea } from '../ui/Input.jsx';
import { Button } from '../ui/Button.jsx';
import { Toggle } from '../ui/Toggle.jsx';
import { ICON_NAMES, getIcon, HABIT_COLORS } from '../../lib/icons.js';
import { HABIT_TEMPLATES, templateToHabit } from '../../lib/templates.js';
import { CATEGORIES, WEEKDAY_INITIALS, WEEKDAY_LABELS, withAlpha, readableTextOn } from '../../lib/format.js';

/**
 * Create / edit habit form (brief §04, "Add / Edit Habit").
 *
 * All the pickers are inline rather than nested dialogs — the whole form is
 * short enough to fit one screen, and choosing an icon and colour is much
 * easier when you can see them next to the name they belong to.
 */

const EMPTY = {
  name: '',
  description: '',
  icon: 'Target',
  color: '#E94560',
  category: 'personal',
  frequency: { type: 'daily', daysOfWeek: [1, 2, 3, 4, 5], timesPerWeek: 3 },
  reminder: { enabled: false, time: '09:00' },
};

export function HabitForm({ initial, onSubmit, onCancel, submitLabel = 'Create habit', errors = {} }) {
  const [values, setValues] = useState(() => ({
    ...EMPTY,
    ...initial,
    frequency: { ...EMPTY.frequency, ...initial?.frequency },
    reminder: { ...EMPTY.reminder, ...initial?.reminder },
  }));
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  // New habits open on the template picker; editing goes straight to the form,
  // since the habit already exists and templates would be meaningless.
  const [picking, setPicking] = useState(!initial);

  const applyTemplate = (template) => {
    setValues({ ...EMPTY, ...templateToHabit(template) });
    setPicking(false);
  };

  if (picking) {
    return (
      <TemplatePicker
        onPick={applyTemplate}
        // "Write my own" clears the form. Someone who picked a template, went
        // back, and then chose to start fresh means exactly that — leaving the
        // old template's name and colour behind would be baffling.
        onSkip={() => {
          setValues({ ...EMPTY });
          setLocalError(null);
          setPicking(false);
        }}
        onCancel={onCancel}
      />
    );
  }

  const set = (patch) => setValues((current) => ({ ...current, ...patch }));
  const setFrequency = (patch) => set({ frequency: { ...values.frequency, ...patch } });
  const setReminder = (patch) => set({ reminder: { ...values.reminder, ...patch } });

  const toggleDay = (day) => {
    const days = values.frequency.daysOfWeek.includes(day)
      ? values.frequency.daysOfWeek.filter((d) => d !== day)
      : [...values.frequency.daysOfWeek, day].sort((a, b) => a - b);
    setFrequency({ daysOfWeek: days });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError(null);

    if (!values.name.trim()) {
      setLocalError('Give your habit a name');
      return;
    }
    if (values.frequency.type === 'custom' && values.frequency.daysOfWeek.length === 0) {
      setLocalError('Pick at least one day');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  };

  const PreviewIcon = getIcon(values.icon);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ---- Live preview: the habit as it will appear on Today ---- */}
      <div
        className="flex items-center gap-3 rounded-[14px] border border-[var(--border)] p-3"
        style={{ background: withAlpha(values.color, 0.07) }}
      >
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px]"
          style={{ background: values.color, color: readableTextOn(values.color) }}
        >
          <PreviewIcon size={23} weight="duotone" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--text)]">
            {values.name.trim() || 'Your new habit'}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {values.frequency.type === 'daily' && 'Every day'}
            {values.frequency.type === 'weekly' && `${values.frequency.timesPerWeek}× per week`}
            {values.frequency.type === 'custom' &&
              (values.frequency.daysOfWeek.length
                ? values.frequency.daysOfWeek.map((d) => WEEKDAY_LABELS[d]).join(', ')
                : 'Pick your days')}
          </p>
        </div>
      </div>

      <Input
        label="Habit name"
        placeholder="e.g. Morning meditation"
        value={values.name}
        onChange={(event) => set({ name: event.target.value })}
        error={errors.name ?? localError}
        maxLength={60}
        autoFocus
      />

      <Textarea
        label="Description"
        placeholder="Optional — what does doing this look like?"
        value={values.description}
        onChange={(event) => set({ description: event.target.value })}
        rows={2}
        maxLength={240}
      />

      {/* ---- Icon ---- */}
      <Field label="Icon">
        <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-11">
          {ICON_NAMES.map((name) => {
            const Icon = getIcon(name);
            const selected = values.icon === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => set({ icon: name })}
                aria-label={name}
                aria-pressed={selected}
                className={[
                  'flex aspect-square items-center justify-center rounded-[10px] border transition-all',
                  selected
                    ? 'border-transparent text-white'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]',
                ].join(' ')}
                style={selected ? { background: values.color, color: readableTextOn(values.color) } : undefined}
              >
                <Icon size={17} weight={selected ? 'fill' : 'regular'} />
              </button>
            );
          })}
        </div>
      </Field>

      {/* ---- Colour ---- */}
      <Field label="Colour">
        <div className="flex flex-wrap gap-2">
          {HABIT_COLORS.map((color) => {
            const selected = values.color.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={color}
                type="button"
                onClick={() => set({ color })}
                aria-label={`Colour ${color}`}
                aria-pressed={selected}
                className="flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-110"
                style={{
                  background: color,
                  // A ring rather than a border, so the swatch keeps its full size.
                  boxShadow: selected ? `0 0 0 2px var(--surface), 0 0 0 4px ${color}` : 'none',
                }}
              >
                {selected && <Check size={14} weight="bold" style={{ color: readableTextOn(color) }} />}
              </button>
            );
          })}
        </div>
      </Field>

      {/* ---- Category ---- */}
      <Field label="Category">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((category) => (
            <Chip
              key={category.value}
              selected={values.category === category.value}
              onClick={() => set({ category: category.value })}
            >
              {category.label}
            </Chip>
          ))}
        </div>
      </Field>

      {/* ---- Frequency ---- */}
      <Field label="How often?">
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { value: 'daily', label: 'Every day' },
            { value: 'custom', label: 'Certain days' },
            { value: 'weekly', label: 'X per week' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFrequency({ type: option.value })}
              aria-pressed={values.frequency.type === option.value}
              className={[
                'rounded-[11px] border px-2 py-2.5 text-[0.8125rem] font-semibold transition-colors',
                values.frequency.type === option.value
                  ? 'border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]',
              ].join(' ')}
            >
              {option.label}
            </button>
          ))}
        </div>

        {values.frequency.type === 'custom' && (
          <div className="mt-3">
            <div className="flex gap-1.5">
              {WEEKDAY_INITIALS.map((initial, day) => {
                const selected = values.frequency.daysOfWeek.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    aria-label={WEEKDAY_LABELS[day]}
                    aria-pressed={selected}
                    className={[
                      'flex h-10 flex-1 items-center justify-center rounded-[10px] border text-[0.8125rem] font-bold transition-colors',
                      selected
                        ? 'border-transparent bg-[var(--accent-strong)] text-white'
                        : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]',
                    ].join(' ')}
                  >
                    {initial}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Only the days you pick count. The rest are days off.
            </p>
          </div>
        )}

        {values.frequency.type === 'weekly' && (
          <div className="mt-3">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map((times) => (
                <button
                  key={times}
                  type="button"
                  onClick={() => setFrequency({ timesPerWeek: times })}
                  aria-pressed={values.frequency.timesPerWeek === times}
                  className={[
                    'flex h-10 flex-1 items-center justify-center rounded-[10px] border text-[0.8125rem] font-bold transition-colors',
                    values.frequency.timesPerWeek === times
                      ? 'border-transparent bg-[var(--accent-strong)] text-white'
                      : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]',
                  ].join(' ')}
                >
                  {times}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Any {values.frequency.timesPerWeek} days a week counts. This streak is measured in weeks.
            </p>
          </div>
        )}
      </Field>

      {/* ---- Reminder ---- */}
      <Field label="Reminder">
        <div className="rounded-[13px] border border-[var(--border)] p-3.5">
          <Toggle
            checked={values.reminder.enabled}
            onChange={(enabled) => setReminder({ enabled })}
            label="Remind me"
            description="A nudge at the time you choose"
          />

          {values.reminder.enabled && (
            <div className="mt-3.5 border-t border-[var(--border)] pt-3.5">
              <label
                htmlFor="reminder-time"
                className="mb-1.5 block text-[0.8125rem] font-semibold text-[var(--text)]"
              >
                Time
              </label>
              <input
                id="reminder-time"
                type="time"
                value={values.reminder.time}
                onChange={(event) => setReminder({ time: event.target.value })}
                className="rounded-[11px] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
              />
            </div>
          )}
        </div>
      </Field>

      <div className="flex gap-2.5 pt-1">
        {!initial ? (
          <Button type="button" variant="secondary" onClick={() => setPicking(true)}>
            <CaretLeft size={14} weight="bold" />
            Templates
          </Button>
        ) : (
          onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel} fullWidth>
              Cancel
            </Button>
          )
        )}
        <Button type="submit" loading={submitting} fullWidth>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

/**
 * Starting points for a new habit.
 *
 * The blank form is the hardest screen in the app — a new user has to invent a
 * name, an icon, a colour and a schedule before they've achieved anything.
 * This turns that into one tap, and everything stays editable afterwards.
 */
function TemplatePicker({ onPick, onSkip, onCancel }) {
  return (
    <div>
      <p className="mb-3 text-[0.8125rem] text-[var(--text-muted)]">
        Pick one, or write your own.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {HABIT_TEMPLATES.map((template) => {
          const Icon = getIcon(template.icon);
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onPick(template)}
              className="flex flex-col items-center gap-2 rounded-[13px] border border-[var(--border)] p-3 text-center transition-all hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)] active:scale-[0.98]"
            >
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-[13px]"
                style={{ background: withAlpha(template.color, 0.14), color: template.color }}
              >
                <Icon size={19} weight="duotone" />
              </span>
              <span className="text-[0.75rem] font-bold leading-tight text-[var(--text)]">
                {template.name}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2.5">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} fullWidth>
            Cancel
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={onSkip} fullWidth>
          <PencilSimple size={15} />
          Write my own
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <p className="mb-2 text-[0.8125rem] font-semibold text-[var(--text)]">{label}</p>
      {children}
    </div>
  );
}

function Chip({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        'rounded-full border px-3 py-1.5 text-[0.8125rem] font-semibold transition-colors',
        selected
          ? 'border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]'
          : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
