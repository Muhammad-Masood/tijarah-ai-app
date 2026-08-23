import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { SeverityBadge } from '@/components/dashboard-kit';
import { formatPrice } from '@/components/product-kit';
import { ListRow, ListSection } from '@/components/list-kit';
import { resolveToneColor, Sparkline } from '@/components/mini-charts';
import { ThemedText } from '@/components/themed-text';
import type { Severity, Tone } from '@/constants/dashboard-mock';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useProductInsights } from '@/hooks/use-product-insights';
import type { Product } from '@/lib/api';

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

/** Flat instrument-style gauge: a tri-zone track with calibration ticks at the zone boundaries, and the active zone called out below. No dial or gradient — matches the system's tonal, shadow-free surface language. */
function SentimentMeter({ score }: { score: number }) {
  const theme = useTheme();
  const zone = sentimentZone(score);
  const fillColor = resolveToneColor(theme, zone.tone);
  const fillWidth = `${Math.min(100, Math.max(0, score))}%` as const;

  return (
    <View style={styles.meterBlock}>
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

/** AI review analysis + return analytics for a Daraz-sourced product — `useProductInsights` owns the fetching. */
export function ProductInsightsPanel({ product }: { product: Product }) {
  const theme = useTheme();
  const { reviewAnalysis, returns, isConnected, isLoading, error, refetch } = useProductInsights(product);

  if (isLoading) {
    return (
      <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest }]}>
        <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.centerText}>
          Loading insights…
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

  const returnLines = returns.flatMap((order) => order.reverseOrderLineDTOList);
  const returnsTotal = returnLines.reduce((sum, line) => sum + (line.refund_amount || 0), 0);

  return (
    <View style={styles.stack}>
      {reviewAnalysis && (
        <>
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

            {reviewAnalysis.summary && (
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
            )}
          </View>

          {reviewAnalysis.topics.length > 0 && (
            <View style={styles.sectionGroup}>
              <ThemedText type="labelMd" themeColor="textSecondary">
                RECURRING THEMES
              </ThemedText>
              <View style={styles.badgeRow}>
                {reviewAnalysis.topics.map((topic) => (
                  <View key={topic} style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
                    <ThemedText type="bodySm" themeColor="textSecondary">
                      {topic}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {ratingPoints.length > 1 && (
            <View style={styles.sectionGroup}>
              <View style={styles.trendHeaderRow}>
                <ThemedText type="labelMd" themeColor="textSecondary">
                  RATING TREND
                </ThemedText>
                <ThemedText type="bodySm" themeColor="textSecondary">
                  {formatMonthLabel(ratingMonths[0])}–{formatMonthLabel(ratingMonths[ratingMonths.length - 1])}
                </ThemedText>
              </View>
              <Sparkline points={ratingPoints} tone="aiInsight" />
            </View>
          )}

          {sortedActions.length > 0 && (
            <View style={styles.sectionGroup}>
              <ThemedText type="labelMd" themeColor="textSecondary">
                RECOMMENDED ACTIONS · {sortedActions.length}
              </ThemedText>
              {sortedActions.map((item, index) => (
                <View
                  key={`${item.issue}-${index}`}
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
              ))}
            </View>
          )}
        </>
      )}

      <View style={styles.sectionGroup}>
        <ThemedText type="labelMd" themeColor="textSecondary">
          RETURNS
        </ThemedText>
        {returnLines.length === 0 ? (
          <ThemedText type="bodyMd" themeColor="textSecondary">
            No returns reported for this product.
          </ThemedText>
        ) : (
          <>
            <ThemedText type="bodySm" themeColor="textSecondary">
              {returnLines.length} {returnLines.length === 1 ? 'return' : 'returns'} · {formatPrice(returnsTotal)} refunded
            </ThemedText>
            <ListSection>
              {returnLines.map((line, index) => (
                <ListRow
                  key={line.reverse_order_line_id}
                  label={line.reason_text || line.reverse_status}
                  value={formatPrice(line.refund_amount)}
                  showChevron={false}
                  isLast={index === returnLines.length - 1}
                />
              ))}
            </ListSection>
          </>
        )}
      </View>
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
  centerText: {
    textAlign: 'center',
  },
  retryText: {
    textDecorationLine: 'underline',
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
