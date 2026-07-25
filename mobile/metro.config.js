const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

/**
 * Metro, taught about the monorepo.
 *
 * Metro does not follow symlinks out of the project directory by default, so
 * without this it cannot see `@habit-tracker/shared` — the workspace link
 * resolves to `../shared`, which is outside `mobile/`. Two changes fix it:
 * watch the repo root so edits to shared code trigger a reload, and search
 * both node_modules folders so hoisted and nested packages both resolve.
 */

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Without this, a package hoisted to the root can be resolved twice — once
// from each node_modules — which gives React two copies of itself and the
// famously unhelpful "invalid hook call" error.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
