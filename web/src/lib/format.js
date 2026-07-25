/**
 * Display helpers shared across screens.
 * Date keys ('YYYY-MM-DD') are parsed as UTC so they render as the calendar
 * day they represent, never shifted by the viewer's own timezone.
 */

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const CATEGORIES = [
  { value: 'morning-routine', label: 'Morning Routine' },
  { value: 'health', label: 'Health' },
  { value: 'learning', label: 'Learning' },
  { value: 'personal', label: 'Personal' },
  { value: 'work', label: 'Work' },
  { value: 'custom', label: 'Custom' },
];

export const MOODS = [
  { value: 'great', label: 'Great', emoji: '🤩' },
  { value: 'good', label: 'Good', emoji: '🙂' },
  { value: 'okay', label: 'Okay', emoji: '😐' },
  { value: 'low', label: 'Low', emoji: '😕' },
  { value: 'tough', label: 'Tough', emoji: '😣' },
];

export function categoryLabel(value) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? 'Personal';
}

export function moodMeta(value) {
  return MOODS.find((m) => m.value === value) ?? null;
}

/** '2025-06-15' → Date at UTC midnight. */
export function parseKey(key) {
  return new Date(`${key}T00:00:00.000Z`);
}

/** '2025-06-15' → 'Sun, 15 Jun' */
export function formatDate(key, options = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return parseKey(key).toLocaleDateString('en-GB', { ...options, timeZone: 'UTC' });
}

/** '2025-06-15' → '15 June 2025' */
export function formatLongDate(key) {
  return formatDate(key, { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Friendly relative label for recent dates, falling back to a real date. */
export function relativeDay(key, todayKey) {
  if (!todayKey) return formatDate(key);
  const diff = Math.round((parseKey(todayKey) - parseKey(key)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  return formatDate(key);
}

/** A greeting appropriate to the time of day. */
export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** 0.6753 → '68%' */
export function percent(value, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}

/** Pluralises a streak: (5, 'day') → '5 days'. */
export function pluralise(count, noun) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** 'HH:mm' → '9:00 am' */
export function formatTime(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours < 12 ? 'am' : 'pm';
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

/** Human summary of a habit's schedule, e.g. 'Mon, Wed, Fri'. */
export function describeFrequency(frequency) {
  if (!frequency) return 'Daily';
  const { type, daysOfWeek = [], timesPerWeek = 3 } = frequency;

  if (type === 'custom' && daysOfWeek.length > 0) {
    if (daysOfWeek.length === 7) return 'Every day';
    // Weekdays and weekends are common enough to deserve their own names.
    const sorted = [...daysOfWeek].sort((a, b) => a - b);
    if (sorted.join() === '1,2,3,4,5') return 'Weekdays';
    if (sorted.join() === '0,6') return 'Weekends';
    return sorted.map((d) => WEEKDAY_LABELS[d]).join(', ');
  }
  if (type === 'weekly') return `${timesPerWeek}× per week`;
  return 'Every day';
}

/**
 * Picks black or white text for a coloured background, whichever has more
 * contrast. Habit colours are user-chosen, so this cannot be hard-coded.
 */
export function readableTextOn(hex) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

  // Contrast against white vs against near-black; pick the winner.
  const againstWhite = 1.05 / (luminance + 0.05);
  const againstBlack = (luminance + 0.05) / 0.05;
  return againstWhite >= againstBlack ? '#FFFFFF' : '#12121E';
}

/** Translates a hex colour to `rgba()` at the given alpha. */
export function withAlpha(hex, alpha) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
