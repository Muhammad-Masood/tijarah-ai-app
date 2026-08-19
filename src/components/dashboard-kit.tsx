/**
 * Presentational building blocks for the Home executive dashboard.
 *
 * Semantic color mapping (design doc calls for Success / Warning / Danger /
 * AI Insight / Neutral tokens; `theme.ts` doesn't name them 1:1, so this is
 * the single place that maps them onto existing theme colors — no new
 * colors are introduced):
 *   success   -> theme.success   (profitable / healthy)
 *   warning   -> theme.tertiary  (amber accent, reserved for highlight/warning use)
 *   danger    -> theme.danger    (loss-making / urgent)
 *   aiInsight -> theme.primary   (brand teal — already used for every
 *                                 primary/agent-driven action in this app)
 *   neutral   -> theme.textSecondary
 */
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DistributionBar, resolveToneColor, Sparkline, useToneColor } from '@/components/mini-charts';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Agents,
  type AgentId,
  type FeatureGraphData,
  type InsightAction,
  type InsightCardData,
  type InventoryRisk,
  type MetricCardData,
  type Severity,
  type SentimentSummary,
  type Tone,
} from '@/constants/dashboard-mock';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const severityTone: Record<Severity, Tone> = { high: 'danger', medium: 'warning', low: 'neutral' };
const severityLabel: Record<Severity, string> = { high: 'High', medium: 'Medium', low: 'Low' };

export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeadingRow}>
      <ThemedText type="headlineSm">{title}</ThemedText>
      {action}
    </View>
  );
}

export function AgentBadge({ agentId }: { agentId: AgentId }) {
  const theme = useTheme();
  return (
    <View style={[styles.agentBadge, { backgroundColor: theme.primaryContainer }]}>
      <View style={[styles.agentDot, { backgroundColor: theme.primary }]} />
      <ThemedText type="labelMd" themeColor="primary">
        {Agents[agentId].name.toUpperCase()}
      </ThemedText>
    </View>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const color = useToneColor(severityTone[severity]);
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <ThemedText type="labelMd" style={{ color }}>
        {severityLabel[severity]}
      </ThemedText>
    </View>
  );
}

/** Small outlined "Est." tag — the trust requirement distinguishing estimated vs. confirmed values. */
export function EstimatedTag() {
  const theme = useTheme();
  return (
    <View style={[styles.estimatedTag, { borderColor: theme.border }]}>
      <ThemedText type="bodySm" themeColor="textSecondary">
        Est.
      </ThemedText>
    </View>
  );
}

export function BusinessHealthCard({ status, supportingLine }: { status: string; supportingLine: string }) {
  const theme = useTheme();
  const healthy = status === 'Healthy';
  const color = healthy ? theme.success : theme.tertiary;

  return (
    <View style={[styles.healthCard, { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest }]}>
      <View style={[styles.healthDot, { backgroundColor: color }]} />
      <View style={styles.healthTextGroup}>
        <ThemedText type="bodyMd" style={[styles.healthStatus, { color }]}>
          {status}
        </ThemedText>
        <ThemedText type="bodySm" themeColor="textSecondary">
          {supportingLine}
        </ThemedText>
      </View>
    </View>
  );
}

export function MetricCard({ data, size = 'sm' }: { data: MetricCardData; size?: 'lg' | 'sm' }) {
  const theme = useTheme();
  const compareColor =
    data.tone === 'positive' ? theme.success : data.tone === 'negative' ? theme.danger : theme.textSecondary;

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.metricCard, size === 'lg' && styles.metricCardLarge]}>
      <View style={styles.metricLabelRow}>
        <ThemedText type="labelMd" themeColor="textSecondary">
          {data.label.toUpperCase()}
        </ThemedText>
        {data.estimated && <EstimatedTag />}
      </View>
      <ThemedText type={size === 'lg' ? 'displayLgMobile' : 'headlineSm'}>{data.value}</ThemedText>
      <ThemedText type="bodySm" style={{ color: compareColor }}>
        {data.comparisonLabel}
      </ThemedText>
    </ThemedView>
  );
}

export function ImpactStrip({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.impactStrip, { backgroundColor: theme.tertiaryContainer }]}>
      <ThemedText type="bodySm" style={{ color: theme.onTertiaryContainer }}>
        {label}
      </ThemedText>
    </View>
  );
}

function ActionButton({
  label,
  emphasis,
  onPress,
}: {
  label: string;
  emphasis: InsightAction['emphasis'];
  onPress: () => void;
}) {
  const theme = useTheme();

  if (emphasis === 'text') {
    return (
      <Pressable onPress={onPress} hitSlop={8} style={styles.textAction}>
        <ThemedText type="bodySm" themeColor="textSecondary">
          {label}
        </ThemedText>
      </Pressable>
    );
  }

  const isPrimary = emphasis === 'primary';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        isPrimary
          ? { backgroundColor: theme.primary }
          : { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="bodySm" themeColor={isPrimary ? 'onPrimary' : 'text'} style={styles.actionLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/**
 * The single large, most-prominent insight card (spec item 3). `onAction`
 * covers every action except Dismiss, which is handled locally via
 * `onDismiss` since it only affects this card's own visibility.
 */
export function PrimaryInsightCard({
  data,
  actions,
  whyThis,
  onAction,
  onDismiss,
}: {
  data: InsightCardData;
  actions: InsightAction[];
  whyThis: string;
  onAction: (label: string) => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const [whyThisOpen, setWhyThisOpen] = useState(false);

  return (
    <View style={[styles.primaryCard, { borderColor: theme.primary, backgroundColor: theme.surfaceContainerLowest }]}>
      <View style={styles.primaryCardTopRow}>
        <AgentBadge agentId={data.agentId} />
        <SeverityBadge severity={data.severity} />
      </View>

      <ThemedText type="headlineMd" style={styles.primaryCardTitle}>
        {data.title}
      </ThemedText>

      <View style={styles.impactRow}>
        <ThemedText type="bodyLg" themeColor="danger">
          {data.impactLabel}
        </ThemedText>
        {data.impactEstimated && <EstimatedTag />}
      </View>

      <ThemedText type="bodyMd" themeColor="textSecondary">
        {data.cause}
      </ThemedText>

      <View style={styles.actionRow}>
        {actions.map((action) => (
          <ActionButton
            key={action.label}
            label={action.label}
            emphasis={action.emphasis}
            onPress={() => (action.label === 'Dismiss' ? onDismiss() : onAction(action.label))}
          />
        ))}
      </View>

      <Pressable onPress={() => setWhyThisOpen((open) => !open)} hitSlop={8}>
        <ThemedText type="bodySm" themeColor="primary" style={styles.whyThisLink}>
          {whyThisOpen ? 'Hide explanation' : 'Why this?'}
        </ThemedText>
      </Pressable>
      {whyThisOpen && (
        <ThemedText type="bodySm" themeColor="textSecondary">
          {whyThis}
        </ThemedText>
      )}
    </View>
  );
}

/** Compact variant used in the "All Insights" feed — one primary action instead of a full action row. */
export function CompactInsightCard({ data, onAction }: { data: InsightCardData; onAction: (label: string) => void }) {
  const theme = useTheme();

  return (
    <View style={[styles.compactCard, { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest }]}>
      <View style={styles.compactCardTopRow}>
        <AgentBadge agentId={data.agentId} />
        <SeverityBadge severity={data.severity} />
      </View>
      <ThemedText type="bodyLg" style={styles.compactCardTitle}>
        {data.title}
      </ThemedText>
      <View style={styles.impactRow}>
        <ThemedText type="bodySm" themeColor="textSecondary">
          {data.impactLabel}
        </ThemedText>
        {data.impactEstimated && <EstimatedTag />}
      </View>
      <Pressable
        onPress={() => onAction(data.primaryActionLabel)}
        style={({ pressed }) => [styles.compactAction, { borderColor: theme.border }, pressed && styles.pressed]}>
        <ThemedText type="bodySm" style={styles.actionLabel}>
          {data.primaryActionLabel}
        </ThemedText>
      </Pressable>
    </View>
  );
}

export function InventoryRiskList({
  risks,
  totalCount,
  onViewAll,
}: {
  risks: InventoryRisk[];
  totalCount: number;
  onViewAll: () => void;
}) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.listCard}>
      {risks.map((risk, index) => (
        <View key={risk.id} style={[styles.riskRow, index > 0 && { borderTopColor: theme.border, borderTopWidth: 1 }]}>
          <View style={[styles.pillDot, { backgroundColor: resolveToneColor(theme, severityTone[risk.severity]) }]} />
          <View style={styles.riskTextGroup}>
            <ThemedText type="bodyMd">{risk.productName}</ThemedText>
            <ThemedText type="bodySm" themeColor="textSecondary">
              {risk.detail}
            </ThemedText>
          </View>
        </View>
      ))}
      {totalCount > risks.length && (
        <Pressable onPress={onViewAll} hitSlop={8} style={styles.viewAllRow}>
          <ThemedText type="bodySm" themeColor="primary">
            View all {totalCount} risks
          </ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

export function SentimentCard({ data }: { data: SentimentSummary }) {
  const theme = useTheme();
  const arrow = data.trend === 'up' ? '↑' : data.trend === 'down' ? '↓' : '→';
  const trendColor = data.trend === 'up' ? theme.success : data.trend === 'down' ? theme.danger : theme.textSecondary;

  return (
    <ThemedView type="backgroundElement" style={styles.sentimentCard}>
      <View style={styles.sentimentTopRow}>
        <ThemedText type="bodyLg" style={[styles.sentimentArrow, { color: trendColor }]}>
          {arrow}
        </ThemedText>
        <ThemedText type="bodyLg" style={styles.sentimentRating}>
          {data.ratingLabel}
        </ThemedText>
      </View>
      <ThemedText type="bodySm" themeColor="textSecondary">
        {data.flaggedTheme}
      </ThemedText>
    </ThemedView>
  );
}

export function AgentActivityList({
  items,
}: {
  items: { id: string; agentId: AgentId; result: string; timeAgo: string }[];
}) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={styles.listCard}>
      {items.map((item, index) => (
        <View
          key={item.id}
          style={[styles.activityRow, index > 0 && { borderTopColor: theme.border, borderTopWidth: 1 }]}>
          <AgentBadge agentId={item.agentId} />
          <View style={styles.activityTextGroup}>
            <ThemedText type="bodyMd">{item.result}</ThemedText>
            <ThemedText type="bodySm" themeColor="textSecondary">
              {item.timeAgo}
            </ThemedText>
          </View>
        </View>
      ))}
    </ThemedView>
  );
}

export function FeatureGraphCard({ data, onPress }: { data: FeatureGraphData; onPress?: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.graphCard,
        { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest },
        pressed && styles.pressed,
      ]}>
      <View style={styles.graphTopRow}>
        <ThemedText type="bodyMd" style={styles.graphTitle}>
          {data.title}
        </ThemedText>
        <View style={[styles.agentDotSmall, { backgroundColor: theme.primary }]} />
      </View>
      {data.chart === 'sparkline' && data.points ? (
        <Sparkline points={data.points} tone={data.tone} />
      ) : data.segments ? (
        <DistributionBar segments={data.segments} />
      ) : null}
      <ThemedText type="bodySm" themeColor="textSecondary">
        {data.caption}
      </ThemedText>
    </Pressable>
  );
}

/** Navigates to the Insights tab — used by every "View all" link on Home per the spec. */
export function goToInsights() {
  router.push('/insights');
}

const styles = StyleSheet.create({
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  agentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  agentDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  estimatedTag: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.one,
  },
  healthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  healthDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  healthTextGroup: {
    flex: 1,
    gap: Spacing.half,
  },
  healthStatus: {
    fontWeight: '700',
  },
  metricCard: {
    flex: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  metricCardLarge: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  impactStrip: {
    borderRadius: Radius.DEFAULT,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  primaryCard: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  primaryCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryCardTitle: {
    marginTop: Spacing.one,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexWrap: 'wrap',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actionButton: {
    borderRadius: Radius.DEFAULT,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  actionLabel: {
    fontWeight: '600',
  },
  textAction: {
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
  whyThisLink: {
    marginTop: Spacing.one,
    textDecorationLine: 'underline',
  },
  compactCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  compactCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactCardTitle: {
    fontWeight: '600',
  },
  compactAction: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.DEFAULT,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  listCard: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  riskTextGroup: {
    flex: 1,
    gap: Spacing.half,
  },
  viewAllRow: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  sentimentCard: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  sentimentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sentimentArrow: {
    fontWeight: '700',
  },
  sentimentRating: {
    fontWeight: '600',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  activityTextGroup: {
    flex: 1,
    gap: Spacing.half,
  },
  graphCard: {
    flexBasis: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  graphTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  graphTitle: {
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
});
