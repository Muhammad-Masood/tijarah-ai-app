import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductRow } from '@/components/product-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useDarazProducts } from '@/hooks/use-daraz-products';
import { useProducts } from '@/hooks/use-products';
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
  const { products, isLoading, error, refetch } = useProducts();
  const {
    products: darazProducts,
    isConnected: isDarazConnected,
    isLoading: isDarazLoading,
    error: darazError,
    refetch: refetchDaraz,
  } = useDarazProducts();
  const [query, setQuery] = useState('');

  const filteredProducts = useMemo(() => filterByQuery(products, query), [products, query]);
  const filteredDarazProducts = useMemo(() => filterByQuery(darazProducts, query), [darazProducts, query]);

  function handleRefresh() {
    refetch();
    refetchDaraz();
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
          <View style={[styles.searchInputRow, { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest }]}>
            <ThemedText type="bodyMd" themeColor="textSecondary">
              🔍
            </ThemedText>
            <TextInput
              value={query}
              onChangeText={setQuery}
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
            <RefreshControl refreshing={isLoading || isDarazLoading} onRefresh={handleRefresh} tintColor={theme.primary} />
          }>
          {isLoading && (
            <View style={styles.statusBlock}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText type="bodyMd" themeColor="textSecondary">
                Loading products…
              </ThemedText>
            </View>
          )}

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

          {!isLoading && !error && products.length === 0 && (
            <View style={styles.statusBlock}>
              <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.centerText}>
                No products yet — tap + to add your first product.
              </ThemedText>
            </View>
          )}

          {!isLoading && !error && products.length > 0 && filteredProducts.length === 0 && (
            <View style={styles.statusBlock}>
              <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.centerText}>
                No products match “{query}”.
              </ThemedText>
            </View>
          )}

          {!isLoading && !error && filteredProducts.length > 0 && (
            <View style={styles.list}>
              {filteredProducts.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onPress={() => router.push({ pathname: '/product-detail', params: { id: product.id ?? '' } })}
                />
              ))}
            </View>
          )}

          {isDarazConnected && (
            <View style={styles.darazSection}>
              <ThemedText type="bodyLg" style={styles.darazHeading}>
                From Daraz
              </ThemedText>

              {isDarazLoading && (
                <View style={styles.statusBlock}>
                  <ActivityIndicator color={theme.primary} />
                  <ThemedText type="bodyMd" themeColor="textSecondary">
                    Loading Daraz products…
                  </ThemedText>
                </View>
              )}

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
                  {filteredDarazProducts.map((product, index) => (
                    <ProductRow key={product.id ?? index} product={product} onPress={() => {}} />
                  ))}
                </View>
              )}
            </View>
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
    borderWidth: 1,
    borderRadius: Radius.DEFAULT,
    paddingHorizontal: Spacing.three,
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
    paddingTop: Spacing.three,
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
