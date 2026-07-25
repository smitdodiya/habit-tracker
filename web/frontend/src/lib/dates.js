/**
 * Date-key helpers — re-exported from the shared package.
 *
 * The implementation lives in `shared/src/dates.js` so the web and mobile
 * clients cannot drift on what "today" means. This file stays as the import
 * path the web app already uses, and as the place any genuinely web-only date
 * helper would go.
 */

export * from '@habit-tracker/shared/dates';
