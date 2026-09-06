---
kind: configuration_system
name: Expo Runtime Config via .env + Platform-Aware Defaults
category: configuration_system
scope:
    - '**'
source_files:
    - .env
    - src/constants/api.ts
    - src/lib/api.ts
    - app.json
    - package.json
    - src/constants/theme.ts
    - src/hooks/use-theme.ts
    - src/hooks/use-color-scheme.ts
---

## What system/approach is used

The app uses Expo's built-in **`EXPO_PUBLIC_*` environment variable** mechanism (via `process.env`) combined with a small set of platform-aware fallback defaults. There is no centralized configuration loader, config schema validator, or feature-flag framework — runtime values are read inline at module load time.

## Key files and packages

- `.env` — single source of per-environment overrides; currently only defines `EXPO_PUBLIC_API_URL=http://192.168.1.8:8000`.
- `src/constants/api.ts` — the single place that reads `process.env.EXPO_PUBLIC_API_URL` and falls back to a hardcoded LAN IP (`http://192.168.100.6:8000`). The comment documents the intended override workflow for physical devices vs. simulator.
- `src/lib/api.ts` — consumes `API_BASE_URL` from `@/constants/api` for every HTTP call (REST and SSE), so changing the base URL in one place reconfigures all network behavior.
- `app.json` — Expo app manifest declaring name, slug, version, scheme, plugins (`expo-splash-screen`, `expo-font`, `expo-secure-store`, etc.), and experiments (`typedRoutes`, `reactCompiler`). This is the declarative build-time configuration consumed by Expo CLI / EAS.
- `package.json` — declares the Expo SDK version (`~54.0.37`), entry point (`expo-router/entry`), and dev scripts (`start`, `android`, `ios`, `web`, `lint`).
- `src/constants/theme.ts` — design-system constants (colors, typography, spacing, radii) exposed as `Colors.light` / `Colors.dark`; not loaded from env but serves as the static UI configuration layer.
- `src/hooks/use-theme.ts` + `src/hooks/use-color-scheme.ts` — runtime theme selection hook that resolves light/dark mode from React Native's `useColorScheme` and maps it to the `Colors` constant.

## Architecture and conventions

1. **Single env var surface.** All external runtime configuration flows through one constant: `API_BASE_URL`. Consumers never touch `process.env` directly — they import `@/constants/api`. This centralizes the env-to-app boundary.
2. **Platform-aware defaults.** When no `EXPO_PUBLIC_API_URL` is present, `src/constants/api.ts` picks a LAN address appropriate for the current `Platform.OS` (Android vs. everything else). The same pattern is used elsewhere for platform-specific values (e.g., `BottomTabInset`, `Fonts`, `MaxContentWidth` in `theme.ts`).
3. **Layered configuration:**
   - Build-time / declarative: `app.json` (Expo manifest, plugins, experiments).
   - Environment: `.env` → `process.env.EXPO_PUBLIC_*`.
   - Static constants: `src/constants/*` (theme, API base URL, channel metadata).
   - Runtime hooks: `use-theme.ts` resolves dark/light at render time.
4. **No secrets in the client.** Authentication tokens are passed as `Authorization: Bearer ...` headers on each request; there is no client-side secret store beyond what Expo Secure Store provides (declared as a plugin in `app.json`).
5. **No feature flags.** Feature toggles are not implemented; capability gaps are surfaced as `UnsupportedBackendCapabilityError` (status 501) rather than conditional code paths.

## Conventions and constraints

- **Environment variables must be prefixed `EXPO_PUBLIC_`** to be baked into the bundle by Expo. Only `EXPO_PUBLIC_API_URL` is currently used; adding more requires following this convention.
- **Base URL override is documented in code comments** in `src/constants/api.ts`: developers should set `EXPO_PUBLIC_API_URL` in their local `.env` when running against a non-local backend or a physical device, because `localhost` does not reach the host machine from the Android emulator (which needs `10.0.2.2`) or a physical phone (which needs the host's LAN IP).
- **All network calls go through `src/lib/api.ts`**, which prefixes `${API_BASE_URL}` to every path. Adding new endpoints means calling the existing `request`/`requestSSE` helpers — direct `fetch` calls with concatenated URLs are discouraged (and only appear in a couple of OAuth redirect helpers).
- **Theme values are immutable constants** exported from `src/constants/theme.ts`; components consume them via the `useTheme()` hook rather than reading color literals, ensuring consistent light/dark pairing.
- **Expo plugins and experiments are declared centrally** in `app.json` under `expo.plugins` and `expo.experiments`; new native capabilities require adding entries here rather than editing native project files directly.