---
kind: frontend_style
name: Tijarah Design System — Expo Native StyleSheet with Centralized Theme Tokens
category: frontend_style
scope:
    - '**'
source_files:
    - src/constants/theme.ts
    - src/hooks/use-theme.ts
    - src/hooks/use-color-scheme.ts
    - src/components/themed-view.tsx
    - src/components/themed-text.tsx
    - src/global.css
    - app.json
    - package.json
---

## What system/approach is used

The app uses a **custom design-system approach built on React Native StyleSheet** rather than a CSS-in-JS library or Tailwind. All visual tokens (colors, typography, spacing, radius) are declared in a single source of truth (`src/constants/theme.ts`) and consumed through typed wrapper components (`ThemedView`, `ThemedText`) plus a `useTheme()` hook that resolves light/dark palettes at runtime via `react-native`'s `useColorScheme`. Web-specific font families are supplied as CSS custom properties in `src/global.css` and selected via `Platform.select`.

There is no Tailwind, SCSS, styled-components, or emotion setup — the only stylesheet in the repo is the small `global.css` root that defines `--font-display`, `--font-serif`, `--font-rounded`, and `--font-mono` variables used by the web platform branch of `Fonts`.

## Key files and packages

- `src/constants/theme.ts` — the single source of truth for the entire UI: `Colors.light` / `Colors.dark` palettes (surface/onSurface/primary/secondary/tertiary/error + fixed variants), `Typography` scale (displayLg → labelMd using Manrope weights), `Radius` scale, `Spacing` scale, `Fonts` (platform-selectable), and `ManropeFamily` weight-to-name mapping.
- `src/hooks/use-theme.ts` — thin hook returning `Colors['light' | 'dark']` based on the resolved color scheme.
- `src/hooks/use-color-scheme.ts` — re-exports `react-native`'s `useColorScheme`; a `.web` variant exists under `hooks/use-color-scheme.web.ts` for web-specific behavior.
- `src/components/themed-view.tsx` — wraps `View`, accepts a `type?: ThemeColor` to resolve background from the current palette.
- `src/components/themed-text.tsx` — wraps `Text`, maps string `type` props to both legacy styles (`default`, `title`, `small`, `subtitle`, `link`, `linkPrimary`, `code`) and the new design-system typography scale (`displayLg`, `headlineMd`, `bodyLg`, etc.), and applies `themeColor` for text color.
- `src/global.css` — declares CSS custom properties for font stacks used on the web platform.
- `app.json` — configures `userInterfaceStyle: 'automatic'`, splash screen colors per mode, and Android/iOS icon assets.
- `package.json` — dependencies include `@expo-google-fonts/manrope` (loaded via `expo-font` plugin), `@expo/ui` (installed but not yet used in the codebase), `expo-glass-effect`, and standard Expo/RN stack; no styling framework beyond RN StyleSheet.

## Architecture and conventions

1. **Token-first, component-second.** New UI should pick values from `Colors`, `Typography`, `Radius`, `Spacing` rather than hardcoding hex values or pixel sizes. The theme file comments explicitly describe this as the "Tijarah AI design system" with a calm ink-on-paper neutral palette, a single teal primary (`#0e6b5e`), slate + amber accents, and tonal layering over hairline borders instead of heavy shadows.
2. **Light/dark is automatic.** `app.json` sets `userInterfaceStyle: 'automatic'`; `useTheme()` picks `light` or `dark` from `Colors` and falls back to `light`. Dark mode is a hand-tuned tonal inversion of the same palette, so adding a token requires updating both `lightBase` and `darkBase`.
3. **Typed style primitives.** Components expose constrained prop types (`ThemeColor`, `type` union in `ThemedText`) so consumers cannot pass arbitrary strings without TypeScript catching them.
4. **Platform-aware fonts.** `Fonts` uses `Platform.select` to map `sans`/`serif`/`rounded`/`mono` to native iOS descriptors on mobile and CSS variable names (`var(--font-display)`, etc.) on web, which are defined in `global.css`.
5. **Legacy vs. new typography coexistence.** `ThemedText` keeps legacy `type` values (`default`, `title`, `small`, `subtitle`, `link`, `linkPrimary`, `code`) alongside the new design-system scale (`displayLg`, `headlineMd`, `bodyLg`, …) so existing screens remain unaffected while new screens adopt the new scale.
6. **No global CSS classes.** Styling is done entirely via inline `StyleSheet.create` objects merged into component styles; there are no BEM, utility-class, or CSS-module patterns in use.
7. **Splash/screen chrome matches the theme.** `app.json` splash background colors (`#f6f7f8` light, `#1a1f23` dark) mirror `Colors.light.background` / `Colors.dark.background`, keeping launch experience consistent with the app theme.

## Conventions and constraints

- **Use `ThemedView` / `ThemedText`** for all containers and text so they automatically adapt to light/dark mode via `useTheme()`. Hard-coding `backgroundColor` or `color` directly on `View`/`Text` bypasses the theme system.
- **Refer to tokens, not literals.** Colors should come from `Colors[...].primary`, `onSurface`, etc.; typography from `Typography.*`; spacing from `Spacing.*`; radius from `Radius.*`. This is enforced by the fact that the wrapper components accept `type`/`themeColor` typed against these token keys.
- **Dark mode must be symmetric.** When adding a new color token, both `lightBase` and `darkBase` entries must be provided because `useTheme()` returns one of the two palettes and the app has no fallback mechanism.
- **Web fonts go through CSS variables.** On web, font families are resolved via `var(--font-*)` defined in `global.css`; do not hardcode font family strings in components.
- **Splash and status bar colors should match the theme.** The `app.json` splash backgrounds and `backgroundColor` are already aligned with the theme tokens; new brand colors should be reflected there as well.
- **No Tailwind / CSS frameworks.** There is no `tailwind.config.js`, no PostCSS pipeline, and no utility class usage observed — adding one would require changes to the build configuration and would diverge from the established StyleSheet-based convention.