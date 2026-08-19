import { Stack } from 'expo-router';

// Unauthenticated screens only. `src/app/_layout.tsx` mounts this whole
// group behind `Stack.Protected guard={!session}`, so there's no per-screen
// auth check to duplicate here.
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
