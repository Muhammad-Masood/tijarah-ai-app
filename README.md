# Tijarah AI

**One dashboard for every store. An AI co-pilot for every decision.**

Tijarah AI connects a seller's online stores (Daraz, Shopify, and beyond) into a single
platform with an AI layer of specialized agents. These agents flag and help fix operational
inefficiencies in real time, analyze customer sentiment across products, forecast inventory
and alert before stockouts, and calculate true margins and profit — all from one place.

Our goal is simple: **turn fragmented data into clear, actionable decisions** — showing
sellers what's making money, what's losing it, and what to do next.

---

## Why Tijarah AI

Selling across multiple marketplaces means juggling scattered dashboards, spreadsheets, and
guesswork. Tijarah AI brings it all together:

- 🏬 **Connect once, manage everywhere** — link your Daraz and Shopify stores and see every
  product, order, and payout in one view.
- 🤖 **Ask Tijarah** — a conversational AI assistant that answers questions about your
  business and recommends next actions.
- 💰 **Know your true profit** — go beyond sales figures to real margins after fees,
  expenses, refunds, and payouts.
- 🔍 **Win on search** — AI-powered keyword analysis surfaces the search terms that actually
  drive sales and shows who you're competing against.
- 📦 **Never run out of stock** — inventory insights and alerts before problems hit.

---

## Key Features

### Store & Product Management
- Connect and manage multiple marketplace stores (Daraz, Shopify)
- Full product catalog with search, filtering, and detail views
- Create and edit product listings from a single screen
- Product recommendations and a product-hunting tool for sourcing ideas

### Orders & Fulfillment
- Unified order list across connected stores
- Detailed order views with per-order status and line items

### Finance Command Center
- **Profit** — true margin analysis, not just revenue
- **Cashflow** — track money moving in and out
- **Payouts & Settlements** — reconcile marketplace payouts
- **Fees & Transactions** — understand where money is going
- **Expenses** — log and categorize business spending
- Per-product financial breakdowns

### AI & Insights
- **Ask Tijarah** — chat with an AI assistant grounded in your store data
- **Keyword Analysis** — streaming, SEO-grade analysis that ranks winning keywords and
  identifies top competitors for any product
- **Insights dashboard** — customer sentiment and operational signals at a glance
- Notifications and activity alerts

### Account & Support
- Secure sign-in and onboarding
- Profile and store configuration
- Support settings

---

## Technology Stack

Tijarah AI is a **universal app** — a single codebase that runs on **Android, iOS, and the
web**.

| Layer          | Technology                                             |
| -------------- | ------------------------------------------------------ |
| Framework      | Expo (SDK 57) + React Native 0.86                       |
| Language       | TypeScript (strict mode)                                |
| UI Library     | React 19                                                |
| Navigation     | Expo Router (file-based routing)                        |
| Animation      | React Native Reanimated                                 |
| Images & Media | expo-image, expo-image-picker                           |
| Secure Storage | expo-secure-store (tokens & credentials)                |
| Backend        | FastAPI service (REST + real-time SSE streaming)        |

The app communicates with a dedicated backend API for marketplace integrations, AI
agents, and financial computation. Sensitive tokens are stored securely on-device and
never exposed.

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (with `npm`) installed
- The [Expo Go](https://expo.dev/go) app on your phone, or an Android emulator / iOS
  simulator, or a modern web browser

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Point the app at your backend (optional — create a .env file)
#    EXPO_PUBLIC_API_URL=https://your-api-host

# 3. Launch the development server
npm start
```

### Run on a Platform

```bash
npm run android   # Android emulator or device
npm run ios       # iOS simulator (requires macOS)
npm run web       # Browser
```

### Quality Checks

```bash
npm run lint          # Run ESLint (Expo config)
npx tsc --noEmit      # Type-check the project
```

---

## Configuration

Backend overrides are set through an untracked `.env` file at the project root:

```bash
EXPO_PUBLIC_API_URL=https://your-api-host
```

> **Note:** Every `EXPO_PUBLIC_*` value is bundled into the client and is **not** secret.
> Never place tokens, passwords, or production credentials in `.env` files that get
> committed.

---

## Project Structure

```
tijarah-ai-app/
├── src/
│   ├── app/            # Screens & navigation (Expo Router file-based routes)
│   │   ├── (auth)/     #   Login, sign-up, welcome
│   │   └── (app)/      #   Protected app: tabs, products, finance, AI, etc.
│   ├── components/     # Reusable UI building blocks
│   ├── hooks/          # Data & feature logic
│   ├── constants/      # Shared values, theme tokens, API config
│   └── lib/            # API helpers & streaming utilities
├── assets/             # Images, icons, and splash assets
└── app.json            # Expo application configuration
```

---

## Roadmap

- Public release on **Google Play** and the **Apple App Store** (targeted Q4 2026)
- Additional marketplace integrations beyond Daraz and Shopify
- Expanded AI agents for automated listing optimization and forecasting

---

## License

This project is licensed under the [0BSD License](./LICENSE).
