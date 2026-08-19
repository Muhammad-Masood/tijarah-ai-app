import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/hooks/use-auth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  // Native splash stays up (preventAutoHideAsync above) until Manrope is
  // ready, so AnimatedSplashOverlay never hides it before text can render
  // in the right font.
  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AnimatedSplashOverlay />
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

// The only place in the app that decides which screens are reachable: the
// (auth) and (app) groups are mounted as mutually-exclusive branches, so
// flipping `session` unmounts the inactive branch entirely (clearing its
// navigation history) instead of merely swapping the top stack frame. This
// is what stops back-navigation from leaking across the auth boundary in
// either direction.
function RootNavigator() {
  const { session } = useAuth();

  // Still checking SecureStore for a saved token — render nothing rather
  // than flash the (auth) group before we know whether the user is logged in.
  if (session === undefined) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
