/**
 * Timezone-aware date-key helpers.
 *
 * Check-ins are stored as `'YYYY-MM-DD'` strings ("date keys") rather than
 * Date objects. The reason is correctness: "today" depends on the *user's*
 * timezone, not the server's. If a user in Asia/Kolkata checks in at 23:30
 * local time and we stored a UTC timestamp, a UTC server would file it under
 * tomorrow and silently break their streak. Resolving the local calendar date
 * once, at write time, removes that whole class of bug — and makes heatmap
 * queries a cheap indexed string range scan.
 *
 * Every function here treats a date key as timezone-independent: once resolved,
 * '2025-06-14' means that calendar day and nothing else.
 */

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const DEFAULT_TIMEZONE = 'UTC';

/** True if the string is a well-formed `YYYY-MM-DD` key. */
export function isDateKey(value) {
  return typeof value === 'string' && DATE_KEY_PATTERN.test(value);
}

/** True if the runtime recognises the IANA timezone name. */
export function isValidTimezone(timeZone) {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * The calendar date at `instant` as seen from `timeZone`, as a date key.
 * The 'en-CA' locale formats as YYYY-MM-DD, which is exactly our key format.
 */
export function dateKeyFor(instant = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const zone = isValidTimezone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/** Today's date key in the given timezone. */
export function todayKey(timeZone = DEFAULT_TIMEZONE) {
  return dateKeyFor(new Date(), timeZone);
}

/**
 * The wall-clock time at `instant` in `timeZone`, as 'HH:mm' (24-hour).
 * Used by the reminder cron to decide whether a habit's reminder is due.
 */
export function timeOfDayFor(instant = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const zone = isValidTimezone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(instant);
}

/**
 * Parses a date key into a Date pinned to UTC midnight.
 * Anchoring at UTC makes day arithmetic and weekday lookup exact — no DST
 * shifts, because we are deliberately not modelling a real instant here.
 */
export function keyToDate(key) {
  if (!isDateKey(key)) throw new TypeError(`Invalid date key: ${key}`);
  return new Date(`${key}T00:00:00.000Z`);
}

/** Formats a UTC-anchored Date back into a date key. */
export function dateToKey(date) {
  return date.toISOString().slice(0, 10);
}

/** Shifts a date key by `days` (negative shifts backwards). */
export function addDays(key, days) {
  const date = keyToDate(key);
  date.setUTCDate(date.getUTCDate() + days);
  return dateToKey(date);
}

/** Day of week for a date key: 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(key) {
  return keyToDate(key).getUTCDay();
}

/** Whole days from `fromKey` to `toKey` (positive when `toKey` is later). */
export function daysBetween(fromKey, toKey) {
  const ms = keyToDate(toKey).getTime() - keyToDate(fromKey).getTime();
  return Math.round(ms / 86_400_000);
}

/** Inclusive list of every date key from `startKey` to `endKey`. */
export function rangeKeys(startKey, endKey) {
  const keys = [];
  const total = daysBetween(startKey, endKey);
  for (let i = 0; i <= total; i += 1) keys.push(addDays(startKey, i));
  return keys;
}

/**
 * The Monday on or before `key`. Weeks start on Monday throughout the app,
 * matching the dashboard's weekly bar chart and heatmap column layout.
 */
export function startOfWeek(key) {
  const dow = dayOfWeek(key);
  const offset = dow === 0 ? 6 : dow - 1; // Sunday closes the week
  return addDays(key, -offset);
}

