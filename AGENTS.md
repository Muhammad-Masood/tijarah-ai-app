# Repository Guidelines

## Project Structure & Module Organization

This Expo 54 React Native application uses TypeScript and Expo Router. Route files live in `src/app/`: `(auth)` contains unauthenticated screens, `(app)` contains protected screens, and `(app)/(tabs)` defines the main tabs. Reusable UI belongs in `src/components/`; data hooks in `src/hooks/`; shared values in `src/constants/`; and API helpers in `src/lib/`. Static images and Expo icon assets live under `assets/`. Keep route files focused on screen composition and move reusable behavior into hooks or components.

## Build, Test, and Development Commands

- `npm install` installs the locked dependencies from `package-lock.json`.
- `npm start` launches the Expo development server.
- `npm run android`, `npm run ios`, or `npm run web` launches the corresponding target. iOS requires a compatible macOS environment.
- `npm run lint` runs Expo's ESLint configuration.
- `npx tsc --noEmit` performs a strict TypeScript check without generating files.

Avoid `npm run reset-project` during normal development; it replaces the starter structure.

## Coding Style & Naming Conventions

Use TypeScript/TSX, two-space indentation, semicolons, and trailing commas in multiline constructs. Follow the existing Expo ESLint rules and keep strict typing enabled; avoid `any` when a concrete type or `unknown` is appropriate. Name components and types in PascalCase, functions and variables in camelCase, and files in kebab-case (for example, `product-chat.tsx` and `use-products.ts`). Prefix hooks with `use`. Prefer the configured `@/` alias for imports from `src` and `@/assets/` for assets.

## Testing Guidelines

No automated test framework or coverage threshold is configured. Before submitting changes, run `npm run lint` and `npx tsc --noEmit`, then manually exercise affected flows on at least one target. If introducing tests, place them beside the source as `*.test.ts` or `*.test.tsx`, add the runner to `package.json`, and document the command here.

## Commit & Pull Request Guidelines

Recent history generally uses short, imperative Conventional Commit prefixes such as `feat:`, `fix:`, and `refactor:`. Use a scoped summary where useful, for example `fix(auth): preserve session on restart`; avoid vague messages such as `add`. Pull requests should explain the user-visible effect, list validation performed and platforms tested, link related issues, and include screenshots or recordings for UI changes. Keep each PR focused and call out configuration or API-contract changes.

## Security & Configuration

Set backend overrides with `EXPO_PUBLIC_API_URL` in an untracked `.env` file. Never commit tokens, credentials, signing keys, or production secrets. Remember that every `EXPO_PUBLIC_*` value is bundled into the client and is not secret.
