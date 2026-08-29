import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useColorScheme } from '@/hooks/use-color-scheme';

/** Matches `Colors.light` / `Colors.dark` backgrounds from theme.ts. */
const LIGHT_BG = '#f6f7f8';
const DARK_BG = '#1a1f23';
const LIGHT_PRIMARY = '#0e6b5e';
const DARK_PRIMARY = '#6fd9c4';

type SplashPhase = 'holding' | 'exiting' | 'done';

/**
 * Bridges the native Expo splash into the app with a themed, breathing logo.
 * Stays up until `ready` (fonts already gated in root layout; typically auth
 * session resolved) so we never flash a blank root behind it.
 */
export function AnimatedSplashOverlay({ ready = true }: { ready?: boolean }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const [phase, setPhase] = useState<SplashPhase>('holding');
  const [nativeHidden, setNativeHidden] = useState(false);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.88);
  const pulse = useSharedValue(1);
  const glow = useSharedValue(0.28);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    scale.value = withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) });
    pulse.value = withDelay(
      520,
      withRepeat(
        withSequence(
          withTiming(1.05, { duration: 920, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 920, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
    glow.value = withDelay(
      520,
      withRepeat(
        withSequence(
          withTiming(0.55, { duration: 920, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.28, { duration: 920, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, [glow, opacity, pulse, scale]);

  useEffect(() => {
    if (!ready || !nativeHidden || phase !== 'holding') return;
    const timer = setTimeout(() => setPhase('exiting'), 450);
    return () => clearTimeout(timer);
  }, [ready, nativeHidden, phase]);

  useEffect(() => {
    if (phase !== 'exiting') return;
    cancelAnimation(pulse);
    cancelAnimation(glow);
    opacity.value = withTiming(0, { duration: 380, easing: Easing.in(Easing.cubic) }, (finished) => {
      if (finished) scheduleOnRN(setPhase, 'done');
    });
    scale.value = withTiming(1.1, { duration: 380, easing: Easing.in(Easing.cubic) });
  }, [glow, opacity, phase, pulse, scale]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value * pulse.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * opacity.value,
    transform: [{ scale: scale.value * pulse.value * 1.45 }],
  }));

  if (phase === 'done') return null;

  return (
    <View
      pointerEvents="none"
      onLayout={() => {
        if (nativeHidden) return;
        SplashScreen.hideAsync().finally(() => setNativeHidden(true));
      }}
      style={[styles.splashOverlay, { backgroundColor: isDark ? DARK_BG : LIGHT_BG }]}>
      <Animated.View
        style={[
          styles.glow,
          { backgroundColor: isDark ? DARK_PRIMARY : LIGHT_PRIMARY },
          glowStyle,
        ]}
      />
      <Animated.View style={logoStyle}>
        <Image
          source={
            isDark
              ? require('@/assets/images/tijarah_logo_dark.png')
              : require('@/assets/images/tijarah_logo_light.png')
          }
          style={styles.logo}
          contentFit="contain"
        />
      </Animated.View>
    </View>
  );
}

/** Kept for any welcome/demo surfaces that still want a mark animation. */
export function AnimatedIcon() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <View style={styles.iconContainer}>
      <Image
        style={styles.logo}
        source={
          isDark
            ? require('@/assets/images/tijarah_logo_dark.png')
            : require('@/assets/images/tijarah_logo_light.png')
        }
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  glow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  logo: {
    width: 120,
    height: 120,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100,
  },
});