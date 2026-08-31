import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CatalogProductList } from '@/components/catalog-product-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useProductHunt } from '@/hooks/use-product-hunt';

export default function ProductRecommendationsScreen() {
  const { niche, title } = useLocalSearchParams<{ niche?: string; title?: string }>();
  const normalizedNiche = typeof niche === 'string' ? niche.trim() : '';
  const headerTitle = typeof title === 'string' && title.trim() ? title.trim() : 'Recommendations';
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const hunt = useProductHunt({
    niche: normalizedNiche,
    enabled: normalizedNiche.length > 0,
  });

  const summaryLabel =
    hunt.totalRecommended > 0
      ? `${hunt.totalRecommended} SIMILAR PRODUCT${hunt.totalRecommended === 1 ? '' : 'S'}`
      : undefined;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ThemedText type="headlineSm">←</ThemedText>
          </Pressable>
          <ThemedText type="headlineSm" numberOfLines={1} style={styles.headerTitle}>
            {headerTitle}
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          {normalizedNiche ? (
            <>
              <ThemedText type="bodyMd" themeColor="textSecondary">
                Curated picks in <ThemedText type="bodyMd">{normalizedNiche}</ThemedText> based on ratings, reviews, and price.
              </ThemedText>
              <CatalogProductList
                products={hunt.visibleProducts}
                isLoading={hunt.isLoading}
                isLoadingMore={hunt.isLoadingMore}
                error={hunt.error}
                hasMore={hunt.hasMore}
                summaryLabel={summaryLabel}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                emptyTitle="No recommendations found"
                emptyDescription="We couldn't find strong matches for this category right now. Try again later or hunt from the Product Hunting tool."
                onRefresh={hunt.refetch}
                onLoadMore={hunt.loadMore}
              />
            </>
          ) : (
            <View style={styles.statusBlock}>
              <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.centerText}>
                No category was provided for recommendations.
              </ThemedText>
            </View>
          )}
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.three,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.two,
  },
  headerSpacer: {
    width: 20,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  statusBlock: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
  },
  centerText: {
    textAlign: 'center',
  },
});
