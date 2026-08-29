import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { SeverityBadge } from '@/components/dashboard-kit';
import { formatPrice } from '@/components/product-kit';
import { ListRow, ListSection } from '@/components/list-kit';
import { resolveToneColor, Sparkline } from '@/components/mini-charts';
import { ThemedText } from '@/components/themed-text';
import type { Severity, Tone } from '@/constants/dashboard-mock';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { UseProductInsightsResult } from '@/hooks/use-product-insights';

const KNOWN_SEVERITIES: Severity[] = ['high', 'medium', 'low'];
const SEVERITY_WEIGHT: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Sentiment reads as a health zone, not just a raw number — thresholds mirror the severity tone convention used elsewhere. */
const SENTIMENT_ZONES: { label: string; tone: Tone; ceiling: number }[] = [
  { label: 'Needs attention', tone: 'danger', ceiling: 40 },
  { label: 'Mixed signal', tone: 'warning', ceiling: 70 },
  { label: 'Strong', tone: 'success', ceiling: 100 },
];

function toSeverity(value: string): Severity {
  return (KNOWN_SEVERITIES as string[]).includes(value) ? (value as Severity) : 'low';
}

function sentimentZone(score: number) {
  return SENTIMENT_ZONES.find((zone) => score < zone.ceiling) ?? SENTIMENT_ZONES[SENTIMENT_ZONES.length - 1];
}

function formatMonthLabel(key: string): string {
  const month = Number(key.split('-')[1]);
  return MONTH_LABELS[month - 1] ?? key;
}

/** Fades content in on mount — respects reduce-motion. */
function FadeInBlock({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(delay).duration(320)}>
      {children}
    </Animated.View>
  );
}

/** Inline status while an SSE source is still streaming. */
function StreamingStatus({ label }: { label: string }) {
  return (
    <ThemedText type="bodySm" themeColor="textSecondary" style={styles.streamingText}>
      {label}
    </ThemedText>
  );
}

/** Flat instrument-style gauge: a tri-zone track with calibration ticks at the zone boundaries, and the active zone called out below. No dial or gradient — matches the system's tonal, shadow-free surface language. */
function SentimentMeter({ score }: { score: number }) {
  const theme = useTheme();
  const zone = sentimentZone(score);
  const fillColor = resolveToneColor(theme, zone.tone);
  const fillWidth = `${Math.min(100, Math.max(0, score))}%` as const;

  return (
    <View
      style={styles.meterBlock}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Sentiment score ${score} out of 100 — ${zone.label}`}>
      <View style={[styles.meterTrack, { backgroundColor: theme.surfaceContainerHigh }]}>
        <View style={[styles.meterFill, { width: fillWidth, backgroundColor: fillColor }]} />
        <View style={[styles.meterTick, { left: '40%', backgroundColor: theme.surfaceContainerLowest }]} />
        <View style={[styles.meterTick, { left: '70%', backgroundColor: theme.surfaceContainerLowest }]} />
      </View>
      <View style={styles.meterLabelRow}>
        {SENTIMENT_ZONES.map((z, index) => {
          const isActive = z.label === zone.label;
          return (
            <ThemedText
              key={z.label}
              type="bodySm"
              style={[
                styles.meterLabel,
                index === 0 && styles.meterLabelLeft,
                index === 2 && styles.meterLabelRight,
                { color: isActive ? resolveToneColor(theme, z.tone) : theme.textSecondary },
                isActive && styles.meterLabelActive,
              ]}>
              {z.label}
            </ThemedText>
          );
        })}
      </View>
    </View>
  );
}

/** AI review analysis + return analytics for a Daraz-sourced product. The caller owns the `useProductInsights` fetch (shared with the Chat tab) and passes the result in, so switching tabs doesn't remount and refetch it. */
export function ProductInsightsPanel({ insights }: { insights: UseProductInsightsResult }) {
  const theme = useTheme();
  const {
    reviewAnalysis,
    reviewError,
    returnsInsights,
    returnsError,
    isConnected,
    isLoading,
    isReviewStreaming,
    isReturnsStreaming,
    error,
    reviewStage,
    returnsStage,
    refetch,
  } = insights;

  const hasReviewContent = reviewAnalysis != null;
  const showInitialLoader = isLoading && !hasReviewContent && !returnsInsights && !reviewError && !returnsError;

  if (showInitialLoader) {
    return (
      <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest }]}>
        <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.centerText}>
          {reviewStage ?? returnsStage ?? 'Loading insights…'}
        </ThemedText>
      </View>
    );
  }

  if (!isConnected) {
    return (
      <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest }]}>
        <ThemedText type="bodyLg" style={styles.centerText}>
          Connect your Daraz store
        </ThemedText>
        <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.centerText}>
          Review sentiment and return analytics for this product show up here once your Daraz store is connected.
        </ThemedText>
        <Pressable onPress={() => router.push('/connect-stores')} hitSlop={8}>
          <ThemedText type="bodyMd" themeColor="primary" style={styles.retryText}>
            Connect store
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest }]}>
        <ThemedText type="bodyMd" themeColor="danger" style={styles.centerText}>
          {error}
        </ThemedText>
        <Pressable onPress={refetch} hitSlop={8}>
          <ThemedText type="bodyMd" themeColor="primary" style={styles.retryText}>
            Try again
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  const ratingEntries = reviewAnalysis
    ? Object.entries(reviewAnalysis.rating_trend).sort(([a], [b]) => a.localeCompare(b))
    : [];
  const ratingPoints = ratingEntries.map(([, value]) => value);
  const ratingMonths = ratingEntries.map(([month]) => month);

  const sortedActions = reviewAnalysis
    ? [...reviewAnalysis.action_plan].sort(
        (a, b) => SEVERITY_WEIGHT[toSeverity(a.severity)] - SEVERITY_WEIGHT[toSeverity(b.severity)],
      )
    : [];

  const returnTrendPoints = returnsInsights?.monthly_trend.map((entry) => entry.returns_count) ?? [];
  const returnTrendMonths = returnsInsights?.monthly_trend.map((entry) => entry.month) ?? [];
  const sortedReturnReasons = returnsInsights
    ? [...returnsInsights.return_reason_breakdown].sort((a, b) => b.count - a.count)
    : [];

  return (
    <View style={styles.stack}>
      {reviewError && !reviewAnalysis && (
        <View style={[styles.errorCard, { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest }]}>
          <ThemedText type="bodyMd" themeColor="danger">
            {reviewError}
          </ThemedText>
          <Pressable onPress={refetch} hitSlop={8}>
            <ThemedText type="bodyMd" themeColor="primary" style={styles.retryText}>
              Try again
            </ThemedText>
          </Pressable>
        </View>
      )}

      {reviewAnalysis && (
        <>
          <FadeInBlock>
            <View style={[styles.sentimentCard, { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest }]}>
              <ThemedText type="labelMd" themeColor="textSecondary">
                SENTIMENT
              </ThemedText>
              <View style={styles.scoreRow}>
                <ThemedText type="displayLgMobile">{reviewAnalysis.sentiment_score}</ThemedText>
                <ThemedText type="bodyMd" themeColor="textSecondary">
                  / 100
                </ThemedText>
              </View>
              <SentimentMeter score={reviewAnalysis.sentiment_score} />

              {reviewAnalysis.summary ? (
                <FadeInBlock delay={80}>
                  <View style={[styles.summaryBlock, { borderTopColor: theme.border }]}>
                    <View style={[styles.summaryRule, { backgroundColor: theme.primary }]} />
                    <View style={styles.summaryTextGroup}>
                      <ThemedText type="labelMd" themeColor="primary">
                        AI SUMMARY
                      </ThemedText>
                      <ThemedText type="bodyMd" themeColor="textSecondary">
                        {reviewAnalysis.summary}
                      </ThemedText>
                    </View>
                  </View>
                </FadeInBlock>
              ) : isReviewStreaming ? (
                <StreamingStatus label={reviewStage ?? 'Synthesizing summary…'} />
              ) : null}
            </View>
          </FadeInBlock>

          {reviewAnalysis.topics.length > 0 && (
            <FadeInBlock delay={60}>
              <View style={styles.sectionGroup}>
                <ThemedText type="labelMd" themeColor="textSecondary">
                  RECURRING THEMES
                </ThemedText>
                <View style={styles.badgeRow}>
                  {reviewAnalysis.topics.map((topic, index) => (
                    <FadeInBlock key={topic} delay={index * 50}>
                      <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
                        <ThemedText type="bodySm" themeColor="textSecondary">
                          {topic}
                        </ThemedText>
                      </View>
                    </FadeInBlock>
                  ))}
                </View>
                {isReviewStreaming && reviewStage && (
                  <StreamingStatus label={reviewStage} />
                )}
              </View>
            </FadeInBlock>
          )}

          {ratingPoints.length > 1 && (
            <FadeInBlock delay={100}>
              <View style={styles.sectionGroup}>
                <View style={styles.trendHeaderRow}>
                  <ThemedText type="labelMd" themeColor="textSecondary">
                    RATING TREND
                  </ThemedText>
                  <ThemedText type="bodySm" themeColor="textSecondary">
                    {formatMonthLabel(ratingMonths[0])}–{formatMonthLabel(ratingMonths[ratingMonths.length - 1])}
                  </ThemedText>
                </View>
                <View
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={`Average rating by month, from ${formatMonthLabel(ratingMonths[0])} at ${ratingPoints[0].toFixed(1)} to ${formatMonthLabel(ratingMonths[ratingMonths.length - 1])} at ${ratingPoints[ratingPoints.length - 1].toFixed(1)} out of 5`}>
                  <Sparkline points={ratingPoints} tone="aiInsight" />
                </View>
              </View>
            </FadeInBlock>
          )}

          {sortedActions.length > 0 && (
            <FadeInBlock delay={120}>
              <View style={styles.sectionGroup}>
                <ThemedText type="labelMd" themeColor="textSecondary">
                  RECOMMENDED ACTIONS · {sortedActions.length}
                </ThemedText>
                {sortedActions.map((item, index) => (
                  <FadeInBlock key={`${item.issue}-${index}`} delay={index * 60}>
                    <View
                      style={[styles.actionCard, { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest }]}>
                      <View style={styles.actionTopRow}>
                        <SeverityBadge severity={toSeverity(item.severity)} />
                        <ThemedText type="bodySm" themeColor="textSecondary">
                          {item.affected_review_count} reviews
                        </ThemedText>
                      </View>
                      <ThemedText type="bodyMd">{item.issue}</ThemedText>
                      <ThemedText type="bodySm" themeColor="textSecondary">
                        {item.recommendation}
                      </ThemedText>
                    </View>
                  </FadeInBlock>
                ))}
              </View>
            </FadeInBlock>
          )}
        </>
      )}

      <FadeInBlock delay={140}>
      <View style={styles.sectionGroup}>
        <View style={styles.trendHeaderRow}>
          <ThemedText type="labelMd" themeColor="textSecondary">
            RETURNS
          </ThemedText>
          {returnsInsights && (
            <ThemedText type="bodySm" themeColor="textSecondary">
              {returnsInsights.date_range.start_date} – {returnsInsights.date_range.end_date}
            </ThemedText>
          )}
        </View>
        {isReturnsStreaming && !returnsInsights ? (
          <StreamingStatus label={returnsStage ?? 'Loading return data…'} />
        ) : returnsError ? (
          <View style={[styles.errorCard, { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest }]}>
            <ThemedText type="bodyMd" themeColor="danger">
              {returnsError}
            </ThemedText>
            <Pressable onPress={refetch} hitSlop={8}>
              <ThemedText type="bodyMd" themeColor="primary" style={styles.retryText}>
                Try again
              </ThemedText>
            </Pressable>
          </View>
        ) : !returnsInsights || returnsInsights.total_units_returned === 0 ? (
          <ThemedText type="bodyMd" themeColor="textSecondary">
            No returns reported for this product.
          </ThemedText>
        ) : (
          <>
            <ListSection>
              <ListRow label="Units sold" value={String(returnsInsights.total_units_sold)} showChevron={false} />
              <ListRow label="Units returned" value={String(returnsInsights.total_units_returned)} showChevron={false} />
              <ListRow label="Return rate" value={`${returnsInsights.overall_return_rate}%`} showChevron={false} />
              <ListRow label="Refunded" value={formatPrice(returnsInsights.total_refund_amount)} showChevron={false} />
              <ListRow label="Dispute rate" value={`${returnsInsights.dispute_rate}%`} showChevron={false} isLast />
            </ListSection>

            {returnTrendPoints.length > 1 && (
              <FadeInBlock delay={60}>
                <View
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={`Returns by month, from ${returnTrendMonths[0]} at ${returnTrendPoints[0]} to ${returnTrendMonths[returnTrendMonths.length - 1]} at ${returnTrendPoints[returnTrendPoints.length - 1]}`}>
                  <Sparkline points={returnTrendPoints} tone="aiInsight" />
                </View>
              </FadeInBlock>
            )}

            {sortedReturnReasons.length > 0 && (
              <FadeInBlock delay={80}>
                <View style={styles.sectionGroup}>
                  <ThemedText type="labelMd" themeColor="textSecondary">
                    TOP RETURN REASONS
                  </ThemedText>
                  {sortedReturnReasons.map((reason, index) => (
                    <FadeInBlock key={`${reason.reason}-${index}`} delay={index * 50}>
                      <View
                        style={[styles.actionCard, { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest }]}>
                        <View style={styles.actionTopRow}>
                          <ThemedText type="bodyMd">{reason.reason}</ThemedText>
                          <ThemedText type="bodySm" themeColor="textSecondary">
                            {reason.count} · {reason.percentage}%
                          </ThemedText>
                        </View>
                        <ThemedText type="bodySm" themeColor="textSecondary">
                          {reason.likely_cause}
                        </ThemedText>
                      </View>
                    </FadeInBlock>
                  ))}
                </View>
              </FadeInBlock>
            )}

            {returnsInsights.recommendations.length > 0 && (
              <FadeInBlock delay={100}>
                <View style={styles.sectionGroup}>
                  <ThemedText type="labelMd" themeColor="textSecondary">
                    RECOMMENDATIONS
                  </ThemedText>
                  {returnsInsights.recommendations.map((recommendation, index) => (
                    <FadeInBlock key={index} delay={index * 40}>
                      <ThemedText type="bodyMd" themeColor="textSecondary">
                        {recommendation}
                      </ThemedText>
                    </FadeInBlock>
                  ))}
                </View>
              </FadeInBlock>
            )}
          </>
        )}
      </View>
      </FadeInBlock>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.four,
  },
  card: {
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  sentimentCard: {
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.four,
  },
  errorCard: {
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  centerText: {
    textAlign: 'center',
  },
  retryText: {
    textDecorationLine: 'underline',
  },
  streamingText: {
    fontStyle: 'italic',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.one,
  },
  meterBlock: {
    gap: Spacing.one,
  },
  meterTrack: {
    height: 6,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  meterFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: Radius.full,
  },
  meterTick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
  },
  meterLabelRow: {
    flexDirection: 'row',
  },
  meterLabel: {
    flex: 1,
    textAlign: 'center',
  },
  meterLabelLeft: {
    textAlign: 'left',
  },
  meterLabelRight: {
    textAlign: 'right',
  },
  meterLabelActive: {
    fontWeight: '700',
  },
  summaryBlock: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
  },
  summaryRule: {
    width: 2,
    borderRadius: Radius.full,
    alignSelf: 'stretch',
  },
  summaryTextGroup: {
    flex: 1,
    gap: Spacing.half,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  sectionGroup: {
    gap: Spacing.two,
  },
  trendHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionCard: {
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  actionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
