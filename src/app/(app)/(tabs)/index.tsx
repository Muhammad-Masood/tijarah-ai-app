import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AgentActivityList,
  BusinessHealthCard,
  CompactInsightCard,
  FeatureGraphCard,
  goToInsights,
  ImpactStrip,
  InventoryRiskList,
  MetricCard,
  PrimaryInsightCard,
  SectionHeading,
  SentimentCard,
} from '@/components/dashboard-kit';
import { ProductRow } from '@/components/product-kit';
import { StoreSelectorSheet, type StoreOption } from '@/components/store-selector-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  agentActivity,
  allInsights,
  businessHealth,
  dummyProducts,
  featureGraphs,
  impactStrip,
  inventoryRisks,
  inventoryRisksTotalCount,
  periodMetrics,
  primaryInsight,
  primaryInsightActions,
  sentimentSummary,
  trueProfit,
} from '@/constants/dashboard-mock';
import { unreadNotificationCount } from '@/constants/notifications-mock';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useProducts } from '@/hooks/use-products';
import { useSupportedMarketplaces } from '@/hooks/use-supported-marketplaces';
import { useTheme } from '@/hooks/use-theme';

const RECENT_PRODUCTS_PREVIEW_COUNT = 3;

const DATE_RANGE_OPTIONS = ['Last 7 days', 'Last 30 days', 'Last 90 days'];

export default function DashboardScreen() {
  const theme = useTheme();
  const { marketplaces, isLoading: isLoadingMarketplaces, error: marketplacesError, refetch } =
    useSupportedMarketplaces();
  const { products, isLoading: isLoadingProducts, refetch: refetchProducts } = useProducts();
  const isRefreshing = isLoadingMarketplaces || isLoadingProducts;

  function handleRefresh() {
    refetch();
    refetchProducts();
  }

  const [selectedStore, setSelectedStore] = useState<StoreOption>('all');
  const [isStorePickerVisible, setIsStorePickerVisible] = useState(false);
  const [dateRangeIndex, setDateRangeIndex] = useState(0);
  const [primaryDismissed, setPrimaryDismissed] = useState(false);

  const connectedMarketplaces = useMemo(
    () => marketplaces.filter((marketplace) => marketplace.is_connected),
    [marketplaces],
  );
  const selectedMarketplace =
    selectedStore === 'all'
      ? null
      : (connectedMarketplaces.find((marketplace) => marketplace.id === selectedStore) ?? null);

  function handleInsightAction(label: string) {
    // "Review products" / "Apply suggested prices" have no detail screen yet
    // (no backend for AI insights — see dashboard-mock.ts). "Ask Tijarah" is
    // the one action with a real destination: the Ask Tijarah nav tab.
    if (label === 'Ask Tijarah') {
      router.push('/ask-tijarah');
    }
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}>
          <View style={styles.topBar}>
            <Pressable onPress={() => setIsStorePickerVisible(true)} style={styles.storeSelector} hitSlop={8}>
              {selectedMarketplace && (
                <View style={[styles.storeSelectorLogo, { backgroundColor: theme.primaryContainer }]}>
                  <Image
                    source={{ uri: selectedMarketplace.logo_url }}
                    style={styles.storeSelectorLogoImage}
                    contentFit="contain"
                  />
                </View>
              )}
              <ThemedText type="bodyLg" style={styles.storeSelectorLabel}>
                {selectedMarketplace ? selectedMarketplace.name : 'All Stores'}
              </ThemedText>
              <ThemedText type="bodySm" themeColor="textSecondary">
                ▾
              </ThemedText>
            </Pressable>

            <View style={styles.topBarRight}>
              <Pressable
                onPress={() => setDateRangeIndex((index) => (index + 1) % DATE_RANGE_OPTIONS.length)}
                style={styles.dateRangeSelector}
                hitSlop={8}>
                <ThemedText type="bodySm" themeColor="textSecondary">
                  {DATE_RANGE_OPTIONS[dateRangeIndex]} ▾
                </ThemedText>
              </Pressable>
              <Pressable onPress={() => router.push('/notifications')} hitSlop={8} style={styles.bellButton}>
                <SymbolView
                  tintColor={theme.text}
                  name="bell"
                  size={20}
                  fallback={
                    <ThemedText themeColor="text" style={styles.bellFallback}>
                      🔔
                    </ThemedText>
                  }
                />
                {unreadNotificationCount > 0 && (
                  <View style={[styles.unreadDot, { backgroundColor: theme.danger, borderColor: theme.background }]} />
                )}
              </Pressable>
            </View>
          </View>

          {!isLoadingMarketplaces && !marketplacesError && marketplaces.length === 0 && (
            <View style={[styles.connectStoresPrompt, { borderColor: theme.border, backgroundColor: theme.primaryContainer }]}>
              <View style={styles.connectStoresText}>
                <ThemedText type="bodyMd" style={styles.connectStoresTitle}>
                  Connect your first store
                </ThemedText>
                <ThemedText type="bodySm" themeColor="textSecondary">
                  Sync products, orders, and inventory from Shopify, Daraz, or Amazon to see real numbers here.
                </ThemedText>
              </View>
              <Pressable
                onPress={() => router.push('/connect-stores')}
                style={({ pressed }) => [styles.connectStoresButton, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
                <ThemedText type="bodySm" themeColor="onPrimary" style={styles.connectStoresButtonLabel}>
                  Connect
                </ThemedText>
              </Pressable>
            </View>
          )}

          <BusinessHealthCard status={businessHealth.status} supportingLine={businessHealth.supportingLine} />

          <MetricCard data={trueProfit} size="lg" />

          {primaryDismissed ? (
            <View style={[styles.dismissedNotice, { borderColor: theme.border }]}>
              <ThemedText type="bodySm" themeColor="textSecondary">
                Insight dismissed.
              </ThemedText>
              <Pressable onPress={() => setPrimaryDismissed(false)} hitSlop={8}>
                <ThemedText type="bodySm" themeColor="primary">
                  Undo
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <PrimaryInsightCard
              data={primaryInsight}
              actions={primaryInsightActions}
              whyThis={primaryInsight.whyThis}
              onAction={handleInsightAction}
              onDismiss={() => setPrimaryDismissed(true)}
            />
          )}

          <ImpactStrip label={impactStrip.label} />

          <View style={styles.metricsRow}>
            {periodMetrics.map((metric) => (
              <MetricCard key={metric.label} data={metric} />
            ))}
          </View>

          <View style={styles.subsection}>
            <SectionHeading title="Inventory risks" />
            <InventoryRiskList risks={inventoryRisks} totalCount={inventoryRisksTotalCount} onViewAll={goToInsights} />
          </View>

          <View style={styles.subsection}>
            <SectionHeading title="Customer sentiment" />
            <SentimentCard data={sentimentSummary} />
          </View>

          <View style={styles.subsection}>
            <SectionHeading title="Recent agent activity" />
            <AgentActivityList items={agentActivity} />
          </View>

          <View style={styles.subsection}>
            <SectionHeading
              title="Products"
              action={
                <Pressable onPress={() => router.push('/product-form')} hitSlop={8}>
                  <ThemedText type="bodySm" themeColor="primary" style={styles.addProductLabel}>
                    + Add product
                  </ThemedText>
                </Pressable>
              }
            />
            {isLoadingProducts && (
              <ThemedText type="bodySm" themeColor="textSecondary">
                Loading products…
              </ThemedText>
            )}
            {!isLoadingProducts && products.length === 0 && (
              <>
                <ThemedText type="bodySm" themeColor="textSecondary">
                  No products yet — here&apos;s a preview of how they&apos;ll look. Add your first to replace these.
                </ThemedText>
                <View style={styles.productList}>
                  {dummyProducts.map((product) => (
                    <ProductRow key={product.id} product={product} onPress={() => router.push('/products')} />
                  ))}
                </View>
              </>
            )}
            {!isLoadingProducts && products.length > 0 && (
              <View style={styles.productList}>
                {products.slice(0, RECENT_PRODUCTS_PREVIEW_COUNT).map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    onPress={() => router.push({ pathname: '/product-detail', params: { id: product.id ?? '' } })}
                  />
                ))}
              </View>
            )}
            <Pressable onPress={() => router.push('/products')} hitSlop={8} style={styles.viewAllInsightsRow}>
              <ThemedText type="bodySm" themeColor="primary">
                View all products
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.subsection}>
            <SectionHeading title="Your Business at a Glance" />
            <View style={styles.graphGrid}>
              {featureGraphs.map((graph) => (
                <FeatureGraphCard key={graph.id} data={graph} />
              ))}
            </View>
          </View>

          <View style={styles.subsection}>
            <SectionHeading title="All Insights" />
            {allInsights.map((insight) => (
              <CompactInsightCard key={insight.id} data={insight} onAction={handleInsightAction} />
            ))}
            <Pressable onPress={goToInsights} hitSlop={8} style={styles.viewAllInsightsRow}>
              <ThemedText type="bodySm" themeColor="primary">
                View all insights
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      <StoreSelectorSheet
        visible={isStorePickerVisible}
        selected={selectedStore}
        marketplaces={connectedMarketplaces}
        isLoading={isLoadingMarketplaces}
        error={marketplacesError}
        onRetry={refetch}
        onClose={() => setIsStorePickerVisible(false)}
        onSelect={(value) => {
          setSelectedStore(value);
          setIsStorePickerVisible(false);
        }}
      />
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
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  storeSelectorLogo: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeSelectorLogoImage: {
    width: 16,
    height: 16,
  },
  storeSelectorLabel: {
    fontWeight: '600',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  dateRangeSelector: {
    paddingVertical: Spacing.one,
  },
  bellButton: {
    position: 'relative',
  },
  bellFallback: {
    fontSize: 18,
    lineHeight: 20,
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  connectStoresPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  connectStoresText: {
    flex: 1,
    gap: Spacing.half,
  },
  connectStoresTitle: {
    fontWeight: '600',
  },
  connectStoresButton: {
    borderRadius: Radius.DEFAULT,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  connectStoresButtonLabel: {
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
  dismissedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  subsection: {
    gap: Spacing.two,
  },
  addProductLabel: {
    fontWeight: '600',
  },
  productList: {
    gap: Spacing.two,
  },
  graphGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  viewAllInsightsRow: {
    alignSelf: 'center',
    paddingVertical: Spacing.two,
  },
});
