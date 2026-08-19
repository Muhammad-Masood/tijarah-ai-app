/**
 * Static mock data for the Home executive dashboard.
 *
 * There is no backend surface yet for AI insights, business health scoring,
 * inventory risk, sentiment, agent activity, or profit trend data — see
 * `.claude/agents/home-dashboard-screen-prompt.md`. Everything below is
 * shaped as typed data objects/props (not hardcoded into JSX) so a future
 * pass can swap this module for real fetches without touching the
 * presentational components in `@/components/dashboard-kit`.
 */

import type { Product } from '@/lib/api';

/**
 * Shown on the Home dashboard's Products section only when the merchant has
 * no real products yet (`GET /product/get_products` returns an empty list),
 * so the section still demonstrates the browse/add flow instead of just an
 * empty-state message. Ids are non-UUID sentinels — rows built from this
 * list route to the Products tab rather than a product-detail fetch, since
 * these don't exist in the backend.
 */
export const dummyProducts: Product[] = [
  {
    id: 'sample-1',
    title: 'Classic Cotton Hoodie',
    price: 3200,
    description: 'Heavyweight cotton hoodie, unisex fit, available in 4 colors.',
    image: '',
    category: 'Apparel',
  },
  {
    id: 'sample-2',
    title: 'Wireless Earbuds Pro',
    price: 8900,
    description: 'Bluetooth 5.3 earbuds with active noise cancellation.',
    image: '',
    category: 'Electronics',
  },
  {
    id: 'sample-3',
    title: 'Ceramic Coffee Mug Set',
    price: 1450,
    description: 'Set of 2 handmade ceramic mugs, 350ml capacity.',
    image: '',
    category: 'Home & Kitchen',
  },
];

export type Severity = 'high' | 'medium' | 'low';
export type Tone = 'success' | 'warning' | 'danger' | 'aiInsight' | 'neutral';

export type AgentId = 'profit' | 'inventory' | 'operations' | 'sentiment';

export const Agents: Record<AgentId, { name: string }> = {
  profit: { name: 'Profit Agent' },
  inventory: { name: 'Inventory Agent' },
  operations: { name: 'Operations Agent' },
  sentiment: { name: 'Sentiment Agent' },
};

export type BusinessHealth = {
  status: 'Healthy' | 'Needs attention';
  supportingLine: string;
};

export const businessHealth: BusinessHealth = {
  status: 'Healthy',
  supportingLine: 'Margins are stable and all 3 connected stores synced within the last hour.',
};

export type MetricCardData = {
  label: string;
  value: string;
  comparisonLabel: string;
  tone: 'positive' | 'negative' | 'neutral';
  estimated?: boolean;
};

export const trueProfit: MetricCardData = {
  label: 'True Profit',
  value: 'Rs. 186,400',
  comparisonLabel: '+8.2% vs last period',
  tone: 'positive',
  estimated: true,
};

export const periodMetrics: MetricCardData[] = [
  { label: 'Revenue', value: 'Rs. 612,900', comparisonLabel: '+5.4%', tone: 'positive' },
  { label: 'Orders', value: '482', comparisonLabel: '-2.1%', tone: 'neutral' },
  { label: 'Net Margin', value: '18.6%', comparisonLabel: '+1.2 pt', tone: 'positive' },
];

export type InsightAction = {
  label: string;
  emphasis: 'primary' | 'secondary' | 'text';
};

export type InsightCardData = {
  id: string;
  agentId: AgentId;
  severity: Severity;
  title: string;
  impactLabel: string;
  impactEstimated: boolean;
  cause: string;
  whyThis: string;
  primaryActionLabel: string;
};

export const primaryInsight: InsightCardData = {
  id: 'insight-primary',
  agentId: 'profit',
  severity: 'high',
  title: 'Three products are generating revenue but losing money',
  impactLabel: 'Estimated loss: Rs. 18,400 this month',
  impactEstimated: true,
  cause: 'Primary cause: Daraz fees and discounting reduced margins below zero.',
  whyThis:
    'Based on landed cost vs. channel payout across all Daraz orders for these products in the last 30 days.',
  primaryActionLabel: 'Review products',
};

export const primaryInsightActions: InsightAction[] = [
  { label: 'Review products', emphasis: 'primary' },
  { label: 'Apply suggested prices', emphasis: 'secondary' },
  { label: 'Ask Tijarah', emphasis: 'secondary' },
  { label: 'Dismiss', emphasis: 'text' },
];

export const impactStrip = {
  label: 'Rs. 42,100 at risk across 4 insights this period',
};

export type InventoryRisk = {
  id: string;
  productName: string;
  detail: string;
  severity: Severity;
};

export const inventoryRisks: InventoryRisk[] = [
  { id: 'risk-1', productName: 'Blue Hoodie', detail: 'Stockout in 6 days', severity: 'high' },
  { id: 'risk-2', productName: 'Canvas Tote Bag', detail: 'Stockout in 11 days', severity: 'medium' },
  { id: 'risk-3', productName: 'Wireless Earbuds Case', detail: '9 units left, selling fast', severity: 'medium' },
];
export const inventoryRisksTotalCount = 5;

export type SentimentSummary = {
  trend: 'up' | 'down' | 'flat';
  ratingLabel: string;
  flaggedTheme: string;
};

export const sentimentSummary: SentimentSummary = {
  trend: 'up',
  ratingLabel: '4.3★ · improving',
  flaggedTheme: 'Sizing complaints increased this week.',
};

export type AgentActivityItem = {
  id: string;
  agentId: AgentId;
  result: string;
  timeAgo: string;
};

export const agentActivity: AgentActivityItem[] = [
  { id: 'activity-1', agentId: 'operations', result: 'Flagged 5 delayed orders', timeAgo: '2 hours ago' },
  {
    id: 'activity-2',
    agentId: 'inventory',
    result: 'Reordered stock for 2 fast-selling SKUs',
    timeAgo: '6 hours ago',
  },
  { id: 'activity-3', agentId: 'profit', result: 'Applied a suggested price on 1 product', timeAgo: 'Yesterday' },
];

export type FeatureGraphData = {
  id: string;
  title: string;
  caption: string;
  agentId: AgentId;
  tone: Tone;
  chart: 'sparkline' | 'distribution';
  /** Sparkline: relative point values. Distribution: named segments with counts. */
  points?: number[];
  segments?: { label: string; count: number; tone: Tone }[];
};

export const featureGraphs: FeatureGraphData[] = [
  {
    id: 'graph-profit',
    title: 'True Profit',
    caption: 'Rs. 186,400 · up 8.2%',
    agentId: 'profit',
    tone: 'success',
    chart: 'sparkline',
    points: [12, 14, 13, 16, 18, 17, 20, 22],
  },
  {
    id: 'graph-inventory',
    title: 'Inventory Health',
    caption: '3 products at risk',
    agentId: 'inventory',
    tone: 'warning',
    chart: 'distribution',
    segments: [
      { label: 'Healthy', count: 34, tone: 'success' },
      { label: 'Low', count: 9, tone: 'warning' },
      { label: 'At risk', count: 3, tone: 'danger' },
    ],
  },
  {
    id: 'graph-operations',
    title: 'Operations',
    caption: '12 exceptions this week',
    agentId: 'operations',
    tone: 'neutral',
    chart: 'sparkline',
    points: [6, 8, 7, 9, 11, 10, 12, 12],
  },
  {
    id: 'graph-sentiment',
    title: 'Customer Sentiment',
    caption: '4.3★ · improving',
    agentId: 'sentiment',
    tone: 'success',
    chart: 'sparkline',
    points: [3.9, 4.0, 4.0, 4.1, 4.2, 4.1, 4.3, 4.3],
  },
];

export const allInsights: InsightCardData[] = [
  {
    id: 'insight-2',
    agentId: 'inventory',
    severity: 'medium',
    title: 'Blue Hoodie will stock out in 6 days',
    impactLabel: 'Potential lost sales: Rs. 9,800',
    impactEstimated: true,
    cause: 'Primary cause: Sell-through outpaced the last reorder by 3x.',
    whyThis: 'Based on the last 14 days of sell-through velocity across all connected stores.',
    primaryActionLabel: 'Reorder now',
  },
  {
    id: 'insight-3',
    agentId: 'operations',
    severity: 'medium',
    title: '5 orders delayed past their promised delivery window',
    impactLabel: 'Risk to customer satisfaction score',
    impactEstimated: false,
    cause: 'Primary cause: Carrier delays on Daraz Express shipments.',
    whyThis: 'Based on delivery timestamps vs. promised windows for orders placed in the last 7 days.',
    primaryActionLabel: 'Review orders',
  },
  {
    id: 'insight-4',
    agentId: 'sentiment',
    severity: 'low',
    title: 'Sizing complaints increased 18% this week',
    impactLabel: 'Affects 3 top-selling SKUs',
    impactEstimated: false,
    cause: 'Primary cause: Recent reviews mention runs-small sizing on the apparel line.',
    whyThis: 'Based on review text analysis across all channels for the last 7 days.',
    primaryActionLabel: 'View reviews',
  },
  {
    id: 'insight-5',
    agentId: 'profit',
    severity: 'medium',
    title: 'Shipping costs rose on Amazon orders this week',
    impactLabel: 'Estimated margin impact: Rs. 6,250',
    impactEstimated: true,
    cause: 'Primary cause: A carrier rate change took effect on Amazon FBA shipments.',
    whyThis: 'Based on landed shipping cost per order vs. the prior 30-day average.',
    primaryActionLabel: 'Review shipping',
  },
];
