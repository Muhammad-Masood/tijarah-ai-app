# Hooks & State Management

<cite>
**Referenced Files in This Document**
- [use-theme.ts](file://src/hooks/use-theme.ts)
- [use-color-scheme.ts](file://src/hooks/use-color-scheme.ts)
- [use-color-scheme.web.ts](file://src/hooks/use-color-scheme.web.ts)
- [theme.ts](file://src/constants/theme.ts)
- [use-stagger.ts](file://src/hooks/use-stagger.ts)
- [use-catalog-search.ts](file://src/hooks/use-catalog-search.ts)
- [use-auth.tsx](file://src/hooks/use-auth.tsx)
- [use-products.ts](file://src/hooks/use-products.ts)
- [use-product.ts](file://src/hooks/use-product.ts)
- [use-daraz-access-token.ts](file://src/hooks/use-daraz-access-token.ts)
- [use-shopify-access-token.ts](file://src/hooks/use-shopify-access-token.ts)
- [use-daraz-products.ts](file://src/hooks/use-daraz-products.ts)
- [use-shopify-products.ts](file://src/hooks/use-shopify-products.ts)
- [api.ts](file://src/lib/api.ts)
</cite>

## Table of Contents
1. Introduction
2. Project Structure
3. Core Components
4. Architecture Overview
5. Detailed Component Analysis
6. Dependency Analysis
7. Performance Considerations
8. Troubleshooting Guide
9. Conclusion
10. Appendices

## Introduction
This document explains the custom hooks and state management patterns used across the application, with a focus on:
- Theme management (light/dark mode) via use-theme and use-color-scheme
- Utility hooks for animations (use-stagger) and search (use-catalog-search)
- A consistent data fetching pattern for API interactions
- State synchronization strategies and performance optimizations
- Error handling and loading states
- Guidance for creating new custom hooks, testing them, and debugging state issues

## Project Structure
The hooks live under src/hooks and are organized by feature or concern:
- Theming: use-theme, use-color-scheme (platform-specific), theme constants
- Utilities: use-stagger for animation timing
- Data fetching: use-auth, use-products, use-product, marketplace token resolvers, platform product fetchers, catalog search
- API layer: centralized request helpers, error types, streaming support

```mermaid
graph TB
subgraph "Theming"
T1["use-theme.ts"]
T2["use-color-scheme.ts / .web.ts"]
T3["constants/theme.ts"]
end
subgraph "Utilities"
U1["use-stagger.ts"]
U2["use-catalog-search.ts"]
end
subgraph "Auth & Data"
A1["use-auth.tsx"]
D1["use-products.ts"]
D2["use-product.ts"]
M1["use-daraz-access-token.ts"]
M2["use-shopify-access-token.ts"]
P1["use-daraz-products.ts"]
P2["use-shopify-products.ts"]
end
L1["lib/api.ts"]
T1 --> T2
T1 --> T3
U2 --> A1
D1 --> A1
D2 --> A1
P1 --> M1
P2 --> M2
D1 --> L1
D2 --> L1
P1 --> L1
P2 --> L1
U2 --> L1
```

**Diagram sources**
- [use-theme.ts:9-14](file://src/hooks/use-theme.ts#L9-L14)
- [use-color-scheme.ts:1-2](file://src/hooks/use-color-scheme.ts#L1-L2)
- [use-color-scheme.web.ts:7-21](file://src/hooks/use-color-scheme.web.ts#L7-L21)
- [theme.ts:117-141](file://src/constants/theme.ts#L117-L141)
- [use-stagger.ts:9-13](file://src/hooks/use-stagger.ts#L9-L13)
- [use-catalog-search.ts:38-149](file://src/hooks/use-catalog-search.ts#L38-L149)
- [use-auth.tsx:31-88](file://src/hooks/use-auth.tsx#L31-L88)
- [use-products.ts:16-57](file://src/hooks/use-products.ts#L16-L57)
- [use-product.ts:16-51](file://src/hooks/use-product.ts#L16-L51)
- [use-daraz-access-token.ts:19-65](file://src/hooks/use-daraz-access-token.ts#L19-L65)
- [use-shopify-access-token.ts:6-30](file://src/hooks/use-shopify-access-token.ts#L6-L30)
- [use-daraz-products.ts:120-183](file://src/hooks/use-daraz-products.ts#L120-L183)
- [use-shopify-products.ts:27-49](file://src/hooks/use-shopify-products.ts#L27-L49)
- [api.ts:53-77](file://src/lib/api.ts#L53-L77)

**Section sources**
- [use-theme.ts:9-14](file://src/hooks/use-theme.ts#L9-L14)
- [use-color-scheme.ts:1-2](file://src/hooks/use-color-scheme.ts#L1-L2)
- [use-color-scheme.web.ts:7-21](file://src/hooks/use-color-scheme.web.ts#L7-L21)
- [theme.ts:117-141](file://src/constants/theme.ts#L117-L141)
- [use-stagger.ts:9-13](file://src/hooks/use-stagger.ts#L9-L13)
- [use-catalog-search.ts:38-149](file://src/hooks/use-catalog-search.ts#L38-L149)
- [use-auth.tsx:31-88](file://src/hooks/use-auth.tsx#L31-L88)
- [use-products.ts:16-57](file://src/hooks/use-products.ts#L16-L57)
- [use-product.ts:16-51](file://src/hooks/use-product.ts#L16-L51)
- [use-daraz-access-token.ts:19-65](file://src/hooks/use-daraz-access-token.ts#L19-L65)
- [use-shopify-access-token.ts:6-30](file://src/hooks/use-shopify-access-token.ts#L6-L30)
- [use-daraz-products.ts:120-183](file://src/hooks/use-daraz-products.ts#L120-L183)
- [use-shopify-products.ts:27-49](file://src/hooks/use-shopify-products.ts#L27-L49)
- [api.ts:53-77](file://src/lib/api.ts#L53-L77)

## Core Components
- Theme management:
  - use-theme resolves the current color scheme and returns the matching color palette from constants.
  - use-color-scheme delegates to React Native’s hook; on web it hydrates safely to avoid SSR mismatch.
- Animation utility:
  - use-stagger provides a function that returns an entrance animation only when reduced motion is not enabled.
- Search:
  - use-catalog-search encapsulates paginated, deduplicated search with loading/error states and refetch/loadMore controls.
- Authentication:
  - AuthProvider manages session and access token persistence and hydration from secure storage.
- Data fetching:
  - use-products and use-product follow a consistent pattern: guard on accessToken, manage isLoading/error, expose refetch.
  - Marketplace token resolvers (Daraz/Shopify) centralize connection checks and expose isConnected/loading/error.
  - Platform product hooks map raw responses into a unified Product shape and de-duplicate items.

**Section sources**
- [use-theme.ts:9-14](file://src/hooks/use-theme.ts#L9-L14)
- [use-color-scheme.web.ts:7-21](file://src/hooks/use-color-scheme.web.ts#L7-L21)
- [use-stagger.ts:9-13](file://src/hooks/use-stagger.ts#L9-L13)
- [use-catalog-search.ts:38-149](file://src/hooks/use-catalog-search.ts#L38-L149)
- [use-auth.tsx:31-88](file://src/hooks/use-auth.tsx#L31-L88)
- [use-products.ts:16-57](file://src/hooks/use-products.ts#L16-L57)
- [use-product.ts:16-51](file://src/hooks/use-product.ts#L16-L51)
- [use-daraz-access-token.ts:19-65](file://src/hooks/use-daraz-access-token.ts#L19-L65)
- [use-shopify-access-token.ts:6-30](file://src/hooks/use-shopify-access-token.ts#L6-L30)
- [use-daraz-products.ts:120-183](file://src/hooks/use-daraz-products.ts#L120-L183)
- [use-shopify-products.ts:27-49](file://src/hooks/use-shopify-products.ts#L27-L49)

## Architecture Overview
The application uses a layered approach:
- UI components consume hooks for theme, animations, and data.
- Hooks depend on a shared authentication context for tokens.
- Data fetching hooks call a centralized API module that handles errors, headers, and streaming where needed.
- Marketplace integrations resolve per-platform tokens before fetching products.

```mermaid
sequenceDiagram
participant C as "Component"
participant H as "useProducts / useProduct"
participant A as "use-auth"
participant API as "lib/api.ts"
C->>H : render()
H->>A : read accessToken
alt has token
H->>API : GET /product/get_products or /product/get_product/{id}
API-->>H : data | ApiError
H->>H : set state (products/product, isLoading, error)
H-->>C : {data, isLoading, error, refetch}
else no token yet
H-->>C : {isLoading : true, error : null}
end
```

**Diagram sources**
- [use-products.ts:16-57](file://src/hooks/use-products.ts#L16-L57)
- [use-product.ts:16-51](file://src/hooks/use-product.ts#L16-L51)
- [use-auth.tsx:31-88](file://src/hooks/use-auth.tsx#L31-L88)
- [api.ts:53-77](file://src/lib/api.ts#L53-L77)

## Detailed Component Analysis

### Theme Management: use-theme and use-color-scheme
- use-theme reads the current color scheme and returns the corresponding Colors object (light or dark). It falls back to light if the scheme is unknown.
- use-color-scheme re-exports React Native’s hook on native platforms. On web, it ensures client-side hydration before returning the scheme to avoid mismatches during static rendering.

```mermaid
flowchart TD
Start(["Render"]) --> Scheme["Read color scheme"]
Scheme --> Valid{"Scheme valid?"}
Valid -- Yes --> Palette["Select Colors[light|dark]"]
Valid -- No --> Fallback["Fallback to 'light'"]
Palette --> Return["Return theme colors"]
Fallback --> Return
```

**Diagram sources**
- [use-theme.ts:9-14](file://src/hooks/use-theme.ts#L9-L14)
- [use-color-scheme.ts:1-2](file://src/hooks/use-color-scheme.ts#L1-L2)
- [use-color-scheme.web.ts:7-21](file://src/hooks/use-color-scheme.web.ts#L7-L21)
- [theme.ts:117-141](file://src/constants/theme.ts#L117-L141)

**Section sources**
- [use-theme.ts:9-14](file://src/hooks/use-theme.ts#L9-L14)
- [use-color-scheme.ts:1-2](file://src/hooks/use-color-scheme.ts#L1-L2)
- [use-color-scheme.web.ts:7-21](file://src/hooks/use-color-scheme.web.ts#L7-L21)
- [theme.ts:117-141](file://src/constants/theme.ts#L117-L141)

### Animation Timing: use-stagger
- Provides a factory function that returns an entrance animation based on device accessibility settings. When reduced motion is enabled, it returns undefined to skip animations.

```mermaid
flowchart TD
S(["Call useStagger(delay)"]) --> Check["Check reduced motion"]
Check -- Enabled --> None["Return undefined (no animation)"]
Check -- Disabled --> Anim["Return FadeInDown with delay/duration/spring"]
None --> End(["Use in component"])
Anim --> End
```

**Diagram sources**
- [use-stagger.ts:9-13](file://src/hooks/use-stagger.ts#L9-L13)

**Section sources**
- [use-stagger.ts:9-13](file://src/hooks/use-stagger.ts#L9-L13)

### Search: use-catalog-search
- Encapsulates paginated search with:
  - Query normalization and enable/disable gating
  - Pagination state (current page, total pages, total products)
  - Deduplication of results by item_id
  - Loading states for initial load vs “load more”
  - Error handling using ApiError messages
  - refetch and loadMore actions

```mermaid
flowchart TD
Start(["Mount / query changes"]) --> Guard{"enabled && query?"}
Guard -- No --> Reset["Reset state and return"]
Guard -- Yes --> Fetch["fetchPage(page, 'replace'|'append')"]
Fetch --> CallAPI["catalogSearch(accessToken, params)"]
CallAPI --> Update["Update totals, page, products (dedupe)"]
Update --> Done(["Expose {products, isLoading, error, refetch, loadMore}"])
Reset --> Done
```

**Diagram sources**
- [use-catalog-search.ts:38-149](file://src/hooks/use-catalog-search.ts#L38-L149)
- [api.ts:53-77](file://src/lib/api.ts#L53-L77)

**Section sources**
- [use-catalog-search.ts:38-149](file://src/hooks/use-catalog-search.ts#L38-L149)

### Authentication: use-auth
- Persists and hydrates an access token from secure storage.
- Exposes session and token values plus sign-in/sign-up/sign-out methods.
- Throws if used outside its provider.

```mermaid
sequenceDiagram
participant App as "App"
participant Provider as "AuthProvider"
participant Store as "SecureStore"
participant API as "getMe()"
App->>Provider : mount
Provider->>Store : read token
alt token exists
Provider->>API : getMe(token)
API-->>Provider : user
Provider-->>App : session + accessToken
else no token
Provider-->>App : session = null, accessToken = null
end
```

**Diagram sources**
- [use-auth.tsx:31-88](file://src/hooks/use-auth.tsx#L31-L88)
- [api.ts:338-342](file://src/lib/api.ts#L338-L342)

**Section sources**
- [use-auth.tsx:31-88](file://src/hooks/use-auth.tsx#L31-L88)

### Data Fetching Patterns: use-products and use-product
- Both hooks:
  - Wait for accessToken before making requests
  - Manage isLoading, error, and data state
  - Provide refetch via a reloadKey increment
  - Use cancellation flags to prevent state updates after unmount

```mermaid
sequenceDiagram
participant Comp as "Component"
participant Hook as "useProducts / useProduct"
participant Auth as "use-auth"
participant API as "lib/api.ts"
Comp->>Hook : render
Hook->>Auth : accessToken
alt available
Hook->>API : GET endpoint
API-->>Hook : data | ApiError
Hook->>Hook : setState(data|error, isLoading=false)
Hook-->>Comp : {data, isLoading, error, refetch}
else unavailable
Hook-->>Comp : {isLoading=true, error=null}
end
```

**Diagram sources**
- [use-products.ts:16-57](file://src/hooks/use-products.ts#L16-L57)
- [use-product.ts:16-51](file://src/hooks/use-product.ts#L16-L51)
- [api.ts:53-77](file://src/lib/api.ts#L53-L77)

**Section sources**
- [use-products.ts:16-57](file://src/hooks/use-products.ts#L16-L57)
- [use-product.ts:16-51](file://src/hooks/use-product.ts#L16-L51)

### Marketplace Tokens and Products: Daraz and Shopify
- Token resolvers:
  - use-daraz-access-token and use-shopify-access-token fetch connections and extract encrypted_access_token for the respective platform.
  - They expose isConnected, isLoading, error, and refetch.
- Product hooks:
  - Map raw marketplace responses into a unified Product type.
  - De-duplicate products by id.
  - Compose isLoading and error from both token resolution and product fetching.

```mermaid
classDiagram
class UseDarazAccessToken {
+darazAccessToken : string|null
+isConnected : boolean
+isLoading : boolean
+error : string|null
+refetch() : void
}
class UseShopifyAccessToken {
+shopifyAccessToken : string|null
+isConnected : boolean
+isLoading : boolean
+error : string|null
+refetch() : void
}
class UseDarazProducts {
+products : Product[]
+isConnected : boolean
+isLoading : boolean
+error : string|null
+refetch() : void
}
class UseShopifyProducts {
+products : Product[]
+isConnected : boolean
+isLoading : boolean
+error : string|null
+refetch() : void
}
UseDarazProducts --> UseDarazAccessToken : "uses"
UseShopifyProducts --> UseShopifyAccessToken : "uses"
```

**Diagram sources**
- [use-daraz-access-token.ts:19-65](file://src/hooks/use-daraz-access-token.ts#L19-L65)
- [use-shopify-access-token.ts:6-30](file://src/hooks/use-shopify-access-token.ts#L6-L30)
- [use-daraz-products.ts:120-183](file://src/hooks/use-daraz-products.ts#L120-L183)
- [use-shopify-products.ts:27-49](file://src/hooks/use-shopify-products.ts#L27-L49)

**Section sources**
- [use-daraz-access-token.ts:19-65](file://src/hooks/use-daraz-access-token.ts#L19-L65)
- [use-shopify-access-token.ts:6-30](file://src/hooks/use-shopify-access-token.ts#L6-L30)
- [use-daraz-products.ts:120-183](file://src/hooks/use-daraz-products.ts#L120-L183)
- [use-shopify-products.ts:27-49](file://src/hooks/use-shopify-products.ts#L27-L49)

### API Layer: Centralized Requests and Errors
- request wraps fetch with error extraction and ApiError throwing for non-ok responses.
- Streaming support for server-sent events via XHR on native and ReadableStream on web.
- streamToResult orchestrates SSE streams to produce a final result or error.

```mermaid
flowchart TD
R["request(path, init)"] --> Fetch["fetch(url, init)"]
Fetch --> Ok{"response.ok?"}
Ok -- No --> Throw["throw ApiError(status, message)"]
Ok -- Yes --> Parse["parse JSON body"]
Parse --> Return["return typed data"]
```

**Diagram sources**
- [api.ts:53-77](file://src/lib/api.ts#L53-L77)
- [api.ts:215-286](file://src/lib/api.ts#L215-L286)

**Section sources**
- [api.ts:53-77](file://src/lib/api.ts#L53-L77)
- [api.ts:215-286](file://src/lib/api.ts#L215-L286)

## Dependency Analysis
- Theming depends on use-color-scheme and theme constants.
- Data hooks depend on use-auth for tokens and lib/api for network calls.
- Marketplace product hooks depend on their respective token resolvers and the API layer.
- Catalog search depends on auth and API, with local deduplication and pagination logic.

```mermaid
graph LR
useTheme["use-theme.ts"] --> useColor["use-color-scheme.*"]
useTheme --> themeConst["constants/theme.ts"]
useCatalog["use-catalog-search.ts"] --> useAuth["use-auth.tsx"]
useCatalog --> api["lib/api.ts"]
useProducts["use-products.ts"] --> useAuth
useProducts --> api
useProduct["use-product.ts"] --> useAuth
useProduct --> api
darazTok["use-daraz-access-token.ts"] --> api
shopTok["use-shopify-access-token.ts"] --> api
darazProd["use-daraz-products.ts"] --> darazTok
darazProd --> api
shopProd["use-shopify-products.ts"] --> shopTok
shopProd --> api
```

**Diagram sources**
- [use-theme.ts:9-14](file://src/hooks/use-theme.ts#L9-L14)
- [use-color-scheme.ts:1-2](file://src/hooks/use-color-scheme.ts#L1-L2)
- [use-color-scheme.web.ts:7-21](file://src/hooks/use-color-scheme.web.ts#L7-L21)
- [theme.ts:117-141](file://src/constants/theme.ts#L117-L141)
- [use-catalog-search.ts:38-149](file://src/hooks/use-catalog-search.ts#L38-L149)
- [use-auth.tsx:31-88](file://src/hooks/use-auth.tsx#L31-L88)
- [use-products.ts:16-57](file://src/hooks/use-products.ts#L16-L57)
- [use-product.ts:16-51](file://src/hooks/use-product.ts#L16-L51)
- [use-daraz-access-token.ts:19-65](file://src/hooks/use-daraz-access-token.ts#L19-L65)
- [use-shopify-access-token.ts:6-30](file://src/hooks/use-shopify-access-token.ts#L6-L30)
- [use-daraz-products.ts:120-183](file://src/hooks/use-daraz-products.ts#L120-L183)
- [use-shopify-products.ts:27-49](file://src/hooks/use-shopify-products.ts#L27-L49)
- [api.ts:53-77](file://src/lib/api.ts#L53-L77)

**Section sources**
- [use-theme.ts:9-14](file://src/hooks/use-theme.ts#L9-L14)
- [use-catalog-search.ts:38-149](file://src/hooks/use-catalog-search.ts#L38-L149)
- [use-auth.tsx:31-88](file://src/hooks/use-auth.tsx#L31-L88)
- [use-products.ts:16-57](file://src/hooks/use-products.ts#L16-L57)
- [use-product.ts:16-51](file://src/hooks/use-product.ts#L16-L51)
- [use-daraz-access-token.ts:19-65](file://src/hooks/use-daraz-access-token.ts#L19-L65)
- [use-shopify-access-token.ts:6-30](file://src/hooks/use-shopify-access-token.ts#L6-L30)
- [use-daraz-products.ts:120-183](file://src/hooks/use-daraz-products.ts#L120-L183)
- [use-shopify-products.ts:27-49](file://src/hooks/use-shopify-products.ts#L27-L49)
- [api.ts:53-77](file://src/lib/api.ts#L53-L77)

## Performance Considerations
- Avoid redundant requests:
  - Data hooks wait for accessToken before firing requests.
  - Marketplace product hooks gate on token resolution completion.
- Prevent race conditions:
  - use-catalog-search uses requestId refs to ignore stale responses.
  - Data hooks use cancellation flags to avoid state updates after unmount.
- Minimize re-renders:
  - Memoize derived values (e.g., suggested prompts) where applicable.
  - Keep stable callbacks for refetch to avoid unnecessary effect triggers.
- Respect accessibility:
  - use-stagger skips animations when reduced motion is enabled.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and how they are handled:
- Network failures:
  - The API layer throws ApiError with human-readable messages extracted from backend error bodies.
- Unauthenticated requests:
  - Data hooks check for accessToken before calling APIs; if missing, they remain in loading state without firing requests.
- Stale updates:
  - Request IDs and cancellation flags ensure old responses do not overwrite newer state.
- Missing marketplace connection:
  - Token resolver hooks set isConnected to false and clear products when no connection is found.
- Web hydration mismatch:
  - use-color-scheme.web delays returning the scheme until after hydration to avoid flash of wrong theme.

**Section sources**
- [api.ts:5-13](file://src/lib/api.ts#L5-L13)
- [api.ts:53-77](file://src/lib/api.ts#L53-L77)
- [use-products.ts:25-54](file://src/hooks/use-products.ts#L25-L54)
- [use-product.ts:25-48](file://src/hooks/use-product.ts#L25-L48)
- [use-catalog-search.ts:59-100](file://src/hooks/use-catalog-search.ts#L59-L100)
- [use-daraz-products.ts:139-180](file://src/hooks/use-daraz-products.ts#L139-L180)
- [use-shopify-products.ts:36-46](file://src/hooks/use-shopify-products.ts#L36-L46)
- [use-color-scheme.web.ts:7-21](file://src/hooks/use-color-scheme.web.ts#L7-L21)

## Conclusion
The application employs a consistent, testable pattern for custom hooks:
- Separate concerns: theming, utilities, auth, data fetching, and marketplace integration.
- Centralize networking and error handling in lib/api.
- Gate requests on authentication and connection readiness.
- Provide predictable state shapes with isLoading, error, and refetch for all data hooks.
This structure makes it straightforward to add new features, test hooks in isolation, and maintain reliable UX across platforms.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Creating a New Custom Hook: Guidelines
Follow these steps to create a new hook aligned with existing patterns:
- Inputs and options:
  - Accept parameters that affect behavior (e.g., ids, filters, enabled flag).
- Dependencies:
  - Use use-auth for tokens when calling protected endpoints.
  - Use marketplace token resolvers if integrating with Daraz/Shopify.
- State shape:
  - Include data, isLoading, error, and refetch. For lists, include pagination fields as needed.
- Effects:
  - Guard effects on required inputs (e.g., accessToken).
  - Use cancellation flags to avoid state updates after unmount.
- API calls:
  - Call functions from lib/api and handle ApiError consistently.
- Cleanup:
  - Close resources (e.g., sockets) in effect cleanup.
- Testing:
  - Mock use-auth and lib/api functions.
  - Assert state transitions for loading, success, and error paths.
  - For async flows, advance timers or await promises in tests.

[No sources needed since this section provides general guidance]

### Example: Building a Paginated List Hook
Conceptual flow for a new list hook:
```mermaid
flowchart TD
Start(["Mount with options"]) --> Guard{"enabled && required inputs?"}
Guard -- No --> Idle["Set empty state, return"]
Guard -- Yes --> Load["setLoading(true), setError(null)"]
Load --> Fetch["call API with page/token"]
Fetch --> Success{"ok?"}
Success -- No --> Err["setError(ApiError.message), setLoading(false)"]
Success -- Yes --> Update["setState(data), setLoading(false)"]
Err --> Return(["Expose {data, isLoading, error, refetch}"])
Update --> Return
Idle --> Return
```

[No sources needed since this diagram shows conceptual workflow, not actual code structure]