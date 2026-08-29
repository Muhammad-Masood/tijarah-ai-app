import AppTabs from '@/components/app-tabs';

// Auth gating lives in `src/app/_layout.tsx` (`Stack.Protected`) — this
// group is only ever mounted when a session exists.
export default function TabLayout() {
  return <AppTabs />;
}
