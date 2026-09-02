# API Integration

<cite>
**Referenced Files in This Document**
- [api.ts](file://src/lib/api.ts)
- [api.ts](file://src/constants/api.ts)
- [use-shopify-products.ts](file://src/hooks/use-shopify-products.ts)
- [use-daraz-products.ts](file://src/hooks/use-daraz-products.ts)
- [use-shopify-access-token.ts](file://src/hooks/use-shopify-access-token.ts)
- [use-daraz-access-token.ts](file://src/hooks/use-daraz-access-token.ts)
- [use-auth.tsx](file://src/hooks/use-auth.tsx)
- [use-finance-dashboard.ts](file://src/hooks/use-finance-dashboard.ts)
- [use-finance-transactions.ts](file://src/hooks/use-finance-transactions.ts)
- [use-finance-payouts.ts](file://src/hooks/use-finance-payouts.ts)
- [use-finance-profit.ts](file://src/hooks/use-finance-profit.ts)
- [use-finance-cashflow.ts](file://src/hooks/use-finance-cashflow.ts)
- [use-finance-fees.ts](file://src/hooks/use-finance-fees.ts)
- [use-finance-settlement.ts](file://src/hooks/use-finance-settlement.ts)
</cite>

## Update Summary
**Changes Made**
- Added comprehensive finance data retrieval functions with over 230 new lines of code
- Enhanced error handling for FastAPI responses with improved detail extraction
- Added specialized endpoints for dashboard, transactions, payouts, and settlement data
- Implemented SSE streaming support for real-time financial updates
- Created dedicated hooks for each finance module (dashboard, transactions, payouts, profit, cashflow, fees, settlement)
- Updated architecture to support both marketplace integrations and finance data access

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Finance Data Layer](#finance-data-layer)
7. [Dependency Analysis](#dependency-analysis)
8. [Performance Considerations](#performance-considerations)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Conclusion](#conclusion)
11. [Appendices](#appendices)

## Introduction
This document explains the enhanced API integration patterns used in the application, focusing on the centralized API client with comprehensive finance data retrieval capabilities, authentication and headers, marketplace-specific hooks for Shopify and Daraz, real-time updates via Server-Sent Events (SSE), error handling strategies, and guidance for adding new endpoints and maintaining backward compatibility.

## Project Structure
The API layer is now a comprehensive module that provides typed functions for HTTP requests, SSE streaming, marketplace integrations, and extensive finance data operations. Hooks encapsulate platform-specific flows (Shopify, Daraz) and finance modules, composing them with authentication state to fetch products, manage connections, and retrieve financial analytics.

```mermaid
graph TB
subgraph "API Layer"
A["src/lib/api.ts"]
B["src/constants/api.ts"]
end
subgraph "Marketplace Hooks"
C["src/hooks/use-auth.tsx"]
D["src/hooks/use-shopify-access-token.ts"]
E["src/hooks/use-daraz-access-token.ts"]
F["src/hooks/use-shopify-products.ts"]
G["src/hooks/use-daraz-products.ts"]
end
subgraph "Finance Hooks"
H["src/hooks/use-finance-dashboard.ts"]
I["src/hooks/use-finance-transactions.ts"]
J["src/hooks/use-finance-payouts.ts"]
K["src/hooks/use-finance-profit.ts"]
L["src/hooks/use-finance-cashflow.ts"]
M["src/hooks/use-finance-fees.ts"]
N["src/hooks/use-finance-settlement.ts"]
end
B --> A
C --> A
D --> A
E --> A
F --> A
G --> A
H --> A
I --> A
J --> A
K --> A
L --> A
M --> A
N --> A
```

**Diagram sources**
- [api.ts:1-800](file://src/lib/api.ts#L1-L800)
- [api.ts:1700-1817](file://src/lib/api.ts#L1700-L1817)
- [use-auth.tsx:1-91](file://src/hooks/use-auth.tsx#L1-L91)
- [use-shopify-access-token.ts:1-31](file://src/hooks/use-shopify-access-token.ts#L1-L31)
- [use-daraz-access-token.ts:1-66](file://src/hooks/use-daraz-access-token.ts#L1-L66)
- [use-shopify-products.ts:1-50](file://src/hooks/use-shopify-products.ts#L1-L50)
- [use-daraz-products.ts:1-184](file://src/hooks/use-daraz-products.ts#L1-L184)
- [use-finance-dashboard.ts:1-76](file://src/hooks/use-finance-dashboard.ts#L1-L76)
- [use-finance-transactions.ts:1-86](file://src/hooks/use-finance-transactions.ts#L1-L86)
- [use-finance-payouts.ts:1-78](file://src/hooks/use-finance-payouts.ts#L1-L78)
- [use-finance-profit.ts:1-78](file://src/hooks/use-finance-profit.ts#L1-L78)
- [use-finance-cashflow.ts:1-70](file://src/hooks/use-finance-cashflow.ts#L1-L70)
- [use-finance-fees.ts:1-78](file://src/hooks/use-finance-fees.ts#L1-L78)
- [use-finance-settlement.ts:1-74](file://src/hooks/use-finance-settlement.ts#L1-L74)

**Section sources**
- [api.ts:1-800](file://src/lib/api.ts#L1-L800)
- [api.ts:1700-1817](file://src/lib/api.ts#L1700-L1817)
- [use-auth.tsx:1-91](file://src/hooks/use-auth.tsx#L1-L91)
- [use-shopify-access-token.ts:1-31](file://src/hooks/use-shopify-access-token.ts#L1-L31)
- [use-daraz-access-token.ts:1-66](file://src/hooks/use-daraz-access-token.ts#L1-L66)
- [use-shopify-products.ts:1-50](file://src/hooks/use-shopify-products.ts#L1-L50)
- [use-daraz-products.ts:1-184](file://src/hooks/use-daraz-products.ts#L1-L184)
- [use-finance-dashboard.ts:1-76](file://src/hooks/use-finance-dashboard.ts#L1-L76)
- [use-finance-transactions.ts:1-86](file://src/hooks/use-finance-transactions.ts#L1-L86)
- [use-finance-payouts.ts:1-78](file://src/hooks/use-finance-payouts.ts#L1-L78)
- [use-finance-profit.ts:1-78](file://src/hooks/use-finance-profit.ts#L1-L78)
- [use-finance-cashflow.ts:1-70](file://src/hooks/use-finance-cashflow.ts#L1-L70)
- [use-finance-fees.ts:1-78](file://src/hooks/use-finance-fees.ts#L1-L78)
- [use-finance-settlement.ts:1-74](file://src/hooks/use-finance-settlement.ts#L1-L74)

## Core Components
- Centralized HTTP client with unified error handling and JSON parsing.
- SSE streaming support for both web and React Native environments.
- Marketplace adapters for Shopify and Daraz with typed request/response models.
- Finance data layer with comprehensive endpoints for dashboard, transactions, payouts, profit analysis, cash flow, fee breakdown, and settlement reconciliation.
- Authentication context providing bearer tokens for protected endpoints.
- Constants for base URL configuration across platforms.

Key responsibilities:
- Normalize and parse responses from different marketplaces into a consistent Product model.
- Manage connection tokens for each marketplace.
- Provide typed helpers for creating, updating, deleting, and publishing products.
- Stream long-running operations (e.g., returns insights, review analysis) with progress events.
- Retrieve comprehensive financial analytics and reconciliation data.

**Section sources**
- [api.ts:53-77](file://src/lib/api.ts#L53-L77)
- [api.ts:79-286](file://src/lib/api.ts#L79-L286)
- [api.ts:1700-1817](file://src/lib/api.ts#L1700-L1817)
- [use-auth.tsx:27-79](file://src/hooks/use-auth.tsx#L27-L79)
- [api.ts:10-16](file://src/constants/api.ts#L10-L16)

## Architecture Overview
The architecture separates concerns into three layers:
- API client: low-level HTTP and SSE primitives with enhanced finance data support.
- Hooks: stateful composition of auth, marketplace connections, finance modules, and data fetching.
- UI: consumes hooks to render product lists, financial dashboards, and actions.

```mermaid
sequenceDiagram
participant UI as "UI Component"
participant Hook as "use*Finance / use*Products"
participant Auth as "useAuth"
participant Conn as "use*AccessToken"
participant API as "src/lib/api.ts"
participant Backend as "Backend"
UI->>Hook : mount
Hook->>Auth : read accessToken
Hook->>Conn : resolve marketplace token
alt connected
Hook->>API : call finance/marketplace endpoint(s)
API->>Backend : HTTP/SSE request
Backend-->>API : response/stream
API-->>Hook : typed result(s)
Hook-->>UI : data, loading, error
else not connected
Hook-->>UI : empty list, no error
end
```

**Diagram sources**
- [use-shopify-products.ts:27-49](file://src/hooks/use-shopify-products.ts#L27-L49)
- [use-daraz-products.ts:120-183](file://src/hooks/use-daraz-products.ts#L120-L183)
- [use-finance-dashboard.ts:33-72](file://src/hooks/use-finance-dashboard.ts#L33-L72)
- [use-finance-transactions.ts:42-82](file://src/hooks/use-finance-transactions.ts#L42-L82)
- [use-auth.tsx:31-79](file://src/hooks/use-auth.tsx#L31-L79)
- [use-shopify-access-token.ts:14-29](file://src/hooks/use-shopify-access-token.ts#L14-L29)
- [use-daraz-access-token.ts:29-64](file://src/hooks/use-daraz-access-token.ts#L29-L64)
- [api.ts:53-77](file://src/lib/api.ts#L53-L77)
- [api.ts:215-286](file://src/lib/api.ts#L215-L286)

## Detailed Component Analysis

### Centralized API Client (src/lib/api.ts)
- HTTP request wrapper:
  - Builds URLs using the base URL constant.
  - Parses JSON only when content-type indicates JSON.
  - Throws a typed ApiError with status and human-readable message extracted from backend error bodies.
- Enhanced error extraction:
  - Handles FastAPI-style detail strings, validation arrays, and nested structures including marketplace-specific details.
  - Improved handling of `daraz_details` arrays with field-specific error messages.
- SSE streaming:
  - Web path reads ReadableStream chunks and parses frames separated by blank lines.
  - React Native path uses XMLHttpRequest onprogress to incrementally parse frames.
  - Normalizes event names (defaults to "message") and joins multiple data lines before JSON parsing.
- Streaming result helper:
  - Wraps SSE streams to resolve on "complete", reject on "error", or if stream ends without either.
  - Exposes an onEvent callback for intermediate progress events.

Authentication headers:
- All protected endpoints include Authorization: Bearer <token>.
- Marketplace-specific headers:
  - x-daraz-access-token for Daraz endpoints.
  - x-shopify-access-token for Shopify endpoints.

Enhanced endpoints covered include:
- Authentication: signup, login, get current user.
- Marketplace management: supported marketplaces, connections, OAuth authorize URLs.
- Products: local CRUD, Shopify and Daraz product retrieval, categories, collections, orders.
- Publishing: publish to connected stores.
- Storage: upload/cleanup images, migrate image sources.
- Analytics/insights: returns insights and review analysis via SSE.
- **Finance data**: dashboard, transactions, payouts, profit analysis, cash flow, fee breakdown, settlement reconciliation.

Complexity notes:
- Response normalization functions handle varying field names and nesting to ensure stable types for callers.
- Deduplication utilities prevent duplicate products when sources return overlapping IDs.
- **Finance data normalization** handles complex financial structures with proper type safety.

**Section sources**
- [api.ts:5-13](file://src/lib/api.ts#L5-L13)
- [api.ts:15-51](file://src/lib/api.ts#L15-L51)
- [api.ts:53-77](file://src/lib/api.ts#L53-L77)
- [api.ts:79-137](file://src/lib/api.ts#L79-L137)
- [api.ts:144-204](file://src/lib/api.ts#L144-L204)
- [api.ts:206-286](file://src/lib/api.ts#L206-L286)
- [api.ts:317-436](file://src/lib/api.ts#L317-L436)
- [api.ts:448-459](file://src/lib/api.ts#L448-L459)
- [api.ts:468-505](file://src/lib/api.ts#L468-L505)
- [api.ts:629-638](file://src/lib/api.ts#L629-L638)
- [api.ts:722-784](file://src/lib/api.ts#L722-L784)
- [api.ts:821-908](file://src/lib/api.ts#L821-L908)
- [api.ts:915-1006](file://src/lib/api.ts#L915-L1006)
- [api.ts:1072-1107](file://src/lib/api.ts#L1072-L1107)
- [api.ts:1109-1153](file://src/lib/api.ts#L1109-L1153)
- [api.ts:1196-1207](file://src/lib/api.ts#L1196-L1207)
- [api.ts:1257-1281](file://src/lib/api.ts#L1257-L1281)
- [api.ts:1342-1364](file://src/lib/api.ts#L1342-L1364)
- [api.ts:1556-1582](file://src/lib/api.ts#L1556-L1582)
- [api.ts:1700-1817](file://src/lib/api.ts#L1700-L1817)

### API Constants and Base URL (src/constants/api.ts)
- Base URL selection:
  - Uses environment variable when available.
  - Defaults to a LAN IP suitable for Android emulator and iOS simulator; adjust for physical devices.
- Logging for debugging network configuration.

Best practices:
- Override EXPO_PUBLIC_API_URL for production or remote backends.
- Ensure trailing slash removal to avoid double slashes in URLs.

**Section sources**
- [api.ts:10-16](file://src/constants/api.ts#L10-L16)

### Authentication Flow (src/hooks/use-auth.tsx)
- Persists access token securely and hydrates session on app start.
- Provides sign-up, sign-in, and sign-out methods that update persisted token and session.
- Supplies accessToken to all downstream hooks and API calls.

Error handling:
- Invalid/expired tokens are cleared automatically.
- Errors during hydration do not crash the app; they reset to unauthenticated state.

**Section sources**
- [use-auth.tsx:13-29](file://src/hooks/use-auth.tsx#L13-L29)
- [use-auth.tsx:31-79](file://src/hooks/use-auth.tsx#L31-L79)
- [use-auth.tsx:84-91](file://src/hooks/use-auth.tsx#L84-L91)

### Marketplace Access Token Resolution
- Shopify:
  - Fetches marketplace connections and finds the Shopify connection with an encrypted access token.
  - Exposes isConnected flag based on presence of token.
- Daraz:
  - Similar logic for Daraz connection token.
  - Exposes isConnected, isLoading, and error states for consumers.

These hooks centralize connection discovery so product hooks can focus on data mapping and presentation.

**Section sources**
- [use-shopify-access-token.ts:1-31](file://src/hooks/use-shopify-access-token.ts#L1-L31)
- [use-daraz-access-token.ts:1-66](file://src/hooks/use-daraz-access-token.ts#L1-L66)

### Shopify Products Hook (src/hooks/use-shopify-products.ts)
- Maps raw Shopify product payloads to the shared Product type.
- Fetches products when authenticated and connected.
- De-duplicates products by ID and manages loading/error states.
- Supports refetching by toggling a reload key and refreshing connection state.

Data mapping highlights:
- Aggregates images from variants and featured image.
- Derives price from first variant.
- Sets category from product type or category name.

**Section sources**
- [use-shopify-products.ts:7-25](file://src/hooks/use-shopify-products.ts#L7-L25)
- [use-shopify-products.ts:27-49](file://src/hooks/use-shopify-products.ts#L27-L49)

### Daraz Products Hook (src/hooks/use-daraz-products.ts)
- Extracts product arrays from varied response shapes returned by the backend.
- Maps Daraz items to the shared Product type, preferring English attributes when available.
- Computes stock quantity by summing SKU quantities.
- Manages connection resolution and product fetching lifecycle.

Robustness:
- Gracefully handles missing fields and inconsistent casing in marketplace responses.
- De-duplicates products after mapping.

**Section sources**
- [use-daraz-products.ts:19-96](file://src/hooks/use-daraz-products.ts#L19-L96)
- [use-daraz-products.ts:98-113](file://src/hooks/use-daraz-products.ts#L98-L113)
- [use-daraz-products.ts:120-183](file://src/hooks/use-daraz-products.ts#L120-L183)

### Real-Time Features Using SSE
- Returns insights and review analysis endpoints stream progress events and a final result.
- The streaming helper normalizes events and resolves/rejects promises consistently.
- Callers receive incremental updates (e.g., stages, counts, clusters) before completion.

Platform considerations:
- On web, uses ReadableStream for efficient streaming.
- On React Native, falls back to XMLHttpRequest onprogress to emulate streaming.

Usage pattern:
- Provide handlers for named events (progress, score, cluster).
- Handle complete or error outcomes uniformly.

**Section sources**
- [api.ts:79-137](file://src/lib/api.ts#L79-L137)
- [api.ts:144-204](file://src/lib/api.ts#L144-L204)
- [api.ts:215-286](file://src/lib/api.ts#L215-L286)
- [api.ts:1257-1281](file://src/lib/api.ts#L1257-L1281)
- [api.ts:1342-1364](file://src/lib/api.ts#L1342-L1364)

### Adding New API Endpoints
Steps to add a new endpoint:
1. Define TypeScript types for request and response in api.ts.
2. Implement a function that calls the request helper with appropriate method, headers, and body.
3. If the endpoint requires marketplace tokens, include the relevant header (e.g., x-daraz-access-token or x-shopify-access-token).
4. For long-running tasks, expose an SSE-based function using streamToResult and define progress event types.
5. Create a hook to encapsulate state, loading, errors, and refetch behavior.
6. Map backend responses to shared types where necessary to maintain consistency.

Example patterns:
- Simple GET/POST: see product CRUD and marketplace listing functions.
- SSE streaming: see returns insights and review analysis functions.
- **Finance endpoints**: see dashboard, transactions, payouts, profit, cashflow, fees, and settlement functions.

**Section sources**
- [api.ts:1109-1153](file://src/lib/api.ts#L1109-L1153)
- [api.ts:1257-1281](file://src/lib/api.ts#L1257-L1281)
- [api.ts:1342-1364](file://src/lib/api.ts#L1342-L1364)
- [api.ts:1700-1817](file://src/lib/api.ts#L1700-L1817)

### Handling Different Response Formats
- Many marketplace responses vary in structure; normalization functions extract arrays and fields robustly.
- Examples include extracting product arrays from nested objects and normalizing catalog search results.
- Deduplication ensures stable lists even when sources overlap.

**Section sources**
- [use-daraz-products.ts:98-113](file://src/hooks/use-daraz-products.ts#L98-L113)
- [api.ts:1526-1554](file://src/lib/api.ts#L1526-L1554)
- [api.ts:496-505](file://src/lib/api.ts#L496-L505)

### Error Handling Strategies
- Network failures throw ApiError with status 0 and a user-friendly message.
- Non-OK responses parse error bodies to extract detailed messages.
- SSE streams convert server-side errors into rejections with normalized messages.
- Hooks catch ApiError instances and surface readable messages to the UI.

Retry logic:
- No built-in retry is implemented in the client.
- Recommended approach: wrap calls in hooks with exponential backoff and jitter, and debounce rapid retries.

Offline support:
- No offline caching is implemented in the API client.
- Recommended approach: cache successful responses locally and serve stale data while refetching when online.

**Section sources**
- [api.ts:53-77](file://src/lib/api.ts#L53-L77)
- [api.ts:206-286](file://src/lib/api.ts#L206-L286)
- [use-shopify-products.ts:36-49](file://src/hooks/use-shopify-products.ts#L36-L49)
- [use-daraz-products.ts:139-183](file://src/hooks/use-daraz-products.ts#L139-L183)

### API Versioning and Backward Compatibility
- Maintain backward compatibility by:
  - Keeping response normalization flexible to accept multiple field names and nesting levels.
  - Avoiding breaking changes to shared types like Product.
  - Using optional fields and defaults in mapped outputs.
- When introducing new endpoints:
  - Add new routes rather than modifying existing ones.
  - Provide deprecation timelines for legacy endpoints.
  - Keep versioned query parameters or route prefixes if needed.

**Section sources**
- [api.ts:651-726](file://src/lib/api.ts#L651-L726)
- [api.ts:743-784](file://src/lib/api.ts#L743-L784)
- [api.ts:1526-1554](file://src/lib/api.ts#L1526-L1554)

## Finance Data Layer
The enhanced API layer now includes comprehensive finance data retrieval capabilities with specialized endpoints for different financial aspects:

### Financial Dashboard
- Provides overall financial overview including revenue, payouts, fees, and profit metrics.
- Returns aggregated data with recent payouts and cash flow trends.
- Supports configurable time periods through the days parameter.

### Transactions Management
- Retrieves detailed transaction records with pagination support.
- Filters transactions by date range with customizable page sizes.
- Returns structured transaction data including order information, fees, and payment details.

### Payout Analytics
- Tracks payout statements with status categorization (paid, upcoming, pending, failed).
- Provides amount summaries for different payout statuses.
- Enables filtering by date ranges for historical analysis.

### Profit Analysis
- Calculates net profit and profit margins over specified periods.
- Includes total revenue, costs, and order count metrics.
- Supports date-range filtering for trend analysis.

### Cash Flow Tracking
- Monitors daily inflows, outflows, and net cash positions.
- Configurable time periods for cash flow analysis.
- Returns chronological cash flow entries for visualization.

### Fee Breakdown
- Detailed breakdown of all fees including commissions, payment fees, shipping, penalties, and discounts.
- Calculates effective fee rates and net payout amounts.
- Provides comprehensive fee analysis for cost optimization.

### Settlement Reconciliation
- Reconciles payout amounts with calculated values from individual orders.
- Identifies discrepancies between expected and actual payouts.
- Returns detailed order-level breakdown for audit purposes.

All finance endpoints use a consistent header pattern with both Bearer authentication and Daraz access tokens for secure financial data access.

**Section sources**
- [api.ts:1700-1817](file://src/lib/api.ts#L1700-L1817)
- [use-finance-dashboard.ts:1-76](file://src/hooks/use-finance-dashboard.ts#L1-L76)
- [use-finance-transactions.ts:1-86](file://src/hooks/use-finance-transactions.ts#L1-L86)
- [use-finance-payouts.ts:1-78](file://src/hooks/use-finance-payouts.ts#L1-L78)
- [use-finance-profit.ts:1-78](file://src/hooks/use-finance-profit.ts#L1-L78)
- [use-finance-cashflow.ts:1-70](file://src/hooks/use-finance-cashflow.ts#L1-L70)
- [use-finance-fees.ts:1-78](file://src/hooks/use-finance-fees.ts#L1-L78)
- [use-finance-settlement.ts:1-74](file://src/hooks/use-finance-settlement.ts#L1-L74)

## Dependency Analysis
The following diagram shows how hooks depend on the API client and authentication context, including the new finance modules.

```mermaid
graph LR
Auth["useAuth"] --> API["api.ts"]
ShopifyToken["useShopifyAccessToken"] --> API
DarazToken["useDarazAccessToken"] --> API
ShopifyProducts["useShopifyProducts"] --> API
DarazProducts["useDarazProducts"] --> API
FinanceDashboard["useFinancialDashboard"] --> API
FinanceTransactions["useFinancialTransactions"] --> API
FinancePayouts["usePayoutAnalytics"] --> API
FinanceProfit["useProfitAnalytics"] --> API
FinanceCashFlow["useCashFlow"] --> API
FinanceFees["useFeeBreakdown"] --> API
FinanceSettlement["useSettlementReconciliation"] --> API
ShopifyProducts --> ShopifyToken
DarazProducts --> DarazToken
FinanceDashboard --> DarazToken
FinanceTransactions --> DarazToken
FinancePayouts --> DarazToken
FinanceProfit --> DarazToken
FinanceCashFlow --> DarazToken
FinanceFees --> DarazToken
FinanceSettlement --> DarazToken
```

**Diagram sources**
- [use-auth.tsx:31-79](file://src/hooks/use-auth.tsx#L31-L79)
- [use-shopify-access-token.ts:14-29](file://src/hooks/use-shopify-access-token.ts#L14-L29)
- [use-daraz-access-token.ts:29-64](file://src/hooks/use-daraz-access-token.ts#L29-L64)
- [use-shopify-products.ts:27-49](file://src/hooks/use-shopify-products.ts#L27-L49)
- [use-daraz-products.ts:120-183](file://src/hooks/use-daraz-products.ts#L120-L183)
- [use-finance-dashboard.ts:33-72](file://src/hooks/use-finance-dashboard.ts#L33-L72)
- [use-finance-transactions.ts:42-82](file://src/hooks/use-finance-transactions.ts#L42-L82)
- [use-finance-payouts.ts:40-74](file://src/hooks/use-finance-payouts.ts#L40-L74)
- [use-finance-profit.ts:40-74](file://src/hooks/use-finance-profit.ts#L40-L74)
- [use-finance-cashflow.ts:33-66](file://src/hooks/use-finance-cashflow.ts#L33-L66)
- [use-finance-fees.ts:40-74](file://src/hooks/use-finance-fees.ts#L40-L74)
- [use-finance-settlement.ts:35-70](file://src/hooks/use-finance-settlement.ts#L35-L70)
- [api.ts:53-77](file://src/lib/api.ts#L53-L77)

**Section sources**
- [use-auth.tsx:31-79](file://src/hooks/use-auth.tsx#L31-L79)
- [use-shopify-access-token.ts:14-29](file://src/hooks/use-shopify-access-token.ts#L14-L29)
- [use-daraz-access-token.ts:29-64](file://src/hooks/use-daraz-access-token.ts#L29-L64)
- [use-shopify-products.ts:27-49](file://src/hooks/use-shopify-products.ts#L27-L49)
- [use-daraz-products.ts:120-183](file://src/hooks/use-daraz-products.ts#L120-L183)
- [use-finance-dashboard.ts:33-72](file://src/hooks/use-finance-dashboard.ts#L33-L72)
- [use-finance-transactions.ts:42-82](file://src/hooks/use-finance-transactions.ts#L42-L82)
- [use-finance-payouts.ts:40-74](file://src/hooks/use-finance-payouts.ts#L40-L74)
- [use-finance-profit.ts:40-74](file://src/hooks/use-finance-profit.ts#L40-L74)
- [use-finance-cashflow.ts:33-66](file://src/hooks/use-finance-cashflow.ts#L33-L66)
- [use-finance-fees.ts:40-74](file://src/hooks/use-finance-fees.ts#L40-L74)
- [use-finance-settlement.ts:35-70](file://src/hooks/use-finance-settlement.ts#L35-L70)
- [api.ts:53-77](file://src/lib/api.ts#L53-L77)

## Performance Considerations
- Prefer streaming for long-running operations to improve perceived performance and allow incremental UI updates.
- De-duplicate products client-side to avoid redundant renders.
- Minimize network calls by caching connection tokens and reusing them until refetch is triggered.
- Use environment variables to configure base URLs per environment to reduce misconfiguration overhead.
- **Finance data optimization**: Leverage pagination for large transaction datasets and implement efficient date range filtering.

## Troubleshooting Guide
Common issues and resolutions:
- Cannot reach server:
  - Verify API_BASE_URL configuration and network connectivity.
  - Check CORS settings for web builds and host accessibility for mobile devices.
- Authentication errors:
  - Ensure access token is present and valid; re-login if expired.
  - Confirm Authorization header is set for protected endpoints.
- Marketplace connection not found:
  - Verify marketplace connections exist and have stored tokens.
  - Re-initiate OAuth flow for the respective marketplace.
- SSE stream ends without result:
  - Check backend logs for stream termination conditions.
  - Ensure handlers for "complete" and "error" events are implemented.
- **Finance data issues**:
  - Verify Daraz connection token is properly configured for finance endpoints.
  - Check date range parameters for transaction and analytics queries.
  - Ensure proper error handling for financial data transformations.

**Section sources**
- [api.ts:53-77](file://src/lib/api.ts#L53-L77)
- [api.ts:215-286](file://src/lib/api.ts#L215-L286)
- [use-auth.tsx:31-79](file://src/hooks/use-auth.tsx#L31-L79)
- [use-shopify-access-token.ts:14-29](file://src/hooks/use-shopify-access-token.ts#L14-L29)
- [use-daraz-access-token.ts:29-64](file://src/hooks/use-daraz-access-token.ts#L29-L64)

## Conclusion
The enhanced API integration layer provides a robust, typed, and extensible foundation for interacting with the backend and marketplace services. It standardizes error handling, supports real-time updates via SSE, abstracts marketplace differences through normalization and hooks, and now includes comprehensive finance data capabilities. By following the patterns outlined here, you can confidently add new endpoints, maintain backward compatibility, and deliver responsive user experiences across platforms with full financial analytics support.

## Appendices

### Example: Implementing a New Endpoint
- Define types for request and response.
- Create a function that calls the request helper with proper headers and body.
- If streaming, use streamToResult and define progress event types.
- Wrap in a hook to manage loading, error, and refetch states.
- Map responses to shared types to keep UI code simple.
- **For finance endpoints**: Include both Bearer and Daraz access tokens in headers.

**Section sources**
- [api.ts:1109-1153](file://src/lib/api.ts#L1109-L1153)
- [api.ts:1257-1281](file://src/lib/api.ts#L1257-L1281)
- [api.ts:1342-1364](file://src/lib/api.ts#L1342-L1364)
- [api.ts:1700-1817](file://src/lib/api.ts#L1700-L1817)

### Example: SSE Sequence for Returns Insights
```mermaid
sequenceDiagram
participant UI as "UI"
participant Hook as "Caller"
participant API as "api.ts"
participant Backend as "Backend"
UI->>Hook : invoke getDarazReturnsInsights(...)
Hook->>API : streamToResult(path, headers, onEvent, fallback)
API->>Backend : SSE request with stream=true
Backend-->>API : progress events
API-->>Hook : onEvent("progress", data)
Backend-->>API : complete event
API-->>Hook : resolve with ReturnsInsights
Hook-->>UI : display insights
```

**Diagram sources**
- [api.ts:1257-1281](file://src/lib/api.ts#L1257-L1281)
- [api.ts:258-286](file://src/lib/api.ts#L258-L286)

### Example: Finance Dashboard Implementation
```mermaid
sequenceDiagram
participant UI as "Finance Dashboard Screen"
participant Hook as "useFinancialDashboard"
participant Auth as "useAuth"
participant Conn as "useDarazAccessToken"
participant API as "getFinancialDashboard"
participant Backend as "Backend"
UI->>Hook : mount with days parameter
Hook->>Auth : read accessToken
Hook->>Conn : resolve darazAccessToken
alt connected
Hook->>API : getFinancialDashboard(accessToken, darazAccessToken, days)
API->>Backend : GET /daraz/financial/dashboard?days=X
Backend-->>API : FinancialDashboardResponse
API-->>Hook : typed response
Hook-->>UI : data, loading, error
else not connected
Hook-->>UI : empty state, no error
end
```

**Diagram sources**
- [use-finance-dashboard.ts:33-72](file://src/hooks/use-finance-dashboard.ts#L33-L72)
- [api.ts:1723-1732](file://src/lib/api.ts#L1723-L1732)