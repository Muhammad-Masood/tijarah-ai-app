import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListRow, ListSection } from '@/components/list-kit';
import { formatPrice } from '@/components/product-kit';
import { ProductImageCarousel } from '@/components/product-image-carousel';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { ProductDetailSkeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useDarazProducts } from '@/hooks/use-daraz-products';
import { useProduct } from '@/hooks/use-product';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, deleteProduct, type Product } from '@/lib/api';

type DetailTab = 'details' | 'insights';

export default function ProductDetailScreen() {
  const theme = useTheme();
  const { accessToken } = useAuth();
  const { id, source } = useLocalSearchParams<{ id?: string; source?: string }>();
  const isDaraz = source === 'daraz';

  const daraz = useDarazProducts();

  const product: Product | null = isDaraz ? (daraz.products.find((p) => p.id === id) ?? null) : null;
  const isLoading = isDaraz ? daraz.isLoading : false;
  const error = isDaraz ? daraz.error : null;
  const refetch = daraz.refetch;
  const notFound = isDaraz && !isLoading && !error && !product;

  const images = useMemo(() => {
    if (!product) return [];
    if (product.images && product.images.length > 0) return product.images;
    return product.image ? [product.image] : [];
  }, [product]);

  const [tab, setTab] = useState<DetailTab>('details');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleDelete() {
    if (!product?.id || !accessToken) return;
    Alert.alert('Delete product', `Delete "${product.title}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleteError(null);
          setIsDeleting(true);
          try {
            await deleteProduct(accessToken, product.id!);
            router.back();
          } catch (err) {
            setDeleteError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  }

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
          {isLoading && <ProductDetailSkeleton />}

          {!isLoading && error && (
            <View style={styles.statusBlock}>
              <ThemedText type="bodyMd" themeColor="danger" style={styles.centerText}>
                {error}
              </ThemedText>
              <Pressable onPress={refetch} hitSlop={8}>
                <ThemedText type="bodyMd" themeColor="primary" style={styles.retryText}>
                  Try again
                </ThemedText>
              </Pressable>
            </View>
          )}

          {notFound && (
            <View style={styles.statusBlock}>
              <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.centerText}>
                This product couldn’t be found.
              </ThemedText>
            </View>
          )}

          {!isLoading && !error && product && (
            <>
              <SegmentedTabs
                options={[
                  { value: 'details', label: 'Details' },
                  { value: 'insights', label: 'Insights' },
                ]}
                value={tab}
                onChange={setTab}
              />

              {tab === 'details' ? (
                <>
                  <ProductImageCarousel images={images} />

                  <View style={styles.headerBlock}>
                    <ThemedText type="headlineMd">{product.title}</ThemedText>
                    <ThemedText type="headlineSm" themeColor="primary">
                      {formatPrice(product.price)}
                    </ThemedText>
                  </View>

                  {(product.brand || product.model) && (
                    <View style={styles.badgeRow}>
                      {product.brand && (
                        <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
                          <ThemedText type="bodySm" themeColor="textSecondary">
                            {product.brand}
                          </ThemedText>
                        </View>
                      )}
                      {product.model && (
                        <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
                          <ThemedText type="bodySm" themeColor="textSecondary">
                            {product.model}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  )}

                  <ListSection>
                    <ListRow label="Category" value={product.category} showChevron={false} />
                    <ListRow
                      label="Price"
                      value={formatPrice(product.price)}
                      showChevron={false}
                      isLast={!product.stockQuantity && !product.warrantyType && !product.url}
                    />
                    {typeof product.stockQuantity === 'number' && (
                      <ListRow
                        label="In stock"
                        value={String(product.stockQuantity)}
                        showChevron={false}
                        isLast={!product.warrantyType && !product.url}
                      />
                    )}
                    {product.warrantyType && (
                      <ListRow
                        label="Warranty"
                        value={product.warrantyType}
                        showChevron={false}
                        isLast={!product.url}
                      />
                    )}
                    {product.url && (
                      <ListRow label="View on marketplace" onPress={() => Linking.openURL(product.url)} isLast />
                    )}
                  </ListSection>

                  <View style={styles.descriptionBlock}>
                    <ThemedText type="labelMd" themeColor="textSecondary">
                      DESCRIPTION
                    </ThemedText>
                    <ThemedText type="bodyMd">{product.description}</ThemedText>
                  </View>

                  {isDaraz && (
                    <ThemedText type="bodySm" themeColor="textSecondary" style={styles.centerText}>
                      This product is managed on Daraz.
                    </ThemedText>
                  )}

                  {!isDaraz && (
                    <>
                      {deleteError && (
                        <ThemedText type="bodySm" themeColor="danger" style={styles.centerText}>
                          {deleteError}
                        </ThemedText>
                      )}

                      <View style={styles.actionRow}>
                        <Pressable
                          onPress={() => router.push({ pathname: '/product-form', params: { id: product.id ?? '' } })}
                          style={[styles.editButton, { backgroundColor: theme.primary }]}>
                          <ThemedText type="bodyLg" themeColor="onPrimary" style={styles.actionLabel}>
                            Edit
                          </ThemedText>
                        </Pressable>
                        <Pressable
                          onPress={handleDelete}
                          disabled={isDeleting}
                          style={[styles.deleteButton, { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest }]}>
                          {isDeleting ? (
                            <ActivityIndicator color={theme.danger} />
                          ) : (
                            <ThemedText type="bodyLg" themeColor="danger" style={styles.actionLabel}>
                              Delete
                            </ThemedText>
                          )}
                        </Pressable>
                      </View>
                    </>
                  )}
                </>
              ) : (
                <View style={[styles.insightsCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <ThemedText type="headlineSm" style={styles.centerText}>
                    ✨
                  </ThemedText>
                  <ThemedText type="bodyLg" style={styles.centerText}>
                    AI insights are coming soon
                  </ThemedText>
                  <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.centerText}>
                    Sales trends, pricing suggestions, and stock alerts for this product will show up here.
                  </ThemedText>
                </View>
              )}
            </>
          )}
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
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  centerText: {
    textAlign: 'center',
  },
  retryText: {
    textDecorationLine: 'underline',
  },
  headerBlock: {
    gap: Spacing.one,
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
  descriptionBlock: {
    gap: Spacing.one,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  editButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.DEFAULT,
    paddingVertical: Spacing.three,
  },
  deleteButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.DEFAULT,
    paddingVertical: Spacing.three,
  },
  actionLabel: {
    fontWeight: '600',
  },
  insightsCard: {
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
});
