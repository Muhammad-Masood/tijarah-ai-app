import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { CatalogProductRow } from '@/components/catalog-product-row';
import { ProductListSkeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
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
  viewMode?: 'list' | 'grid';
  onViewModeChange?: (mode: 'list' | 'grid') => void;
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
  viewMode = 'list',
  onViewModeChange,
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

  const viewOptions: Array<'list' | 'grid'> = ['list', 'grid'];

  return (
    <>
      {onViewModeChange ? (
        <View style={styles.viewToggleRow}>
          {viewOptions.map((mode) => {
            const isActive = mode === viewMode;
            return (
              <Pressable
                key={mode}
                onPress={() => onViewModeChange(mode)}
                style={[
                  styles.viewToggle,
                  {
                    borderColor: isActive ? theme.primary : theme.border,
                    backgroundColor: isActive ? theme.primaryContainer : theme.surfaceContainerLowest,
                  },
                ]}>
                <ThemedText type="labelMd" themeColor={isActive ? 'onPrimaryContainer' : 'textSecondary'}>
                  {mode === 'list' ? 'List' : 'Grid'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <FlatList
        data={products}
        key={viewMode}
        numColumns={viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        keyExtractor={(item, index) => `${item.item_id || 'catalog'}-${index}`}
        renderItem={({ item }) => (
          <CatalogProductRow product={item} variant={viewMode} onPress={() => navigateToCatalogProduct(item)} />
        )}
        contentContainerStyle={[styles.listContent, viewMode === 'grid' ? styles.gridContent : null, contentContainerStyle]}
        ItemSeparatorComponent={viewMode === 'list' ? () => <View style={styles.separator} /> : undefined}
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
    </>
  );
}

const styles = StyleSheet.create({
  viewToggleRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  viewToggle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  listContent: {
    paddingBottom: Spacing.five,
    gap: Spacing.two,
  },
  gridContent: {
    paddingBottom: Spacing.five,
    gap: Spacing.two,
  },
  gridRow: {
    justifyContent: 'space-between',
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
