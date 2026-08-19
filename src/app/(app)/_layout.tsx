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
    </Stack>
  );
}
