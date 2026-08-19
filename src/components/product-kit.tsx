import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { Product } from '@/lib/api';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Formats a raw number as PKR, matching the currency treatment used across the dashboard mock data. */
export function formatPrice(price: number): string {
  return `Rs. ${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

/** List row for the Product List screen — thumbnail, title, category, price, chevron. */
export function ProductRow({ product, onPress }: { product: Product; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.thumbnail, { backgroundColor: theme.backgroundElement }]}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.thumbnailImage} contentFit="cover" />
        ) : null}
      </View>
      <View style={styles.body}>
        <ThemedText type="bodyLg" numberOfLines={1} style={styles.title}>
          {product.title}
        </ThemedText>
        <ThemedText type="bodySm" themeColor="textSecondary">
          {product.category}
        </ThemedText>
      </View>
      <ThemedText type="bodyMd" style={styles.price}>
        {formatPrice(product.price)}
      </ThemedText>
      <ThemedText type="bodyLg" themeColor="textSecondary" style={styles.chevron}>
        ›
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.two,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: Radius.DEFAULT,
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
  price: {
    fontWeight: '600',
  },
  chevron: {
    marginLeft: Spacing.half,
  },
  pressed: {
    opacity: 0.8,
  },
});
