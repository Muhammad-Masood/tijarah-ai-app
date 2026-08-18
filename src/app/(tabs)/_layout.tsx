import { Redirect } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import { useAuth } from '@/hooks/use-auth';

export default function TabLayout() {
  const { session } = useAuth();

  // Still checking SecureStore for a saved token — render nothing rather
  // than flash the tabs before we know whether the user is logged in.
  if (session === undefined) return null;
  if (session === null) return <Redirect href="/welcome" />;

  return <AppTabs />;
}
