import type { AgentId } from '@/constants/dashboard-mock';

/**
 * Static mock notifications feed — there is no backend notifications
 * endpoint yet (see dashboard-mock.ts for the same caveat on AI insight
 * data). Reuses the same `AgentId` badges as the Home dashboard so the
 * "who generated this" identity stays consistent app-wide.
 */
export type NotificationItem = {
  id: string;
  agentId: AgentId;
  title: string;
  body: string;
  timeAgo: string;
  read: boolean;
};

export const notifications: NotificationItem[] = [
  {
    id: 'notif-1',
    agentId: 'profit',
    title: 'New insight: margin risk detected',
    body: 'Three products are generating revenue but losing money — estimated loss Rs. 18,400 this month.',
    timeAgo: '2 hours ago',
    read: false,
  },
  {
    id: 'notif-2',
    agentId: 'inventory',
    title: 'Stockout warning',
    body: 'Blue Hoodie will stock out in 6 days at the current sell-through rate.',
    timeAgo: '5 hours ago',
    read: false,
  },
  {
    id: 'notif-3',
    agentId: 'operations',
    title: 'Delayed orders flagged',
    body: '5 orders are past their promised delivery window on Daraz Express.',
    timeAgo: 'Yesterday',
    read: true,
  },
  {
    id: 'notif-4',
    agentId: 'sentiment',
    title: 'Sentiment shift',
    body: 'Sizing complaints increased 18% this week across 3 top-selling SKUs.',
    timeAgo: '2 days ago',
    read: true,
  },
];

export const unreadNotificationCount = notifications.filter((notification) => !notification.read).length;
