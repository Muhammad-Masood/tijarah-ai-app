import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { KeywordAnalysisProgress } from '@/hooks/use-keyword-analysis';
import type { RepeatProduct, SeedKeyword, WinningKeyword } from '@/lib/api';

// ---------------------------------------------------------------------------
// Pipeline stage definitions
// ---------------------------------------------------------------------------

/** Ordered list of pipeline stages with user-friendly labels. */
export const PIPELINE_STAGES: { key: string; label: string }[] = [
  { key: 'fetching_product', label: 'Fetching your product' },
  { key: 'extracting_seed_keywords', label: 'Extracting seed keywords' },
  { key: 'building_catalog', label: 'Scanning competitors' },
  { key: 'filtering_by_similarity', label: 'Filtering relevant products' },
  { key: 'mining_keywords', label: 'Discovering keywords' },
  { key: 'clustering_keywords', label: 'Grouping keyword intents' },
  { key: 'building_keyword_graph', label: 'Building keyword graph' },
  { key: 'scoring_clusters', label: 'Ranking keywords' },
  { key: 'iterative_expansion', label: 'Expanding search' },
];

/** Maps a data event name to the pipeline stage it completes. */
const DATA_EVENT_TO_STAGE: Record<string, string> = {
  product_fetched: 'fetching_product',
  seed_keywords: 'extracting_seed_keywords',
  catalog_built: 'building_catalog',
  similarity_filter_done: 'filtering_by_similarity',
  keywords_mined: 'mining_keywords',
  keywords_clustered: 'clustering_keywords',
  graph_built: 'building_keyword_graph',
  clusters_scored: 'scoring_clusters',
  expansion_done: 'iterative_expansion',
};

/** Returns the index of the stage a data event completes, or -1. */
export function stageIndexForEvent(eventName: string): number {
  const stageKey = DATA_EVENT_TO_STAGE[eventName];
  if (!stageKey) return -1;
  return PIPELINE_STAGES.findIndex((s) => s.key === stageKey);
}

/** Returns a short summary string for a completed stage given the current progress. */
export function stageSummaryFor(stageKey: string, progress: KeywordAnalysisProgress): string | null {
  switch (stageKey) {
    case 'fetching_product':
      return progress.userProduct?.title ?? null;
    case 'extracting_seed_keywords':
      return progress.seedKeywords.length > 0 ? `${progress.seedKeywords.length} seed keywords` : null;
    case 'building_catalog':
      return progress.catalogSize != null ? `${progress.catalogSize} products scanned` : null;
    case 'filtering_by_similarity':
      return progress.relevantProducts != null ? `${progress.relevantProducts} relevant` : null;
    case 'mining_keywords':
      return progress.candidateKeywords != null ? `${progress.candidateKeywords} candidates` : null;
    case 'clustering_keywords':
      return progress.clusterCount != null ? `${progress.clusterCount} clusters` : null;
    case 'building_keyword_graph':
      return progress.communityCount != null ? `${progress.communityCount} communities` : null;
    case 'scoring_clusters':
      return progress.scoredCount != null ? `${progress.scoredCount} scored` : null;
    case 'iterative_expansion':
      return progress.iterationsRun != null ? `${progress.iterationsRun} iteration${progress.iterationsRun !== 1 ? 's' : ''}` : null;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// FadeInBlock — respects reduce-motion
// ---------------------------------------------------------------------------

function FadeInBlock({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(delay).duration(300)}>
      {children}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// AnalysisProgressStepper
// ---------------------------------------------------------------------------

type StepperProps = {
  /** The backend stage string currently executing, or null if not started / done. */
  currentStage: string | null;
  /** The highest stage index that has completed (from data events). -1 = none. */
  completedUpTo: number;
  progress: KeywordAnalysisProgress;
};

export function AnalysisProgressStepper({ currentStage, completedUpTo, progress }: StepperProps) {
  const theme = useTheme();

  return (
    <View style={styles.stepper}>
      {PIPELINE_STAGES.map((stage, index) => {
        const isCompleted = index <= completedUpTo;
        const isActive = !isCompleted && currentStage === stage.key;
        const isPending = !isCompleted && !isActive;
        const summary = isCompleted ? stageSummaryFor(stage.key, progress) : null;

        return (
          <FadeInBlock key={stage.key} delay={index * 60}>
            <View style={styles.stepRow}>
              {/* Indicator column */}
              <View style={styles.stepIndicatorCol}>
                {isCompleted ? (
                  <View style={[styles.stepDot, { backgroundColor: theme.success }]}>
                    <MaterialCommunityIcons name="check" size={14} color="#fff" />
                  </View>
                ) : isActive ? (
                  <View style={[styles.stepDot, { backgroundColor: theme.primary }]}>
                    <MaterialCommunityIcons name="progress-clock" size={12} color={theme.onPrimary} />
                  </View>
                ) : (
                  <View style={[styles.stepDot, { backgroundColor: theme.backgroundElement }]}>
                    <View style={[styles.stepDotInner, { backgroundColor: theme.textSecondary }]} />
                  </View>
                )}
                {index < PIPELINE_STAGES.length - 1 && (
                  <View
                    style={[
                      styles.stepConnector,
                      {
                        backgroundColor: isCompleted
                          ? theme.success
                          : theme.backgroundElement,
                      },
                    ]}
                  />
                )}
              </View>

              {/* Label + summary */}
              <View style={styles.stepContent}>
                <ThemedText
                  type="bodyMd"
                  themeColor={isPending ? 'textSecondary' : 'onSurface'}
                  style={isActive ? styles.stepLabelActive : undefined}>
                  {stage.label}
                </ThemedText>
                {summary && (
                  <ThemedText type="bodySm" themeColor="textSecondary" numberOfLines={1}>
                    {summary}
                  </ThemedText>
                )}
              </View>
            </View>
          </FadeInBlock>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// AnalysisSummaryCard
// ---------------------------------------------------------------------------

type SummaryProps = {
  catalogSize: number;
  relevantProducts: number;
  iterations: number;
  seedKeywords: SeedKeyword[];
};

export function AnalysisSummaryCard({ catalogSize, relevantProducts, iterations, seedKeywords }: SummaryProps) {
  const theme = useTheme();

  return (
    <FadeInBlock>
      <ThemedView type="surfaceContainerLowest" style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <SummaryStat label="Catalog" value={String(catalogSize)} theme={theme} />
          <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
          <SummaryStat label="Relevant" value={String(relevantProducts)} theme={theme} />
          <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
          <SummaryStat label="Iterations" value={String(iterations)} theme={theme} />
        </View>

        {seedKeywords.length > 0 && (
          <View style={styles.seedBlock}>
            <ThemedText type="labelMd" themeColor="textSecondary">SEED KEYWORDS</ThemedText>
            <View style={styles.seedChips}>
              {seedKeywords.map((kw) => (
                <View key={kw.keyword} style={[styles.seedChip, { backgroundColor: theme.primaryContainer }]}>
                  <ThemedText type="bodySm" themeColor="primary">{kw.keyword}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}
      </ThemedView>
    </FadeInBlock>
  );
}

function SummaryStat({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.summaryStat}>
      <ThemedText type="displayLgMobile">{value}</ThemedText>
      <ThemedText type="bodySm" themeColor="textSecondary">{label}</ThemedText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// KeywordScoreBar
// ---------------------------------------------------------------------------

type ScoreBarProps = {
  score: number;
  maxScore: number;
};

export function KeywordScoreBar({ score, maxScore }: ScoreBarProps) {
  const theme = useTheme();
  const ratio = maxScore > 0 ? Math.min(score / maxScore, 1) : 0;

  return (
    <View style={styles.scoreBarTrack}>
      <View
        style={[
          styles.scoreBarFill,
          {
            width: `${ratio * 100}%` as unknown as number,
            backgroundColor: theme.primary,
          },
        ]}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// WinningKeywordRow
// ---------------------------------------------------------------------------

type KeywordRowProps = {
  keyword: WinningKeyword;
  maxWinningScore: number;
  index: number;
};

export function WinningKeywordRow({ keyword, maxWinningScore, index }: KeywordRowProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const relevancePct = Math.round(keyword.relevance_score * 100);

  return (
    <FadeInBlock delay={index * 40}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [
          styles.keywordCard,
          { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest },
          pressed && { opacity: 0.85 },
        ]}>
        {/* Top row: rank + keyword + score badge */}
        <View style={styles.keywordTopRow}>
          <View style={styles.keywordRankBadge}>
            <ThemedText type="labelMd" themeColor="textSecondary">#{index + 1}</ThemedText>
          </View>
          <View style={styles.keywordTitleCol}>
            <ThemedText type="bodyLg" numberOfLines={1}>{keyword.keyword}</ThemedText>
            <KeywordScoreBar score={keyword.winning_score} maxScore={maxWinningScore} />
          </View>
          <View style={[styles.scoreBadge, { backgroundColor: theme.primaryContainer }]}>
            <ThemedText type="labelMd" themeColor="primary">{keyword.winning_score.toFixed(1)}</ThemedText>
          </View>
        </View>

        {/* Metrics row */}
        <View style={styles.keywordMetricsRow}>
          <MetricPill label="Relevance" value={`${relevancePct}%`} theme={theme} />
          <MetricPill label="Competition" value={String(keyword.competition_count)} theme={theme} />
          <MetricPill label="Matches" value={String(keyword.matching_products)} theme={theme} />
          {keyword.cluster_size > 1 && (
            <MetricPill label="Cluster" value={String(keyword.cluster_size)} theme={theme} />
          )}
        </View>

        {/* Expanded: variants + example products */}
        {expanded && (
          <FadeInBlock>
            <View style={styles.keywordExpanded}>
              {keyword.keyword_variants.length > 0 && (
                <View style={styles.expandedBlock}>
                  <ThemedText type="labelMd" themeColor="textSecondary">VARIANTS</ThemedText>
                  <View style={styles.seedChips}>
                    {keyword.keyword_variants.map((v) => (
                      <View key={v} style={[styles.seedChip, { backgroundColor: theme.backgroundElement }]}>
                        <ThemedText type="bodySm" themeColor="textSecondary">{v}</ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {keyword.example_products.length > 0 && (
                <View style={styles.expandedBlock}>
                  <ThemedText type="labelMd" themeColor="textSecondary">EXAMPLE PRODUCTS</ThemedText>
                  {keyword.example_products.slice(0, 5).map((name, i) => (
                    <View key={`${name}-${i}`} style={styles.exampleProductRow}>
                      <View style={[styles.exampleProductImage, styles.exampleProductPlaceholder, { backgroundColor: theme.backgroundElement }]}>
                        <MaterialCommunityIcons name="package-variant" size={16} color={theme.textSecondary} />
                      </View>
                      <ThemedText type="bodySm" numberOfLines={2} style={styles.exampleProductName}>
                        {name}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </FadeInBlock>
        )}
      </Pressable>
    </FadeInBlock>
  );
}

function MetricPill({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[styles.metricPill, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="bodySm" themeColor="textSecondary">{label}</ThemedText>
      <ThemedText type="labelMd">{value}</ThemedText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// TopCompetitorCard
// ---------------------------------------------------------------------------

type CompetitorProps = {
  product: RepeatProduct;
  index: number;
};

export function TopCompetitorCard({ product, index }: CompetitorProps) {
  const theme = useTheme();
  const [showKeywords, setShowKeywords] = useState(false);

  const rating = product.ratingScore ? parseFloat(product.ratingScore) : null;
  const reviewCount = product.review ? parseInt(product.review, 10) : null;
  const hasExpandableKeywords = (product.keywords_matched?.length ?? 0) > 0;

  return (
    <FadeInBlock delay={index * 50}>
      <Pressable
        onPress={hasExpandableKeywords ? () => setShowKeywords((v) => !v) : undefined}
        style={({ pressed }) => [
          styles.competitorCard,
          { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest },
          pressed && { opacity: 0.88 },
        ]}>
        {/* Header row: image + name + badge */}
        <View style={styles.competitorHeader}>
          {product.image ? (
            <Image
              source={{ uri: product.image }}
              style={styles.competitorImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.competitorImage, styles.competitorPlaceholder, { backgroundColor: theme.backgroundElement }]}>
              <MaterialCommunityIcons name="store-outline" size={22} color={theme.textSecondary} />
            </View>
          )}

          <View style={styles.competitorInfo}>
            <ThemedText type="bodyMd" numberOfLines={2}>{product.name}</ThemedText>
            {/* Stats row */}
            <View style={styles.competitorStatsRow}>
              {rating != null && (
                <View style={styles.competitorStatItem}>
                  <MaterialCommunityIcons name="star" size={14} color="#F59E0B" />
                  <ThemedText type="bodySm">{rating.toFixed(1)}</ThemedText>
                </View>
              )}
              {reviewCount != null && (
                <View style={styles.competitorStatItem}>
                  <MaterialCommunityIcons name="message-text-outline" size={14} color={theme.textSecondary} />
                  <ThemedText type="bodySm" themeColor="textSecondary">{reviewCount}</ThemedText>
                </View>
              )}
              {product.unitSold && (
                <View style={styles.competitorStatItem}>
                  <MaterialCommunityIcons name="trending-up" size={14} color={theme.success} />
                  <ThemedText type="bodySm" themeColor="textSecondary">{product.unitSold}</ThemedText>
                </View>
              )}
            </View>
            <ThemedText type="bodySm" themeColor="textSecondary">
              Appears in {product.appearance_count} keyword{product.appearance_count !== 1 ? 's' : ''}
            </ThemedText>
          </View>

          <View style={styles.competitorRightCol}>
            <View style={[styles.competitorBadge, { backgroundColor: theme.tertiaryContainer }]}>
              <ThemedText type="labelMd" themeColor="tertiary">{product.appearance_count}x</ThemedText>
            </View>
            {product.url && (
              <Pressable
                onPress={() => Linking.openURL(product.url!.startsWith('//') ? `https:${product.url}` : product.url!)}
                hitSlop={6}
                accessibilityLabel="Open on Daraz">
                <MaterialCommunityIcons name="open-in-new" size={18} color={theme.primary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Expandable keywords */}
        {showKeywords && hasExpandableKeywords && (
          <FadeInBlock>
            <View style={styles.competitorKeywordsBlock}>
              <ThemedText type="labelMd" themeColor="textSecondary">MATCHED KEYWORDS</ThemedText>
              <View style={styles.seedChips}>
                {product.keywords_matched!.map((kw) => (
                  <View key={kw} style={[styles.seedChip, { backgroundColor: theme.backgroundElement }]}>
                    <ThemedText type="bodySm" themeColor="textSecondary">{kw}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          </FadeInBlock>
        )}

        {hasExpandableKeywords && (
          <View style={styles.competitorExpandHint}>
            <ThemedText type="bodySm" themeColor="primary">
              {showKeywords ? 'Hide keywords' : `View ${product.keywords_matched!.length} matched keywords`}
            </ThemedText>
          </View>
        )}
      </Pressable>
    </FadeInBlock>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Stepper
  stepper: { gap: 0 },
  stepRow: { flexDirection: 'row', gap: Spacing.two, minHeight: 44 },
  stepIndicatorCol: { alignItems: 'center', width: 24 },
  stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepDotInner: { width: 8, height: 8, borderRadius: 4 },
  stepConnector: { width: 2, flex: 1, minHeight: 8 },
  stepContent: { flex: 1, gap: Spacing.half, paddingBottom: Spacing.two },
  stepLabelActive: { fontWeight: '600' },

  // Summary card
  summaryCard: { padding: Spacing.four, borderRadius: Radius.md, borderWidth: 1, gap: Spacing.three },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  summaryStat: { alignItems: 'center', gap: Spacing.half },
  summaryDivider: { width: 1, height: 32 },
  seedBlock: { gap: Spacing.one },
  seedChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  seedChip: { borderRadius: Radius.full, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },

  // Score bar
  scoreBarTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.08)', overflow: 'hidden', marginTop: Spacing.one },
  scoreBarFill: { height: '100%' as unknown as number, borderRadius: 2 },

  // Keyword card
  keywordCard: { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.three, gap: Spacing.two },
  keywordTopRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  keywordRankBadge: { width: 28, alignItems: 'center' },
  keywordTitleCol: { flex: 1, minWidth: 0 },
  scoreBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  keywordMetricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  metricPill: { borderRadius: Radius.full, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, gap: Spacing.half, alignItems: 'center' },
  keywordExpanded: { gap: Spacing.three, paddingTop: Spacing.one },
  expandedBlock: { gap: Spacing.one },
  exampleProductRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  exampleProductImage: { width: 32, height: 32, borderRadius: Radius.sm },
  exampleProductPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  exampleProductName: { flex: 1 },

  // Competitor card
  competitorCard: { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.three, gap: Spacing.two },
  competitorHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  competitorImage: { width: 56, height: 56, borderRadius: Radius.sm },
  competitorPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  competitorInfo: { flex: 1, gap: Spacing.half },
  competitorStatsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, alignItems: 'center' },
  competitorStatItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  competitorRightCol: { alignItems: 'center', gap: Spacing.two },
  competitorBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  competitorKeywordsBlock: { gap: Spacing.one },
  competitorExpandHint: { alignItems: 'center' },
});
