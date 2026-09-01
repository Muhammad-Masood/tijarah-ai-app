import { Stack } from 'expo-router';

// Authenticated screens only. `src/app/_layout.tsx` mounts this whole group
// behind `Stack.Protected guard={!!session}`, so there's no per-screen auth
// check to duplicate here.
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="connect-stores" />
      <Stack.Screen name="store-connecting" />
      <Stack.Screen name="store-connected" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="product-detail" />
      <Stack.Screen name="product-form" />
      <Stack.Screen name="product-hunting-tool" />
      <Stack.Screen name="product-recommendations" />
      <Stack.Screen name="catalog-product-detail" />
      <Stack.Screen name="finance" />
      <Stack.Screen name="finance-dashboard" />
      <Stack.Screen name="finance-transactions" />
      <Stack.Screen name="finance-payouts" />
      <Stack.Screen name="finance-fees" />
      <Stack.Screen name="finance-profit" />
      <Stack.Screen name="finance-cashflow" />
      <Stack.Screen name="finance-settlement" />
    </Stack>
  );
}
