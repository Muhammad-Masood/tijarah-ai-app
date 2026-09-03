import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListRow, ListSection } from '@/components/list-kit';
import { ProductChatPanel } from '@/components/product-chat';
import { formatPrice } from '@/components/product-kit';
import { ProductImageCarousel } from '@/components/product-image-carousel';
import { ProductInsightsPanel } from '@/components/product-insights';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { ProductDetailSkeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useDarazProducts } from '@/hooks/use-daraz-products';
import { useShopifyProducts } from '@/hooks/use-shopify-products';
import { useProductInsights } from '@/hooks/use-product-insights';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, deleteProduct, type Product } from '@/lib/api';

type DetailTab = 'details' | 'insights' | 'chat';

export default function ProductDetailScreen() {
  const theme = useTheme();
  const { accessToken } = useAuth();
  const { id, source } = useLocalSearchParams<{ id?: string; source?: string }>();
  const isDaraz = source === 'daraz';
  const isShopify = source === 'shopify';
  const daraz = useDarazProducts();
  const shopify = useShopifyProducts();
  const product: Product | null = isDaraz
    ? (daraz.products.find((item) => item.id === id) ?? null)
    : isShopify ? (shopify.products.find((item) => item.id === id) ?? null) : null;
  const isLoading = isDaraz ? daraz.isLoading : isShopify ? shopify.isLoading : false;
  const error = isDaraz ? daraz.error : isShopify ? shopify.error : null;
  const refetch = isDaraz ? daraz.refetch : shopify.refetch;
  const notFound = (isDaraz || isShopify) && !isLoading && !error && !product;
  const images = useMemo(() => {
    if (!product) return [];
    if (product.images && product.images.length > 0) return product.images;
    return product.image ? [product.image] : [];
  }, [product]);
  const recommendationNiche = product?.category?.trim() ?? '';

  const [tab, setTab] = useState<DetailTab>('details');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Insights/returns data is needed by both the Insights and Chat tabs. Owning the fetch here
  // (rather than in each tab's own component) means switching tabs doesn't unmount/remount the
  // fetching hook and re-hit the insight APIs. `needsInsights` stays true once tripped so that
  // navigating away and back doesn't refetch either — and it only starts once a relevant tab is
  // actually opened, instead of firing for products the user never inspects.
  const needsInsightsNow = tab === 'insights' || tab === 'chat';
  const [needsInsights, setNeedsInsights] = useState(needsInsightsNow);
  useEffect(() => {
    if (needsInsightsNow) setNeedsInsights(true);
  }, [needsInsightsNow]);
  const insights = useProductInsights(product, { enabled: needsInsights && isDaraz });

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

        {(isLoading || error || notFound) && (
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
          </ScrollView>
        )}

        {!isLoading && !error && product && (
          <>
            <View style={styles.tabsRow}>
              <SegmentedTabs
                options={[
                  { value: 'details', label: 'Details' },
                  { value: 'insights', label: 'Insights' },
                  { value: 'chat', label: 'Chat' },
                ]}
                value={tab}
                onChange={setTab}
              />
            </View>

            {tab === 'chat' ? (
              <ProductChatPanel product={product} insights={insights} style={styles.chatArea} />
            ) : (
              <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
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
                      {recommendationNiche ? (
                        <ListRow
                          label="Similar products"
                          value="Recommendations"
                          onPress={() =>
                            router.push({
                              pathname: '/product-recommendations',
                              params: { niche: recommendationNiche, title: 'Similar products' },
                            })
                          }
                        />
                      ) : null}
                      <ListRow
                        label="Price"
                        value={formatPrice(product.price)}
                        showChevron={false}
                        isLast={!product.stockQuantity && !product.warrantyType && !product.url && !recommendationNiche}
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

                    {(isDaraz || isShopify) && (
                      <ThemedText type="bodySm" themeColor="textSecondary" style={styles.centerText}>
                        This product is managed on {isDaraz ? 'Daraz' : 'Shopify'}.
                      </ThemedText>
                    )}

                    {!isDaraz && !isShopify && (
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
                ) : isDaraz ? (
                  <ProductInsightsPanel insights={insights} />
                ) : (
                  <View style={[styles.insightsCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <ThemedText type="headlineSm" style={styles.centerText}>
                      ✨
                    </ThemedText>
                    <ThemedText type="bodyLg" style={styles.centerText}>
                      AI insights are coming soon
                    </ThemedText>
                    <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.centerText}>
                      Review sentiment and return analytics are available for products synced from Daraz.
                    </ThemedText>
                  </View>
                )}
              </ScrollView>
            )}
          </>
        )}
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
  tabsRow: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  chatArea: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
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
