import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CatalogProductItem } from '@/lib/api';

export function CatalogProductRow({
  product,
  onPress,
}: {
  product: CatalogProductItem;
  onPress: () => void;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const press = useSharedValue(0);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.02 }],
  }));

  const eyebrow = (product.brand_name?.trim() || product.seller_name?.trim())?.toUpperCase();
  const ratingLabel =
    product.rating_score && product.review_count
      ? `${product.rating_score} · ${product.review_count} reviews`
      : product.rating_score
        ? `${product.rating_score} rating`
        : product.review_count
          ? `${product.review_count} reviews`
          : null;

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
          <View style={[styles.thumbnail, { backgroundColor: theme.backgroundElement }]}>
            {product.image ? (
              <Image source={{ uri: product.image }} style={styles.thumbnailImage} contentFit="cover" />
            ) : null}
          </View>

          <View style={styles.body}>
            {eyebrow ? (
              <ThemedText type="labelMd" themeColor="textSecondary" numberOfLines={1}>
                {eyebrow}
              </ThemedText>
            ) : null}
            <ThemedText type="bodyLg" numberOfLines={2} style={styles.title}>
              {product.name}
            </ThemedText>
            {ratingLabel ? (
              <ThemedText type="bodySm" themeColor="textSecondary" numberOfLines={1}>
                {ratingLabel}
              </ThemedText>
            ) : null}
            {!product.in_stock ? (
              <ThemedText type="bodySm" themeColor="danger">
                Out of stock
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.trailing}>
            <View style={[styles.priceCapsule, { backgroundColor: theme.primaryContainer }]}>
              <ThemedText type="bodyMd" themeColor="onPrimaryContainer" style={styles.priceText}>
                {product.price}
              </ThemedText>
            </View>
            {product.discount ? (
              <ThemedText type="bodySm" themeColor="success" numberOfLines={1}>
                {product.discount}
              </ThemedText>
            ) : null}
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
  body: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontWeight: '600',
  },
  trailing: {
    alignItems: 'flex-end',
    gap: Spacing.half,
    maxWidth: 96,
  },
  priceCapsule: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.full,
  },
  priceText: {
    fontWeight: '700',
    lineHeight: 16,
    textAlign: 'right',
  },
  chevron: {
    marginLeft: Spacing.half,
  },
});
