import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CatalogProductList } from '@/components/catalog-product-list';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useCatalogSearch } from '@/hooks/use-catalog-search';
import { useProductHunt } from '@/hooks/use-product-hunt';
import { useTheme } from '@/hooks/use-theme';

type HuntMode = 'search' | 'hunt';

export default function ProductHuntingToolScreen() {
  const theme = useTheme();
  const [mode, setMode] = useState<HuntMode>('search');
  const [inputValue, setInputValue] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');

  const search = useCatalogSearch({
    query: submittedQuery,
    enabled: mode === 'search' && submittedQuery.length > 0,
  });

  const hunt = useProductHunt({
    niche: submittedQuery,
    enabled: mode === 'hunt' && submittedQuery.length > 0,
  });

  const active = mode === 'search' ? search : hunt;
  const products = mode === 'search' ? search.products : hunt.visibleProducts;
  const summaryLabel =
    mode === 'search' && search.totalProducts > 0
      ? `${search.totalProducts} RESULT${search.totalProducts === 1 ? '' : 'S'}`
      : mode === 'hunt' && hunt.totalRecommended > 0
        ? `${hunt.totalRecommended} RECOMMENDATION${hunt.totalRecommended === 1 ? '' : 'S'}`
        : undefined;

  function handleSubmit() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setSubmittedQuery(trimmed);
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ThemedText type="headlineSm">←</ThemedText>
          </Pressable>
          <ThemedText type="headlineSm">Product Hunting</ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <ThemedText type="bodyMd" themeColor="textSecondary">
            Discover marketplace products by category or niche. Search the catalog or run a hunt for curated recommendations.
          </ThemedText>

          <SegmentedTabs
            options={[
              { value: 'search', label: 'Search' },
              { value: 'hunt', label: 'Hunt' },
            ]}
            value={mode}
            onChange={(value) => {
              setMode(value);
              setSubmittedQuery('');
            }}
          />

          <View
            style={[
              styles.searchInputRow,
              { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest },
            ]}>
            <TextInput
              value={inputValue}
              onChangeText={setInputValue}
              onSubmitEditing={handleSubmit}
              placeholder={mode === 'search' ? 'Search by keyword or category' : 'Enter a niche to hunt'}
              placeholderTextColor={theme.textSecondary}
              returnKeyType="search"
              style={[styles.searchInput, { color: theme.text }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              onPress={handleSubmit}
              style={[styles.searchButton, { backgroundColor: theme.primary }]}
              hitSlop={8}>
              <ThemedText type="bodyMd" themeColor="onPrimary" style={styles.searchButtonLabel}>
                Go
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.listArea}>
            {!submittedQuery ? (
              <View style={styles.statusBlock}>
                <ThemedText type="bodyLg" style={styles.centerText}>
                  {mode === 'search' ? 'Search the catalog' : 'Hunt for recommendations'}
                </ThemedText>
                <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.centerText}>
                  {mode === 'search'
                    ? 'Enter a keyword or category, then tap Go to browse matching listings.'
                    : 'Enter a niche and we will scrape and rank products worth selling.'}
                </ThemedText>
              </View>
            ) : (
              <CatalogProductList
                products={products}
                isLoading={active.isLoading}
                isLoadingMore={active.isLoadingMore}
                error={active.error}
                hasMore={active.hasMore}
                summaryLabel={summaryLabel}
                emptyTitle={mode === 'search' ? 'No products found' : 'No recommendations yet'}
                emptyDescription={
                  mode === 'search'
                    ? 'Try a broader keyword or different category.'
                    : 'Try another niche or adjust your hunt filters later.'
                }
                onRefresh={active.refetch}
                onLoadMore={active.loadMore}
              />
            )}
          </View>
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
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  searchButton: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  searchButtonLabel: {
    fontWeight: '600',
  },
  listArea: {
    flex: 1,
  },
  statusBlock: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  centerText: {
    textAlign: 'center',
  },
});
