import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/hooks/use-auth';

SplashScreen.preventAutoHideAsync();

const LIGHT_BG = '#f6f7f8';
const DARK_BG = '#1a1f23';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colorScheme === 'dark' ? DARK_BG : LIGHT_BG);
  }, [colorScheme]);

  // Native splash stays up (preventAutoHideAsync above) until Manrope is
  // ready, so AnimatedSplashOverlay never hides it before text can render
  // in the right font.
  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppShell() {
  const { session } = useAuth();
  // Keep the branded overlay until SecureStore has resolved — avoids a blank
  // root flash between splash dismiss and the first auth/app screen.
  const splashReady = session !== undefined;

  return (
    <>
      <AnimatedSplashOverlay ready={splashReady} />
      <RootNavigator />
    </>
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
