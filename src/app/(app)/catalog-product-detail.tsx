import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListRow, ListSection } from '@/components/list-kit';
import { ProductImageCarousel } from '@/components/product-image-carousel';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { openCatalogProductUrl, parseCatalogProductParam } from '@/lib/catalog-navigation';

export default function CatalogProductDetailScreen() {
  const theme = useTheme();
  const { data } = useLocalSearchParams<{ data?: string }>();
  const product = parseCatalogProductParam(data);

  if (!product) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
          <View style={styles.topRow}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <ThemedText type="headlineSm">←</ThemedText>
            </Pressable>
            <ThemedText type="headlineSm">Product</ThemedText>
            <View style={styles.topRowSpacer} />
          </View>
          <View style={styles.statusBlock}>
            <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.centerText}>
              This product couldn’t be loaded.
            </ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const images = product.image ? [product.image] : [];
  const ratingLabel =
    product.rating_score && product.review_count
      ? `${product.rating_score} · ${product.review_count} reviews`
      : product.rating_score ?? product.review_count ?? null;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ThemedText type="headlineSm">←</ThemedText>
          </Pressable>
          <ThemedText type="headlineSm">Product</ThemedText>
          <View style={styles.topRowSpacer} />
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          <ProductImageCarousel images={images} />

          <View style={styles.headerBlock}>
            <ThemedText type="headlineMd">{product.name}</ThemedText>
            <ThemedText type="headlineSm" themeColor="primary">
              {product.price}
            </ThemedText>
            {product.original_price ? (
              <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.strikeThrough}>
                {product.original_price}
              </ThemedText>
            ) : null}
            {product.discount ? (
              <ThemedText type="bodySm" themeColor="success">
                {product.discount}
              </ThemedText>
            ) : null}
          </View>

          {(product.brand_name || product.seller_name) && (
            <View style={styles.badgeRow}>
              {product.brand_name ? (
                <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="bodySm" themeColor="textSecondary">
                    {product.brand_name}
                  </ThemedText>
                </View>
              ) : null}
              {product.seller_name ? (
                <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="bodySm" themeColor="textSecondary">
                    {product.seller_name}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          )}

          <ListSection>
            {ratingLabel ? <ListRow label="Rating" value={ratingLabel} showChevron={false} /> : null}
            {product.item_sold ? <ListRow label="Sold" value={product.item_sold} showChevron={false} /> : null}
            {product.location ? <ListRow label="Location" value={product.location} showChevron={false} /> : null}
            <ListRow
              label="Availability"
              value={product.in_stock ? 'In stock' : 'Out of stock'}
              showChevron={false}
              isLast={!product.item_url}
            />
            {product.item_url ? (
              <ListRow
                label="View on Daraz"
                onPress={() => {
                  void openCatalogProductUrl(product.item_url);
                }}
                isLast
              />
            ) : null}
          </ListSection>

          <ThemedText type="bodySm" themeColor="textSecondary" style={styles.centerText}>
            Sourced from Daraz marketplace search — not synced to your store yet.
          </ThemedText>
        </ScrollView>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.three,
  },
  topRowSpacer: {
    width: 20,
  },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.four,
  },
  statusBlock: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
  },
  centerText: {
    textAlign: 'center',
  },
  headerBlock: {
    gap: Spacing.one,
  },
  strikeThrough: {
    textDecorationLine: 'line-through',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
});
