import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { CatalogProductRow } from '@/components/catalog-product-row';
import { ProductListSkeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { navigateToCatalogProduct } from '@/lib/catalog-navigation';
import type { CatalogProductItem } from '@/lib/api';

type CatalogProductListProps = {
  products: CatalogProductItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  summaryLabel?: string;
  onRefresh: () => void;
  onLoadMore: () => void;
  contentContainerStyle?: object;
};

export function CatalogProductList({
  products,
  isLoading,
  isLoadingMore,
  error,
  hasMore,
  emptyTitle,
  emptyDescription,
  summaryLabel,
  onRefresh,
  onLoadMore,
  contentContainerStyle,
}: CatalogProductListProps) {
  const theme = useTheme();

  if (isLoading && products.length === 0) {
    return <ProductListSkeleton count={5} />;
  }

  if (error && products.length === 0) {
    return (
      <View style={styles.statusBlock}>
        <ThemedText type="bodyMd" themeColor="danger" style={styles.centerText}>
          {error}
        </ThemedText>
        <Pressable onPress={onRefresh} hitSlop={8}>
          <ThemedText type="bodyMd" themeColor="primary" style={styles.retryText}>
            Try again
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  if (!isLoading && !error && products.length === 0) {
    return (
      <View style={styles.statusBlock}>
        <ThemedText type="bodyLg" style={styles.centerText}>
          {emptyTitle}
        </ThemedText>
        {emptyDescription ? (
          <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.centerText}>
            {emptyDescription}
          </ThemedText>
        ) : null}
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      keyExtractor={(item, index) => `${item.item_id || 'catalog'}-${index}`}
      renderItem={({ item }) => (
        <CatalogProductRow
          product={item}
          onPress={() => navigateToCatalogProduct(item)}
        />
      )}
      contentContainerStyle={[styles.listContent, contentContainerStyle]}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={
        <RefreshControl refreshing={isLoading && products.length > 0} onRefresh={onRefresh} tintColor={theme.primary} />
      }
      onEndReached={() => {
        if (hasMore && !isLoadingMore && !isLoading) onLoadMore();
      }}
      onEndReachedThreshold={0.35}
      ListHeaderComponent={
        summaryLabel ? (
          <ThemedText type="labelMd" themeColor="textSecondary" style={styles.summary}>
            {summaryLabel}
          </ThemedText>
        ) : null
      }
      ListFooterComponent={
        isLoadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: Spacing.five,
    gap: Spacing.two,
  },
  separator: {
    height: Spacing.two,
  },
  summary: {
    marginBottom: Spacing.two,
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
  footer: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
});
