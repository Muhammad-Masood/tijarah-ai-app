import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import type { Product } from '@/lib/api';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Formats a raw number as PKR, matching the currency treatment used across the dashboard mock data. */
export function formatPrice(price: number): string {
  return `Rs. ${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export type StockLevel = 'in' | 'low' | 'out';

/** Daraz reports quantity summed across SKUs — bucket it into a merchant-scannable state rather than a raw count. */
export function getStockLevel(quantity?: number): StockLevel | null {
  if (quantity === undefined) return null;
  if (quantity <= 0) return 'out';
  if (quantity <= 5) return 'low';
  return 'in';
}

/** List row for the Product List screen — thumbnail with marketplace provenance badge, title, stock, price capsule. */
export function ProductRow({
  product,
  marketplaceLogo,
  onPress,
}: {
  product: Product;
  /** Logo of the store this product was pulled from — surfaced on the thumbnail so provenance stays visible in an "All Stores" view. */
  marketplaceLogo?: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const press = useSharedValue(0);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.02 }],
  }));

  const stockLevel = getStockLevel(product.stockQuantity);
  const stockColor = stockLevel === 'out' ? theme.danger : stockLevel === 'low' ? theme.tertiary : theme.success;
  const stockLabel =
    stockLevel === 'out'
      ? 'Out of stock'
      : stockLevel === 'low'
        ? `Low stock · ${product.stockQuantity}`
        : stockLevel === 'in'
          ? 'In stock'
          : null;

  const eyebrow = (product.brand?.trim() || product.category)?.toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        press.value = withTiming(reduceMotion ? 0 : 1, { duration: 100 });
      }}
      onPressOut={() => {
        press.value = withTiming(0, { duration: 150 });
      }}>
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.row,
            {
              borderColor: pressed ? theme.primary : theme.border,
              backgroundColor: theme.surfaceContainerLowest,
              shadowColor: theme.outline,
            },
            cardAnimatedStyle,
          ]}>
          <View style={styles.thumbnailWrap}>
            <View style={[styles.thumbnail, { backgroundColor: theme.backgroundElement }]}>
              {product.image ? (
                <Image source={{ uri: product.image }} style={styles.thumbnailImage} contentFit="cover" />
              ) : null}
            </View>
            {marketplaceLogo ? (
              <View
                style={[
                  styles.marketplaceBadge,
                  { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.border },
                ]}>
                <Image source={{ uri: marketplaceLogo }} style={styles.marketplaceBadgeImage} contentFit="contain" />
              </View>
            ) : null}
          </View>

          <View style={styles.body}>
            {eyebrow ? (
              <ThemedText type="labelMd" themeColor="textSecondary" numberOfLines={1}>
                {eyebrow}
              </ThemedText>
            ) : null}
            <ThemedText type="bodyLg" numberOfLines={1} style={styles.title}>
              {product.title}
            </ThemedText>
            {stockLabel ? (
              <View style={styles.stockRow}>
                <View style={[styles.stockDot, { backgroundColor: stockColor }]} />
                <ThemedText type="bodySm" themeColor="textSecondary">
                  {stockLabel}
                </ThemedText>
              </View>
            ) : null}
          </View>

          <View style={styles.trailing}>
            <View style={[styles.priceCapsule, { backgroundColor: theme.primaryContainer }]}>
              <ThemedText type="bodyMd" themeColor="onPrimaryContainer" style={styles.priceText}>
                {formatPrice(product.price)}
              </ThemedText>
            </View>
            <ThemedText type="bodyLg" themeColor="textSecondary" style={styles.chevron}>
              ›
            </ThemedText>
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  thumbnailWrap: {
    position: 'relative',
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  marketplaceBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marketplaceBadgeImage: {
    width: 13,
    height: 13,
  },
  body: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontWeight: '600',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.half,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  priceCapsule: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.full,
  },
  priceText: {
    fontWeight: '700',
    lineHeight: 16,
  },
  chevron: {
    marginLeft: Spacing.half,
  },
});
