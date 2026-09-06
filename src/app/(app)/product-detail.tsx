import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AreaChart, DonutChart, ChartLegend } from '@/components/finance-charts';
import {
  FinanceColors,
  FinanceChartSkeleton,
  FinanceEmptyState,
  FinanceKPICard,
  FinanceStatusBadge,
  ProfitMarginRing,
  formatPKR,
  formatCompact,
  DateRange,
} from '@/components/finance-kit';
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
import { useProductFinancials } from '@/hooks/use-product-financials';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, deleteProduct, type Product } from '@/lib/api';
import { getDefaultDates } from './product-financials';

type DetailTab = 'details' | 'finance' | 'insights' | 'chat';

export default function ProductDetailScreen() {
  const theme = useTheme();
  const { accessToken } = useAuth();
  const { id, source, tab: initialTab } = useLocalSearchParams<{ id?: string; source?: string; tab?: string }>();
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

  const [tab, setTab] = useState<DetailTab>(
    (initialTab === 'finance' && isDaraz) ? 'finance' : 'details',
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [dates, setDates] = useState<DateRange>(getDefaultDates);

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

  // Product financials — fetched lazily when the Finance tab is opened.
  const [financeRequested, setFinanceRequested] = useState(initialTab === 'finance');
  useEffect(() => {
    if (tab === 'finance') setFinanceRequested(true);
  }, [tab]);
  const productFinancials = useProductFinancials(
    financeRequested && isDaraz ? {
      sortBy: 'gross_revenue', startDate: dates.startDate, endDate: dates.endDate
    } : undefined,
  );
  const productFinData = useMemo(() => {
    if (!productFinancials.data || !id) return null;
    return productFinancials.data.products.find((p) => p.sku === id) ?? null;
  }, [productFinancials.data, id]);
  const finTrendData = useMemo(() => {
    if (!productFinancials.data?.daily_trend?.length) return [];
    return productFinancials.data.daily_trend.map((point) => ({
      x: new Date(point.date).getDate(),
      inflow: point.revenue,
      outflow: point.fees + point.refunds,
    }));
  }, [productFinancials.data]);
  const finFeeDonut = useMemo(() => {
    if (!productFinancials.data?.fee_distribution?.length) return [];
    const colors = [FinanceColors.fees, FinanceColors.warning, FinanceColors.primary, FinanceColors.neutral, FinanceColors.revenue, '#8B5CF6'];
    return productFinancials.data.fee_distribution.map((slice, i) => ({
      label: slice.category,
      value: slice.amount,
      color: colors[i % colors.length],
    }));
  }, [productFinancials.data]);

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
                  ...(isDaraz ? [{ value: 'finance' as const, label: 'Finance' }] : []),
                  { value: 'insights', label: 'Insights' },
                  { value: 'chat', label: 'Chat' },
                ]}
                value={tab}
                onChange={setTab}
              />
            </View>

            {tab === 'chat' ? (
              <ProductChatPanel product={product} insights={insights} style={styles.chatArea} />
            ) : tab === 'finance' && isDaraz ? (
              <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
                {productFinancials.isLoading ? (
                  <>
                    <View style={styles.kpiRow}>
                      {Array.from({ length: 4 }).map((_, i) => (
                        <FinanceChartSkeleton key={i} height={80} />
                      ))}
                    </View>
                    <FinanceChartSkeleton height={200} />
                  </>
                ) : productFinData ? (
                  <>
                    {/* Product financial hero */}
                    <ThemedView
                      type="surfaceContainerLowest"
                      style={[styles.finHeroCard, { borderLeftColor: productFinData.net_profit >= 0 ? FinanceColors.profit : FinanceColors.fees }]}>
                      <View style={styles.finHeroRow}>
                        <ThemedText type="labelMd" themeColor="textSecondary">NET PROFIT</ThemedText>
                        <ThemedText type="labelMd" style={{ color: productFinData.net_profit >= 0 ? FinanceColors.profit : FinanceColors.fees }}>
                          {productFinData.net_profit >= 0 ? 'PROFITABLE' : 'LOSS-MAKING'}
                        </ThemedText>
                      </View>
                      <ThemedText
                        type="displayLgMobile"
                        style={{ color: productFinData.net_profit >= 0 ? FinanceColors.profit : FinanceColors.fees }}>
                        {formatPKR(productFinData.net_profit)}
                      </ThemedText>
                      <ThemedText type="bodySm" themeColor="textSecondary">{productFinancials.data?.period}</ThemedText>
                    </ThemedView>

                    {/* KPI cards */}
                    <View style={styles.kpiRow}>
                      <FinanceKPICard title="Revenue" value={formatCompact(productFinData.gross_revenue)} icon="cash-multiple" tone="revenue" />
                      <FinanceKPICard title="Units Sold" value={String(productFinData.units_sold)} icon="package-variant-closed" tone="primary" />
                      <FinanceKPICard title="Total Fees" value={formatCompact(productFinData.total_fees)} icon="receipt" tone="fees" />
                      <FinanceKPICard title="Expenses" value={formatCompact(productFinData.product_expenses)} icon="cart-outline" tone="fees" />
                    </View>

                    {/* Profit margin ring + fee breakdown */}
                    <View style={styles.finGrid}>
                      <ThemedView type="surfaceContainerLowest" style={styles.finRingCard}>
                        <ThemedText type="bodyLg">Profit margin</ThemedText>
                        <ProfitMarginRing margin={productFinData.profit_margin} />
                      </ThemedView>

                      {finFeeDonut.length > 0 && (
                        <ThemedView type="surfaceContainerLowest" style={styles.finChartCard}>
                          <ThemedText type="bodyLg">Fee breakdown</ThemedText>
                          <DonutChart
                            data={finFeeDonut}
                            size={160}
                            centerLabel="Fees"
                            centerValue={formatCompact(productFinData.total_fees)}
                          />
                          <ChartLegend items={finFeeDonut.map((s) => ({ label: s.label, color: s.color }))} />
                        </ThemedView>
                      )}
                    </View>

                    {/* Daily trend */}
                    {finTrendData.length > 0 && (
                      <ThemedView type="surfaceContainerLowest" style={styles.finChartCard}>
                        <ThemedText type="bodyLg">Revenue & fees over time</ThemedText>
                        <AreaChart
                          data={finTrendData}
                          height={180}
                          inflowColor={FinanceColors.revenue}
                          outflowColor={FinanceColors.fees}
                        />
                        <ChartLegend
                          items={[
                            { label: 'Revenue', color: FinanceColors.revenue },
                            { label: 'Fees + Refunds', color: FinanceColors.fees },
                          ]}
                        />
                      </ThemedView>
                    )}

                    {/* Fee detail list */}
                    <ListSection>
                      <ListRow label="Gross Revenue" value={formatPKR(productFinData.gross_revenue)} showChevron={false} />
                      <ListRow label="Commission" value={formatPKR(productFinData.commission)} showChevron={false} />
                      <ListRow label="Payment Fees" value={formatPKR(productFinData.payment_fees)} showChevron={false} />
                      <ListRow label="Shipping Fees" value={formatPKR(productFinData.shipping_fees)} showChevron={false} />
                      <ListRow label="Penalties" value={formatPKR(productFinData.penalties)} showChevron={false} />
                      <ListRow label="Promo Discounts" value={formatPKR(productFinData.promotional_discounts)} showChevron={false} />
                      <ListRow label="Refunds" value={formatPKR(productFinData.refunds)} showChevron={false} />
                      <ListRow label="Net Revenue" value={formatPKR(productFinData.net_revenue)} showChevron={false} />
                      <ListRow label="Product Expenses" value={formatPKR(productFinData.product_expenses)} showChevron={false} />
                      <ListRow
                        label="Net Profit"
                        value={formatPKR(productFinData.net_profit)}
                        showChevron={false}
                        isLast
                      />
                    </ListSection>

                    {/* Orders for this product */}
                    {productFinData.orders && productFinData.orders.length > 0 && (
                      <View style={styles.ordersSection}>
                        <View style={styles.ordersHeader}>
                          <ThemedText type="headlineSm">Orders</ThemedText>
                          <ThemedText type="bodySm" themeColor="textSecondary">
                            {productFinData.orders.length} order{productFinData.orders.length !== 1 ? 's' : ''}
                          </ThemedText>
                        </View>
                        <View style={styles.ordersList}>
                          {productFinData.orders.map((order) => (
                            <Pressable
                              key={order.order_no}
                              onPress={() =>
                                router.push({
                                  pathname: '/order-detail',
                                  params: { id: order.order_no, channel: 'daraz' },
                                })
                              }
                              style={({ pressed }) => [
                                styles.orderCard,
                                { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest },
                                pressed && { opacity: 0.85 },
                              ]}>
                              <View style={styles.orderCardTopRow}>
                                <ThemedText type="labelMd">#{order.order_no}</ThemedText>
                                <FinanceStatusBadge status={order.orderItem_status} />
                              </View>
                              <View style={styles.orderCardBottomRow}>
                                <ThemedText type="bodySm" themeColor="textSecondary">
                                  {new Date(order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </ThemedText>
                                <ThemedText type="bodyLg" style={{ color: FinanceColors.revenue }}>
                                  {formatPKR(order.price)}
                                </ThemedText>
                              </View>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )}
                  </>
                ) : (
                  <FinanceEmptyState message="No financial data found for this product. Make sure it has sales in the selected period." />
                )}
              </ScrollView>
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
                      {isDaraz && product.id ? (
                        <ListRow
                          label="SEO Lab"
                          value="Keyword Analysis"
                          onPress={() =>
                            router.push({
                              pathname: '/keyword-analysis',
                              params: { item_id: String(product.id) },
                            })
                          }
                        />
                      ) : null}
                      <ListRow
                        label="Price"
                        value={formatPrice(product.price)}
                        showChevron={false}
                        isLast={!product.stockQuantity && !product.warrantyType && !product.url && !recommendationNiche && !isDaraz}
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
                ) : (
                  <ProductInsightsPanel insights={insights} />
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
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  finHeroCard: {
    padding: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: Spacing.one,
  },
  finHeroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  finGrid: {
    gap: Spacing.four,
  },
  finRingCard: {
    padding: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  finChartCard: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  ordersSection: {
    gap: Spacing.three,
  },
  ordersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ordersList: {
    gap: Spacing.two,
  },
  orderCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  orderCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderCardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
