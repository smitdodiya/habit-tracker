/**
 * Logic shared by the web and mobile clients.
 *
 * Strictly pure: no DOM, no React, no React Native. Components cannot be
 * shared across the two platforms — React Native has no DOM, and pretending
 * otherwise produces a worse version of both — so the boundary is drawn at
 * data and functions, which genuinely are identical.
 */

export * from './dates.js';
export * from './format.js';
export * from './templates.js';
export * from './theme.js';
