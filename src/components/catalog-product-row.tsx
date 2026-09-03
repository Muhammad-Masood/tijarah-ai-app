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

  const ratingText = hasValidRating
    ? `${parsedRating.toFixed(1)}${product.review_count ? ` (${product.review_count})` : ''}`
    : product.review_count
      ? `${product.review_count} reviews`
      : null;

  const reviewMarkup = ratingText || product.item_sold ? (
    <View style={styles.reviewRow}>
      {hasValidRating ? <Ionicons name="star" size={11} color="#FFB800" style={styles.ratingStar} /> : null}
      {ratingText ? (
        <ThemedText type="bodySm" themeColor="textSecondary" numberOfLines={1} style={styles.ratingText}>
          {ratingText}
        </ThemedText>
      ) : null}
      {product.item_sold ? (
        <ThemedText type="bodySm" themeColor="textSecondary" numberOfLines={1} style={styles.soldText}>
          {product.item_sold} sold
        </ThemedText>
      ) : null}
    </View>
  ) : null;

  const content =
    variant === 'grid' ? (
      <View style={styles.gridBody}>
        {eyebrow ? (
          <ThemedText type="labelMd" themeColor="textSecondary" numberOfLines={1} style={styles.gridBrand}>
            {eyebrow}
          </ThemedText>
        ) : null}

        <ThemedText type="bodyMd" numberOfLines={2} style={styles.gridTitle}>
          {product.name}
        </ThemedText>

        {reviewMarkup}

        {!product.in_stock ? (
          <ThemedText type="bodySm" themeColor="danger" style={{ marginTop: 2 }}>
            Out of stock
          </ThemedText>
        ) : null}

        <View style={styles.gridFooter}>
          <ThemedText type="bodyLg" style={[styles.gridPrice, { color: '#F57224' }]}>
            {product.price}
          </ThemedText>

          {product.discount ? (
            <ThemedText type="bodySm" style={styles.gridDiscount}>
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
  // ===== LIST VARIANT (untouched) =====
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
  },
  chevron: {
    marginLeft: Spacing.half,
  },

  // ===== GRID VARIANT (updated to match Daraz) =====
  gridCard: {
    flex: 1,
    minWidth: 0,
    borderWidth: 0, // removed heavy border
    borderRadius: 10,
    padding: 0,
    backgroundColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  gridThumbnail: {
    width: '100%',
    aspectRatio: 1,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  gridBody: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 3,
  },
  gridBrand: {
    fontSize: 11,
    letterSpacing: 0.3,
    opacity: 0.7,
  },
  gridTitle: {
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 17,
    color: '#212121',
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingStar: {
    marginRight: 2,
  },
  ratingText: {
    fontSize: 11,
    color: '#757575',
  },
  soldText: {
    fontSize: 11,
    color: '#757575',
    marginLeft: 6,
  },
  gridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  gridPrice: {
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 20,
  },
  gridDiscount: {
    fontSize: 12,
    color: '#F57224',
    fontWeight: '500',
  },
});