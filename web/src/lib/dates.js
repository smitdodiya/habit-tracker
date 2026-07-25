/**
 * Client-side date-key arithmetic.
 * Mirrors server/src/utils/date.js — same 'YYYY-MM-DD' contract, same UTC
 * anchoring — so the two sides can never disagree about what day it is.
 */

export function keyToDate(key) {
  return new Date(`${key}T00:00:00.000Z`);
}

export function dateToKey(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(key, days) {
  const date = keyToDate(key);
  date.setUTCDate(date.getUTCDate() + days);
  return dateToKey(date);
}

export function dayOfWeek(key) {
  return keyToDate(key).getUTCDay();
}

export function daysBetween(fromKey, toKey) {
  return Math.round((keyToDate(toKey) - keyToDate(fromKey)) / 86_400_000);
}

export function rangeKeys(startKey, endKey) {
  const keys = [];
  for (let i = 0; i <= daysBetween(startKey, endKey); i += 1) keys.push(addDays(startKey, i));
  return keys;
}

/** Monday-anchored, matching the server. */
export function startOfWeek(key) {
  const dow = dayOfWeek(key);
  return addDays(key, -(dow === 0 ? 6 : dow - 1));
}

/** Today in the browser's own timezone, as a date key. */
export function todayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
