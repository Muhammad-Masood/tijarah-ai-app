import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/auth-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function WelcomeScreen() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.content}>
          <View style={styles.spacer} />

          <View style={styles.hero}>
            <View style={styles.logoMark}>
              <BrandMark />
            </View>
            <ThemedText type="displayLgMobile" themeColor="primary" style={styles.appName}>
              Tijarah AI
            </ThemedText>
            <ThemedText type="bodyLg" themeColor="textSecondary" style={styles.tagline}>
              Your entire marketplace, managed in one intelligent hub.
            </ThemedText>
          </View>

          <View style={styles.spacer} />

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.ctaButton,
                { backgroundColor: theme.primary },
                pressed && styles.pressed,
              ]}
              onPress={() => router.push('/signup')}>
              <ThemedText type="bodyLg" themeColor="onPrimary" style={styles.ctaLabel}>
                Get Started
              </ThemedText>
              <ThemedText type="bodyLg" themeColor="onPrimary">
                →
              </ThemedText>
            </Pressable>

            <View style={styles.signInRow}>
              <ThemedText type="bodyMd" themeColor="textSecondary">
                Already have an account?{' '}
              </ThemedText>
              <Pressable onPress={() => router.push('/login')}>
                <ThemedText type="bodyMd" themeColor="primary" style={styles.signInLink}>
                  Sign In
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
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
  spacer: {
    flex: 1,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  logoMark: {
    marginBottom: Spacing.two,
  },
  appName: {
    textAlign: 'center',
  },
  tagline: {
    textAlign: 'center',
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
  pressed: {
    opacity: 0.85,
  },
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signInLink: {
    fontWeight: '600',
  },
});
