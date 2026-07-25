const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

/**
 * Metro, taught about the one path that leaves this project.
 *
 * `mobile/` installs its own dependencies rather than being an npm workspace,
 * because React Native needs React 19 while the web app is still on React 18 —
 * a shared hoisted tree gives one of them the wrong copy. That means Metro's
 * default resolution is already correct for everything in node_modules.
 *
 * The single exception is `@habit-tracker/shared`, which symlinks out to
 * ../web/shared. Metro does not watch outside the project root by default, so
 * without this an edit to the shared date or format helpers would not trigger
 * a reload. Only that folder is added — watching the whole repo would pull the
 * web app's node_modules into scope and reintroduce the duplicate-React problem
 * the split was meant to avoid.
 */

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '../web/shared');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedRoot];

module.exports = config;
