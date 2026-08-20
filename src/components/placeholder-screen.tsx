import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Calm "coming soon" scaffold shared by the tab-root placeholders (Insights,
 * Operations, Ask Tijarah) — none of these have real content specified yet,
 * only a destination to reach from the new 5-tab bar.
 */
export function PlaceholderScreen({
  title,
  description,
  symbol,
  fallbackGlyph,
}: {
  title: string;
  description: string;
  /** SF Symbol name, rendered natively on iOS. */
  symbol: SFSymbol;
  /** Plain-text glyph shown on Android/web, where SF Symbols aren't available. */
  fallbackGlyph: string;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: theme.backgroundElement }]}>
            <SymbolView
              tintColor={theme.textSecondary}
              name={symbol}
              size={28}
              fallback={<ThemedText style={styles.fallbackGlyph}>{fallbackGlyph}</ThemedText>}
            />
          </View>
          <ThemedText type="headlineMd" style={styles.centerText}>
            {title}
          </ThemedText>
          <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.centerText}>
            {description}
          </ThemedText>
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
    paddingBottom: BottomTabInset,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  fallbackGlyph: {
    fontSize: 24,
  },
  centerText: {
    textAlign: 'center',
  },
});
