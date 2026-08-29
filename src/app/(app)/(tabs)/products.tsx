import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductRow } from '@/components/product-kit';
import { ProductListSkeleton } from '@/components/skeleton';
import { StoreSelectorSheet, type StoreOption } from '@/components/store-selector-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useDarazProducts } from '@/hooks/use-daraz-products';
import { useShopifyProducts } from '@/hooks/use-shopify-products';
import { useSupportedMarketplaces } from '@/hooks/use-supported-marketplaces';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Product } from '@/lib/api';

function filterByQuery(products: Product[], query: string): Product[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return products;
  return products.filter(
    (product) =>
      product.title.toLowerCase().includes(normalized) ||
      product.category.toLowerCase().includes(normalized),
  );
}

export default function ProductsScreen() {
  const theme = useTheme();
  // const { products, isLoading, error, refetch } = useProducts();
  const {
    products: darazProducts,
    isConnected: isDarazConnected,
    isLoading: isDarazLoading,
    error: darazError,
    refetch: refetchDaraz,
  } = useDarazProducts();
  const {
    products: shopifyProducts,
    isConnected: isShopifyConnected,
    isLoading: isShopifyLoading,
    error: shopifyError,
    refetch: refetchShopify,
  } = useShopifyProducts();
  const {
    marketplaces,
    isLoading: isLoadingMarketplaces,
    error: marketplacesError,
    refetch: refetchMarketplaces,
  } = useSupportedMarketplaces();
  const [query, setQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreOption>('all');
  const [isStorePickerVisible, setIsStorePickerVisible] = useState(false);

  // Only marketplaces the merchant has actually connected are worth picking
  // between here — an unconnected one has no products to show.
  const connectedMarketplaces = useMemo(() => marketplaces.filter((marketplace) => marketplace.is_connected), [marketplaces]);
  const selectedMarketplace =
    selectedStore === 'all' ? null : (connectedMarketplaces.find((marketplace) => marketplace.id === selectedStore) ?? null);
  // Provenance badge on each row always points at Daraz today — it's the
  // only marketplace with a real product feed, regardless of which filter is active.
  const darazMarketplace = useMemo(
    () => connectedMarketplaces.find((marketplace) => marketplace.slug === 'daraz'),
    [connectedMarketplaces],
  );  const shopifyMarketplace = useMemo(
    () => connectedMarketplaces.find((marketplace) => marketplace.slug === 'shopify'),
    [connectedMarketplaces],
  );

  // Daraz is the only marketplace with a real product feed today — this
  // guards the section so switching to a different connected store (once
  // one has its own product hook) doesn't show Daraz's catalog under it.
  const showDarazProducts = isDarazConnected && (selectedStore === 'all' || selectedMarketplace?.slug === 'daraz');
  const showShopifyProducts = isShopifyConnected && (selectedStore === 'all' || selectedMarketplace?.slug === 'shopify');

  // const filteredProducts = useMemo(() => filterByQuery(products, query), [products, query]);
  const filteredDarazProducts = useMemo(() => filterByQuery(darazProducts, query), [darazProducts, query]);
  const filteredShopifyProducts = useMemo(() => filterByQuery(shopifyProducts, query), [shopifyProducts, query]);

  function handleRefresh() {
    // refetch();
    refetchDaraz();
    refetchShopify();
    refetchMarketplaces();
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={styles.topRow}>
          <ThemedText type="headlineMd">Products</ThemedText>
          <Pressable onPress={() => router.push('/product-form')} hitSlop={8}>
            <ThemedText type="headlineSm" themeColor="primary">
              +
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchInputRow,
              {
                borderColor: isSearchFocused ? theme.primary : theme.border,
                borderWidth: isSearchFocused ? 1.5 : 1,
                backgroundColor: theme.surfaceContainerLowest,
                shadowColor: theme.primary,
                shadowOpacity: isSearchFocused ? 0.16 : 0,
              },
            ]}>
            <ThemedText type="bodyMd" themeColor="textSecondary">
              🔍
            </ThemedText>
            <TextInput
              value={query}
              onChangeText={setQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="Search products"
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.text }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isDarazLoading || isShopifyLoading} onRefresh={handleRefresh} tintColor={theme.primary} />
          }>

          {connectedMarketplaces.length > 0 && (
            <View style={styles.darazSection}>
              <Pressable
                onPress={() => setIsStorePickerVisible(true)}
                style={[styles.storeSelector, { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest, shadowColor: theme.outline }]}
                hitSlop={8}>
                {selectedMarketplace && (
                  <View style={[styles.storeSelectorLogo, { backgroundColor: theme.primaryContainer }]}>
                    <Image
                      source={{ uri: selectedMarketplace.logo_url }}
                      style={styles.storeSelectorLogoImage}
                      contentFit="contain"
                    />
                  </View>
                )}
                <ThemedText type="bodyMd" style={styles.darazHeading}>
                  {selectedMarketplace ? selectedMarketplace.name : 'All Stores'}
                </ThemedText>
                <ThemedText type="bodySm" themeColor="textSecondary">
                  ▾
                </ThemedText>
              </Pressable>

              {showDarazProducts && (
                <>
                  {isDarazLoading && <ProductListSkeleton count={3} />}

                  {!isDarazLoading && darazError && (
                    <View style={styles.statusBlock}>
                      <ThemedText type="bodyMd" themeColor="danger" style={styles.centerText}>
                        {darazError}
                      </ThemedText>
                      <Pressable onPress={refetchDaraz} hitSlop={8}>
                        <ThemedText type="bodyMd" themeColor="primary" style={styles.retryText}>
                          Try again
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}

                  {!isDarazLoading && !darazError && darazProducts.length === 0 && (
                    <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.centerText}>
                      No products found on Daraz yet.
                    </ThemedText>
                  )}

                  {!isDarazLoading && !darazError && filteredDarazProducts.length > 0 && (
                    <View style={styles.list}>
                      <ThemedText type="labelMd" themeColor="textSecondary">
                        {filteredDarazProducts.length} PRODUCT{filteredDarazProducts.length === 1 ? '' : 'S'}
                      </ThemedText>
                      {filteredDarazProducts.map((product, index) => (
                        <ProductRow
                          key={`daraz:${product.id ?? index}`}
                          product={product}
                          marketplaceLogo={darazMarketplace?.logo_url}
                          onPress={() =>
                            router.push({
                              pathname: '/product-detail',
                              params: { id: product.id ?? String(index), source: 'daraz' },
                            })
                          }
                        />
                      ))}
                    </View>
                  )}
                </>
              )}

              {showShopifyProducts && (
                <>
                  {isShopifyLoading && <ProductListSkeleton count={3} />}
                  {!isShopifyLoading && shopifyError && <View style={styles.statusBlock}><ThemedText type="bodyMd" themeColor="danger" style={styles.centerText}>{shopifyError}</ThemedText><Pressable onPress={refetchShopify}><ThemedText type="bodyMd" themeColor="primary">Try again</ThemedText></Pressable></View>}
                  {!isShopifyLoading && !shopifyError && shopifyProducts.length === 0 && <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.centerText}>No products found on Shopify yet.</ThemedText>}
                  {!isShopifyLoading && !shopifyError && filteredShopifyProducts.length > 0 && (
                    <View style={styles.list}>
                      <ThemedText type="labelMd" themeColor="textSecondary">
                        {filteredShopifyProducts.length} SHOPIFY PRODUCT{filteredShopifyProducts.length === 1 ? '' : 'S'}
                      </ThemedText>
                      {filteredShopifyProducts.map((product, index) => (
                        <ProductRow
                          key={`shopify:${product.id ?? index}`}
                          product={product}
                          marketplaceLogo={shopifyMarketplace?.logo_url}
                          onPress={() =>
                            router.push({
                              pathname: '/product-detail',
                              params: { id: product.id ?? String(index), source: 'shopify' },
                            })
                          }
                        />
                      ))}
                    </View>
                  )}
                </>
              )}
              {!showDarazProducts && !showShopifyProducts && selectedMarketplace && <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.centerText}>No products available for {selectedMarketplace.name} yet.</ThemedText>}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <StoreSelectorSheet
        visible={isStorePickerVisible}
        selected={selectedStore}
        marketplaces={connectedMarketplaces}
        isLoading={isLoadingMarketplaces}
        error={marketplacesError}
        onRetry={refetchMarketplaces}
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
  searchRow: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.three,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 0,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.half,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.two,
  },
  darazSection: {
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  darazHeading: {
    fontWeight: '600',
  },
  storeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  storeSelectorLogo: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeSelectorLogoImage: {
    width: 16,
    height: 16,
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
});
