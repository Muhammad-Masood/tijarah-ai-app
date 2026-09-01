---
kind: error_handling
name: Centralized ApiError with Hook-Level Error State in an Expo Monorepo
category: error_handling
scope:
    - '**'
source_files:
    - src/lib/api.ts
    - src/hooks/use-auth.tsx
    - src/hooks/use-product-hunt.ts
    - src/hooks/use-daraz-products.ts
    - src/app/_layout.tsx
---

## What system/approach is used

The app uses a single, centralized error type — `ApiError` (a subclass of `Error`) defined in `src/lib/api.ts` — as the universal transport for all network and validation failures. Every HTTP call goes through a private `request<T>()` helper that wraps `fetch`, catches connection-level failures, inspects `response.ok`, and throws `new ApiError(status, message)`. A companion `UnsupportedBackendCapabilityError` extends `ApiError` to signal missing backend features (status 501). For server-side FastAPI responses, `extractErrorMessage()` parses `{ detail }` strings, arrays of `{ msg }` entries, and nested records (including Daraz-specific `daraz_details`) into a single human-readable string; SSE error frames are handled by `sseErrorMessage()`. All thrown errors bubble up to React hooks, which catch them and store a plain `error: string | null` field on their result objects rather than propagating exceptions further.

There is no global error boundary, middleware layer, or Sentry-like reporting in this codebase. Errors are surfaced per-hook via state and rendered by the calling screens.

## Key files and packages

- `src/lib/api.ts` — defines `ApiError`, `UnsupportedBackendCapabilityError`, the `request<T>()` wrapper, SSE helpers (`consumeSSEFromFetch`, `consumeSSEViaXHR`, `streamToResult`), and every API endpoint function. This is the sole source of thrown errors.
- `src/hooks/use-auth.tsx` — re-exports `ApiError`; swallows invalid/expired tokens during hydration by clearing SecureStore and setting session to `null`.
- `src/hooks/use-product-hunt.ts` — example hook pattern: calls `productHunt(...)`, catches `ApiError`, sets `error` to `err.message` or a fallback string, clears state in `finally`.
- `src/hooks/use-daraz-products.ts` — another hook pattern: `.catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load Daraz products...'))`.
- `src/app/_layout.tsx` — root layout uses `Stack.Protected` guards to route between `(auth)` and `(app)` groups based on `session`; there is no top-level error screen.

## Architecture and conventions

1. **Throw, never return errors.** Network and validation failures are always raised as `ApiError` instances from `lib/api.ts`. Callers never receive an error object in a resolved promise.
2. **Status codes carry semantics.** Connection failures use status `0`; HTTP client errors use the actual response status (e.g. `400` for bad input, `401`/`422` for FastAPI validation); unsupported backend features use `501`; malformed stream results use `502`.
3. **User-facing messages are extracted centrally.** `extractErrorMessage()` turns backend JSON bodies into readable text so callers don't have to parse `{ detail }` themselves.
4. **Hooks own UI error state.** Each data-fetching hook exposes `{ isLoading, error, refetch }` and converts caught `ApiError` instances into a plain string stored in local `useState<string | null>`.
5. **Batch operations collect partial failures.** `uploadMarketplaceProductImages` iterates images, catches each upload individually, and returns `{ uploaded, failed: [{ index, image, error }] }` instead of aborting on the first failure.
6. **SSE streams resolve on `complete`, reject on `error`.** `streamToResult` maps the server's named events to Promise resolution/rejection, wrapping non-`ApiError` rejections with a generic message.
7. **No panics / no try-catch in business logic.** The only `try/catch` blocks exist around `fetch` calls (to convert network errors into `ApiError`) and inside `dispatchSSEFrame` (to tolerate malformed JSON payloads). Business functions like `normalizePublicHttpsUrl` throw `ApiError(400, ...)` directly rather than returning error tuples.
8. **Auth context swallows token errors silently.** During startup, if `getMe(token)` rejects, the token is deleted and the user is treated as unauthenticated — no toast or alert is shown.

## Conventions and constraints

- All API-layer failures must be expressed as `ApiError` (or a subclass) thrown from `lib/api.ts`; consumers should check `err instanceof ApiError` when mapping to UI messages.
- Validation failures in API-layer helpers raise `ApiError(400, ...)` with a descriptive message (e.g. missing HTTPS URL, unsupported image type, file too large).
- Hooks expose a stable shape `{ ..., error: string | null }` so screens can render a uniform error banner without inspecting exception types.
- Streaming endpoints rely on server-sent event names `"complete"` and `"error"`; any other event name is forwarded to the caller-provided `onEvent` callback.
- There is no repository-wide error logging, analytics, or crash-reporting integration visible in the code; errors remain in-process until consumed by a hook.