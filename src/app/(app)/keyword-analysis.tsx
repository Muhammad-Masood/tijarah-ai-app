import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AnalysisProgressStepper,
  AnalysisSummaryCard,
  PIPELINE_STAGES,
  TopCompetitorCard,
  WinningKeywordRow,
} from '@/components/keyword-analysis-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useKeywordAnalysis } from '@/hooks/use-keyword-analysis';
import { useTheme } from '@/hooks/use-theme';

/** Derives the highest completed stage index from the incremental progress object. */
function completedStageIndex(progress: ReturnType<typeof useKeywordAnalysis>['progress']): number {
  if (progress.finalCatalogSize != null) return PIPELINE_STAGES.length - 1;
  if (progress.iterationsRun != null) return PIPELINE_STAGES.findIndex((s) => s.key === 'iterative_expansion');
  if (progress.scoredCount != null) return PIPELINE_STAGES.findIndex((s) => s.key === 'scoring_clusters');
  if (progress.communityCount != null) return PIPELINE_STAGES.findIndex((s) => s.key === 'building_keyword_graph');
  if (progress.clusterCount != null) return PIPELINE_STAGES.findIndex((s) => s.key === 'clustering_keywords');
  if (progress.candidateKeywords != null) return PIPELINE_STAGES.findIndex((s) => s.key === 'mining_keywords');
  if (progress.relevantProducts != null) return PIPELINE_STAGES.findIndex((s) => s.key === 'filtering_by_similarity');
  if (progress.catalogSize != null) return PIPELINE_STAGES.findIndex((s) => s.key === 'building_catalog');
  if (progress.seedKeywords.length > 0) return PIPELINE_STAGES.findIndex((s) => s.key === 'extracting_seed_keywords');
  if (progress.userProduct) return PIPELINE_STAGES.findIndex((s) => s.key === 'fetching_product');
  return -1;
}

export default function KeywordAnalysisScreen() {
  const theme = useTheme();
  const { item_id } = useLocalSearchParams<{ item_id?: string }>();
  const itemId = item_id ? Number(item_id) : null;

  const { result, isLoading, isStreaming, error, currentStage, progress, refetch } = useKeywordAnalysis(itemId);

  const completedUpTo = useMemo(() => completedStageIndex(progress), [progress]);
  const hasResult = result != null;
  const maxWinningScore = useMemo(
    () => (result?.winning_keywords.length ? Math.max(...result.winning_keywords.map((k) => k.winning_score)) : 1),
    [result],
  );

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back">
            <MaterialCommunityIcons name="arrow-left" size={24} color={theme.onSurface} />
          </Pressable>
          <ThemedText type="headlineSm">Keyword Analysis</ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

          {/* Error banner — shown without discarding existing progress */}
          {error && (
            <ThemedView type="surfaceContainerLowest" style={[styles.errorBanner, { borderColor: theme.danger }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color={theme.danger} />
              <ThemedText type="bodyMd" themeColor="danger" style={styles.errorText}>{error}</ThemedText>
              <Pressable onPress={refetch} hitSlop={8}>
                <ThemedText type="bodyMd" themeColor="primary" style={styles.retryText}>Retry</ThemedText>
              </Pressable>
            </ThemedView>
          )}

          {/* Streaming progress */}
          {isStreaming && !hasResult && (
            <>
              {progress.userProduct && (
                <ThemedView type="surfaceContainerLowest" style={styles.productPreviewCard}>
                  <View style={styles.productPreviewRow}>
                    <MaterialCommunityIcons name="package-variant" size={20} color={theme.primary} />
                    <ThemedText type="bodyMd" numberOfLines={2} style={styles.productPreviewTitle}>
                      {progress.userProduct.title}
                    </ThemedText>
                  </View>
                  {progress.userProduct.category && (
                    <ThemedText type="bodySm" themeColor="textSecondary">
                      {progress.userProduct.category}
                    </ThemedText>
                  )}
                </ThemedView>
              )}

              <AnalysisProgressStepper
                currentStage={currentStage}
                completedUpTo={completedUpTo}
                progress={progress}
              />

              {!isLoading && !error && completedUpTo < 0 && (
                <View style={styles.connectingBlock}>
                  <ActivityIndicator color={theme.primary} />
                  <ThemedText type="bodySm" themeColor="textSecondary">
                    Connecting to analysis pipeline...
                  </ThemedText>
                </View>
              )}
            </>
          )}

          {/* Results dashboard */}
          {hasResult && (
            <>
              {/* Product card */}
              <ThemedView type="surfaceContainerLowest" style={styles.resultProductCard}>
                <View style={styles.resultProductRow}>
                  <MaterialCommunityIcons name="package-variant" size={22} color={theme.primary} />
                  <View style={styles.resultProductInfo}>
                    <ThemedText type="bodyLg" numberOfLines={2}>{result.user_product.title}</ThemedText>
                    {result.user_product.category && (
                      <ThemedText type="bodySm" themeColor="textSecondary">{result.user_product.category}</ThemedText>
                    )}
                  </View>
                </View>
              </ThemedView>

              {/* Summary */}
              <AnalysisSummaryCard
                catalogSize={result.total_catalog_size}
                relevantProducts={result.total_relevant_products}
                iterations={result.iterations_run}
                seedKeywords={result.seed_keywords}
              />

              {/* Winning Keywords */}
              {result.winning_keywords.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <ThemedText type="headlineSm">Winning Keywords</ThemedText>
                    <ThemedText type="bodySm" themeColor="textSecondary">
                      {result.winning_keywords.length} keyword{result.winning_keywords.length !== 1 ? 's' : ''}
                    </ThemedText>
                  </View>
                  <View style={styles.keywordsList}>
                    {result.winning_keywords.map((kw, i) => (
                      <WinningKeywordRow key={kw.keyword} keyword={kw} maxWinningScore={maxWinningScore} index={i} />
                    ))}
                  </View>
                </View>
              )}

              {/* Top Competitors */}
              {result.repeat_products.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <ThemedText type="headlineSm">Top Competitors</ThemedText>
                    <ThemedText type="bodySm" themeColor="textSecondary">
                      {result.repeat_products.length} repeat competitor{result.repeat_products.length !== 1 ? 's' : ''}
                    </ThemedText>
                  </View>
                  <View style={styles.competitorsList}>
                    {result.repeat_products
                      .slice()
                      .sort((a, b) => b.appearance_count - a.appearance_count)
                      .map((p, i) => (
                        <TopCompetitorCard key={p.item_id} product={p} index={i} />
                      ))}
                  </View>
                </View>
              )}

              {/* Empty keywords state */}
              {result.winning_keywords.length === 0 && (
                <ThemedView type="surfaceContainerLowest" style={styles.emptyStateCard}>
                  <MaterialCommunityIcons name="text-search" size={28} color={theme.textSecondary} />
                  <ThemedText type="bodyLg">No keywords found</ThemedText>
                  <ThemedText type="bodySm" themeColor="textSecondary" style={styles.centerText}>
                    The analysis didn't surface any winning keywords for this product. Try re-analyzing or check the product has a title and description.
                  </ThemedText>
                </ThemedView>
              )}

              {/* Re-analyze button */}
              <Pressable
                onPress={refetch}
                disabled={isStreaming}
                style={({ pressed }) => [
                  styles.reanalyzeButton,
                  { backgroundColor: theme.primary },
                  pressed && { opacity: 0.85 },
                ]}>
                {isStreaming ? (
                  <ActivityIndicator color={theme.onPrimary} />
                ) : (
                  <View style={styles.reanalyzeRow}>
                    <MaterialCommunityIcons name="refresh" size={18} color={theme.onPrimary} />
                    <ThemedText type="bodyLg" themeColor="onPrimary" style={styles.reanalyzeLabel}>
                      Re-analyze
                    </ThemedText>
                  </View>
                )}
              </Pressable>
            </>
          )}

          {/* Initial loading (before streaming starts) */}
          {isLoading && !isStreaming && !error && (
            <View style={styles.connectingBlock}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText type="bodySm" themeColor="textSecondary">
                Preparing analysis...
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  headerSpacer: { width: 24 },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  errorText: { flex: 1 },
  retryText: { textDecorationLine: 'underline' },

  // Product preview during streaming
  productPreviewCard: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.one,
  },
  productPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  productPreviewTitle: { flex: 1 },

  // Connecting block
  connectingBlock: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },

  // Result product card
  resultProductCard: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  resultProductRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  resultProductInfo: { flex: 1, gap: Spacing.half },

  // Sections
  section: { gap: Spacing.three },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  keywordsList: { gap: Spacing.two },
  competitorsList: { gap: Spacing.two },

  // Empty state
  emptyStateCard: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  centerText: { textAlign: 'center' },

  // Re-analyze
  reanalyzeButton: {
    borderRadius: Radius.DEFAULT,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reanalyzeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  reanalyzeLabel: { fontWeight: '600' },
});
