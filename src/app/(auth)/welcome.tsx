import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { BrandMark, PressableScale } from '@/components/auth-kit';
import { ChannelLogo } from '@/components/onboarding-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChannelOrder } from '@/constants/channels';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useStagger, type Stagger } from '@/hooks/use-stagger';
import { useTheme } from '@/hooks/use-theme';

export default function WelcomeScreen() {
  const theme = useTheme();
  const stagger = useStagger();
  const reduceMotion = useReducedMotion();

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.content}>
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(300)} style={styles.brandRow}>
            <BrandMark size="sm" />
            <ThemedText type="headlineSm" themeColor="primary">
              Tijarah AI
            </ThemedText>
          </Animated.View>

          <View style={styles.spacer} />

          <View style={styles.hero}>
            <ConvergenceMark stagger={stagger} />

            {/* <Animated.View entering={stagger(360)}>
              <ThemedText type="labelMd" themeColor="textSecondary" style={styles.eyebrow}>
                SHOPIFY · DARAZ · AMAZON — SYNCED
              </ThemedText>
            </Animated.View> */}

            <Animated.View entering={stagger(420)}>
              <ThemedText type="displayLgMobile" style={styles.headline}>
                All your stores.{'\n'}
                <ThemedText type="displayLgMobile" themeColor="primary">
                  One clear number.
                </ThemedText>
              </ThemedText>
            </Animated.View>

            <Animated.View entering={stagger(480)}>
              <ThemedText type="bodyLg" themeColor="textSecondary" style={styles.subhead}>
                Tijarah AI pulls products, orders, inventory, and fees from every channel into one
                ledger — then tells you what to do next.
              </ThemedText>
            </Animated.View>
          </View>

          <View style={styles.spacer} />

          <Animated.View entering={stagger(560)} style={styles.actions}>
            <PressableScale
              style={[styles.ctaButton, { backgroundColor: theme.primary }]}
              onPress={() => router.push('/signup')}>
              <ThemedText type="bodyLg" themeColor="onPrimary" style={styles.ctaLabel}>
                Get started
              </ThemedText>
              <ThemedText type="bodyLg" themeColor="onPrimary">
                →
              </ThemedText>
            </PressableScale>

            <View style={styles.signInRow}>
              <ThemedText type="bodyMd" themeColor="textSecondary">
                Already have an account?{' '}
              </ThemedText>
              <Pressable onPress={() => router.push('/login')}>
                <ThemedText type="bodyMd" themeColor="primary" style={styles.signInLink}>
                  Sign in
                </ThemedText>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

/**
 * Signature element: the three connected channels merging onto one bus line
 * and converging to a single point — a literal diagram of the product's
 * core job (many marketplaces, one ledger), not decoration.
 */
function ConvergenceMark({ stagger }: { stagger: Stagger }) {
  const theme = useTheme();

  return (
    <View style={styles.convergence}>
      <View style={styles.chipRow}>
        {ChannelOrder.map((channelId, index) => (
          <Animated.View key={channelId} entering={stagger(index * 70)}>
            <ChannelLogo channelId={channelId} size="sm" />
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={stagger(260)} style={styles.wireRow}>
        {ChannelOrder.map((channelId) => (
          <View key={channelId} style={styles.wireColumn}>
            <View style={[styles.wireStub, { backgroundColor: theme.outlineVariant }]} />
          </View>
        ))}
      </Animated.View>

      <Animated.View entering={stagger(300)} style={[styles.bus, { backgroundColor: theme.outlineVariant }]} />

      <Animated.View entering={stagger(320)} style={[styles.trunk, { backgroundColor: theme.outlineVariant }]} />

      <Animated.View entering={stagger(340)} style={[styles.node, { backgroundColor: theme.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  spacer: {
    flex: 1,
  },
  hero: {
    gap: Spacing.two,
  },
  convergence: {
    width: 220,
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  chipRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  wireRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  wireColumn: {
    width: 40,
    alignItems: 'center',
  },
  wireStub: {
    width: 1,
    height: 14,
  },
  bus: {
    width: '100%',
    height: 1,
    marginHorizontal: 20,
  },
  trunk: {
    width: 1,
    height: 14,
  },
  node: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eyebrow: {
    textAlign: 'center',
    letterSpacing: 1.2,
  },
  headline: {
    textAlign: 'left',
  },
  subhead: {
    textAlign: 'left',
  },
  actions: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.DEFAULT,
    paddingVertical: Spacing.three,
  },
  ctaLabel: {
    fontWeight: '600',
  },
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signInLink: {
    fontWeight: '600',
  },
});
