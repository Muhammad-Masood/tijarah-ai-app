---
kind: build_system
name: Expo-based Cross-Platform Build & Dev Workflow
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - app.json
    - tsconfig.json
    - eslint.config.js
    - .gitignore
    - scripts/reset-project.js
---

## What system/approach is used

The project is a single-package Expo application (React Native + Expo Router) built and developed entirely through the Expo toolchain. There are no Makefiles, Dockerfiles, or CI pipelines in this repository; build, dev server, linting, and platform-specific runs are all driven by `npm` scripts that wrap `expo start` and `expo lint`. The app targets iOS, Android, and Web from one codebase via Expo's cross-platform abstraction.

## Key files and packages

- `package.json` — declares dependencies (`expo ~54`, `expo-router ~6`, `react-native 0.81`, `react 19`) and defines the only build/dev commands: `start`, `android`, `ios`, `web`, `lint`, plus a helper `reset-project`.
- `app.json` — Expo config that names the app (`Tijarah AI`), sets version `1.0.0`, configures splash screen, icons, Android adaptive icons, web output mode (`static`), and registers plugins (`expo-router`, `expo-splash-screen`, `expo-font`, `expo-secure-store`, `@react-native-community/datetimepicker`).
- `tsconfig.json` — TypeScript configuration consumed by `tsc` and the Expo toolchain.
- `eslint.config.js` — ESLint configuration (used by `expo lint`).
- `.gitignore` — excludes `node_modules/`, `*.tsbuildinfo`, and `web-build/` (the Expo web static output).
- `scripts/reset-project.js` — Node script invoked via `npm run reset-project` that scaffolds a fresh `src/app/index.tsx` + `_layout.tsx` and optionally moves existing `src/` and `scripts/` into an `example/` directory.
- `scripts/*.py` — standalone Python utilities for auditing/updating the NIC Excel financial model; not part of the app build pipeline but executed directly with `python3`.

## Architecture and conventions

- **Single-package monorepo root**: there is no `packages/` or `apps/` split; everything lives under one `package.json` and one `node_modules` tree.
- **Dev workflow** is Expo-centric:
  - `npm start` / `npx expo start` launches the Metro bundler and development server.
  - `npm run android` / `npm run ios` / `npm run web` launch the respective platform targets through Expo CLI flags.
  - `npm run lint` delegates to `expo lint`, which runs ESLint against the TS/TSX source.
- **Web builds** emit static assets to `web-build/` (ignored by git) via `expo export --platform web`; the `app.json` `web.output` field is set to `static`.
- **App metadata** is centralized in `app.json` (name, slug, version, scheme, plugins, experiments). The package-level `version` (`57.0.15`) and the Expo `version` (`1.0.0`) are kept separate — the former tracks the npm package, the latter tracks the Expo app manifest.
- **TypeScript compilation** is configured via `tsconfig.json`; `.tsbuildinfo` files are gitignored, indicating incremental TS builds are expected but not committed.
- **Linting** uses ESLint v9 with the `expo` config preset; no test runner is configured.
- **Project reset convention**: new clones can run `npm run reset-project` to wipe `src/` and `scripts/` (optionally moving them to `example/`) and regenerate a minimal Expo Router entrypoint.

## Conventions and constraints

- All runtime behavior is driven by Expo CLI; there are no custom build scripts beyond the provided ones.
- Platform-specific builds require running the corresponding `npm run <platform>` command — there is no unified `build` script that produces artifacts for multiple platforms.
- Linting is the only pre-commit quality gate present; per `AGENTS.md`, contributors should run `npm run lint` and `npx tsc --noEmit` before submitting changes, and any tests added should be placed beside their source as `*.test.ts` / `*.test.tsx` with a runner declared in `package.json`.
- No automated CI, Docker, or release automation exists in this branch; the README notes that Google Play / Apple App Store public releases are planned for Q4 2026 and that distribution will go through Expo's standard channels (development builds, TestFlight, etc.).
- The `web` target outputs to a static site (`web-output` → `web-build/`); this is the only artifact produced locally without a native device.