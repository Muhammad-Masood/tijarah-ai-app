import { Ionicons } from '@expo/vector-icons';
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
  variant = 'list',
}: {
  product: CatalogProductItem;
  onPress: () => void;
  variant?: 'list' | 'grid';
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const press = useSharedValue(0);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.02 }],
  }));

  const eyebrow = (product.brand_name?.trim() || product.seller_name?.trim())?.toUpperCase();
  const parsedRating = product.rating_score ? Number.parseFloat(product.rating_score) : null;
  const hasValidRating = Number.isFinite(parsedRating) && parsedRating !== null;
  const ratingLabel =
    product.rating_score && product.review_count
      ? `${product.rating_score} · ${product.review_count} reviews`
      : product.rating_score
        ? `${product.rating_score} rating`
        : product.review_count
          ? `${product.review_count} reviews`
          : null;
  const filledStars = hasValidRating ? Math.min(5, Math.max(0, Math.round(parsedRating as number))) : 0;

  const reviewMarkup = ratingLabel ? (
    <View style={styles.reviewRow}>
      <View style={styles.starRow}>
        {Array.from({ length: 5 }, (_, index) => (
          <Ionicons
            key={`${product.item_id}-star-${index}`}
            name={index < filledStars ? 'star' : 'star-outline'}
            size={12}
            color={index < filledStars ? theme.tertiary : theme.textSecondary}
          />
        ))}
      </View>
      <ThemedText type="bodySm" themeColor="textSecondary" numberOfLines={1}>
        {hasValidRating ? parsedRating?.toFixed(1) : ratingLabel}
      </ThemedText>
    </View>
  ) : null;

  const content =
    variant === 'grid' ? (
      <View style={styles.gridBody}>
        {eyebrow ? (
          <ThemedText type="labelMd" themeColor="textSecondary" numberOfLines={1}>
            {eyebrow}
          </ThemedText>
        ) : null}
        <ThemedText type="bodyMd" numberOfLines={2} style={styles.gridTitle}>
          {product.name}
        </ThemedText>
        {reviewMarkup}
        {!product.in_stock ? (
          <ThemedText type="bodySm" themeColor="danger">
            Out of stock
          </ThemedText>
        ) : null}
        <View style={styles.gridFooter}>
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
        </View>
      </View>
    ) : (
      <>
        <View style={styles.body}>
          {eyebrow ? (
            <ThemedText type="labelMd" themeColor="textSecondary" numberOfLines={1}>
              {eyebrow}
            </ThemedText>
          ) : null}
          <ThemedText type="bodyLg" numberOfLines={2} style={styles.title}>
            {product.name}
          </ThemedText>
          {reviewMarkup}
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
      </>
    );

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
            variant === 'grid' ? styles.gridCard : styles.row,
            {
              borderColor: pressed ? theme.primary : theme.border,
              backgroundColor: theme.surfaceContainerLowest,
              shadowColor: theme.outline,
            },
            cardAnimatedStyle,
          ]}>
          {variant === 'grid' ? (
            <>
              <View style={[styles.gridThumbnail, { backgroundColor: theme.backgroundElement }]}>
                {product.image ? (
                  <Image source={{ uri: product.image }} style={styles.thumbnailImage} contentFit="cover" />
                ) : null}
              </View>
              {content}
            </>
          ) : (
            <>
              <View style={[styles.thumbnail, { backgroundColor: theme.backgroundElement }]}>
                {product.image ? (
                  <Image source={{ uri: product.image }} style={styles.thumbnailImage} contentFit="cover" />
                ) : null}
              </View>
              {content}
            </>
          )}
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
  gridCard: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.two,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  gridThumbnail: {
    width: '100%',
    height: 120,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: Spacing.two,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  body: {
    flex: 1,
    gap: Spacing.half,
  },
  gridBody: {
    gap: Spacing.half,
  },
  title: {
    fontWeight: '600',
  },
  gridTitle: {
    fontWeight: '600',
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  gridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.one,
    marginTop: Spacing.half,
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
