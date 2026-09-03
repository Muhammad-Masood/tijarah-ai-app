import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

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

  // 1. Initial full-page skeleton loader
  if (isLoading && products.length === 0) {
    return <ProductListSkeleton count={6} />;
  }

  const renderItem = ({ item }: { item: CatalogProductItem }) => (
    <View style={viewMode === 'grid' ? styles.gridCardWrapper : styles.listCardWrapper}>
      <CatalogProductRow
        product={item}
        variant={viewMode}
        onPress={() => navigateToCatalogProduct(item)}
      />
    </View>
  );

  const keyExtractor = (item: CatalogProductItem, index: number) =>
    `${item.item_id || 'catalog'}-${index}`;

  // 3. Clean, unified Toolbar (Summary + Segmented View Switcher)
  const renderHeader = !summaryLabel && !onViewModeChange ? null : (
      <View style={styles.toolbarContainer}>
        {summaryLabel ? (
          <ThemedText type="labelMd" themeColor="textSecondary" style={styles.summaryText}>
            {summaryLabel}
          </ThemedText>
        ) : (
          <View />
        )}

        {onViewModeChange && (
          <View style={[styles.segmentedControl, { backgroundColor: theme.surfaceContainer || '#f1f5f9' }]}>
            <Pressable
              onPress={() => onViewModeChange('grid')}
              style={[
                styles.segmentTab,
                viewMode === 'grid' && [styles.activeSegmentTab, { backgroundColor: theme.surface || '#ffffff' }],
              ]}
              hitSlop={4}>
              <MaterialCommunityIcons
                name="view-grid-outline"
                size={18}
                color={viewMode === 'grid' ? theme.primary : theme.textSecondary}
              />
            </Pressable>

            <Pressable
              onPress={() => onViewModeChange('list')}
              style={[
                styles.segmentTab,
                viewMode === 'list' && [styles.activeSegmentTab, { backgroundColor: theme.surface || '#ffffff' }],
              ]}
              hitSlop={4}>
              <MaterialCommunityIcons
                name="view-agenda-outline"
                size={18}
                color={viewMode === 'list' ? theme.primary : theme.textSecondary}
              />
            </Pressable>
          </View>
        )}
      </View>
    );

  // 4. Integrated Empty / Error state (Allows pull-to-refresh directly on the screen)
  const renderEmptyComponent = () => {
    if (isLoading) return null;

    if (error) {
      return (
        <View style={styles.stateContainer}>
          <View style={[styles.iconCircle, { backgroundColor: '#fee2e2' }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#dc2626" />
          </View>
          <ThemedText type="headlineSm" style={styles.stateTitle}>
            Something went wrong
          </ThemedText>
          <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.stateDescription}>
            {error}
          </ThemedText>
          <Pressable
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={onRefresh}>
            <ThemedText type="labelMd" style={styles.actionButtonText}>
              Try Again
            </ThemedText>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.stateContainer}>
        <View style={[styles.iconCircle, { backgroundColor: theme.surfaceContainer || '#f3f4f6' }]}>
          <MaterialCommunityIcons name="package-variant-closed" size={32} color={theme.textSecondary} />
        </View>
        <ThemedText type="headlineSm" style={styles.stateTitle}>
          {emptyTitle}
        </ThemedText>
        {emptyDescription ? (
          <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.stateDescription}>
            {emptyDescription}
          </ThemedText>
        ) : null}
      </View>
    );
  };

  return (
    <FlatList
      data={products}
      key={viewMode} // Re-creates layout cleanly on layout mode change
      numColumns={viewMode === 'grid' ? 2 : 1}
      columnWrapperStyle={viewMode === 'grid' ? styles.gridRowGutter : undefined}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmptyComponent}
      contentContainerStyle={[
        styles.listContainer,
        products.length === 0 && styles.emptyListContainer,
        contentContainerStyle,
      ]}
      ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
      refreshControl={
        <RefreshControl
          refreshing={isLoading && products.length > 0}
          onRefresh={onRefresh}
          tintColor={theme.primary}
        />
      }
      onEndReached={() => {
        if (hasMore && !isLoadingMore && !isLoading) onLoadMore();
      }}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        isLoadingMore ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  // Toolbar & Segmented Switch
  toolbarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.three,
    marginBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  summaryText: {
    fontWeight: '500',
  },
  segmentedControl: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: Radius.full,
  },
  segmentTab: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSegmentTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  // Grid / List Item Structure
  gridRowGutter: {
    gap: Spacing.three,
  },
  gridCardWrapper: {
    flex: 1, // 50% width on 2 columns
  },
  listCardWrapper: {
    width: '100%',
  },
  rowSeparator: {
    height: Spacing.three,
  },
  // State Views (Empty & Error)
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  stateTitle: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  stateDescription: {
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
    marginBottom: Spacing.four,
  },
  actionButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.full,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
});