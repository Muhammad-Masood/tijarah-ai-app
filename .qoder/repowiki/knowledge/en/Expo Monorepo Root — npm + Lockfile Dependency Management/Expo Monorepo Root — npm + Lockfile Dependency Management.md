---
kind: dependency_management
name: Expo Monorepo Root — npm + Lockfile Dependency Management
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - package-lock.json
    - app.json
    - .gitignore
    - tsconfig.json
    - eslint.config.js
---

## System / Approach

This repository is a single-package Expo/React Native application managed entirely through **npm** with a **`package-lock.json` lockfile**. There are no monorepo tools (no `pnpm-workspace.yaml`, `lerna.json`, `turbo.json`, or `nx.json`); the root `package.json` declares all runtime and dev dependencies for the app, and the Python scripts under `scripts/` are executed directly without a Python dependency manifest in this repo.

## Key Files

- `package.json` — sole source of truth for declared dependencies (`expo`, `react`, `react-native`, `expo-router`, navigation, UI libraries) and devDependencies (`typescript`, `eslint`, `eslint-config-expo`).
- `package-lock.json` — deterministic lockfile that pins exact versions; used by CI and local installs to reproduce the same tree.
- `app.json` — declares Expo plugins (`expo-splash-screen`, `expo-font`, `expo-secure-store`, `@react-native-community/datetimepicker`) which are resolved at build time alongside npm packages.
- `.gitignore` — excludes `node_modules/`, so dependencies are never committed beyond the lockfile.
- `tsconfig.json` and `eslint.config.js` — TypeScript and ESLint configuration consumed by the `expo lint` script.

## Architecture & Conventions

- **Flat dependency graph**: All third-party packages are declared at the project root; there are no per-feature `package.json` files. This keeps the dependency surface small and easy to audit.
- **Version pinning strategy**:
  - Runtime dependencies use a mix of caret ranges (`^15.0.3`, `~6.0.24`) and exact versions (`8.4.4`, `19.1.0`, `0.81.5`). Expo ecosystem packages tend to use tilde ranges (`~`) to stay within a minor release train, while some peer-dep packages like `react` and `react-dom` are pinned exactly to avoid version drift between them.
  - DevDependencies also use tilde/caret ranges (`~5.9.2`, `^9.0.0`, `~10.0.0`).
- **No vendoring**: Dependencies are installed into `node_modules/` and ignored from version control via `.gitignore`. The lockfile is the only artifact tracked.
- **Private registries / auth**: No `.npmrc`, `yarn.lock`, `pnpm-lock.yaml`, or registry overrides were found. Packages resolve from the default public npm registry.
- **Expo plugin resolution**: Plugins listed in `app.json.plugins` (e.g. `expo-splash-screen`, `expo-font`, `expo-secure-store`, `@react-native-community/datetimepicker`) are resolved as npm packages at build time; they must be present in `dependencies` or `devDependencies` for the build to succeed.
- **Scripts as entry points**: `npm start`, `npm run android`, `npm run ios`, `npm run web`, and `npm run lint` wrap `expo` CLI commands; these scripts are the documented way to install and run the app.

## Conventions & Constraints

- **Lockfile-first installs**: Because `package-lock.json` is present and `node_modules/` is gitignored, every developer and CI environment should install via `npm ci` or `npm install` to honor the lockfile deterministically.
- **No workspace/multi-package layout**: Adding a new package means editing the root `package.json`; there is no convention for splitting dependencies across subpackages.
- **Expo-managed vs bare workflow**: The project uses the Expo managed workflow (via `expo` SDK ~54), so native modules are pulled in through Expo's plugin system rather than manual linking; this constrains how native dependencies can be added (they must be compatible with the declared Expo SDK version).
- **Python tooling has no declared deps in this repo**: The `scripts/*.py` files are invoked directly; any Python dependencies are expected to be installed outside this repo (not managed here).