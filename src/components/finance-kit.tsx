/**
 * Shared presentational building blocks for the Daraz Finance module.
 *
 * Semantic color mapping (module-specific, not design-system tokens):
 *   revenue/positive/inflow  -> FinanceColors.revenue  (#10B981 green)
 *   fees/negative/outflow    -> FinanceColors.fees     (#EF4444 red)
 *   profit/success           -> FinanceColors.profit   (#059669 emerald)
 *   warning/upcoming         -> FinanceColors.warning  (#F59E0B amber)
 *   neutral/pending          -> FinanceColors.neutral  (#64748B slate)
 *   primary action           -> FinanceColors.primary  (#3B82F6 blue)
 */
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { type ReactNode, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ---------------------------------------------------------------------------
// Finance-specific semantic colors (not in theme.ts — module-scoped)
// ---------------------------------------------------------------------------

export const FinanceColors = {
  revenue: '#10B981',
  fees: '#EF4444',
  profit: '#059669',
  warning: '#F59E0B',
  neutral: '#64748B',
  primary: '#3B82F6',
} as const;

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatPKR(value: number): string {
  return `PKR ${value.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

export function FinanceKPICard({
  title,
  value,
  subtitle,
  icon,
  tone = 'neutral',
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  tone?: 'revenue' | 'fees' | 'profit' | 'warning' | 'neutral' | 'primary';
}) {
  const color = FinanceColors[tone];

  return (
    <ThemedView type="surfaceContainerLowest" style={kpiStyles.card}>
      <View style={kpiStyles.header}>
        {icon && (
          <View style={[kpiStyles.iconWrap, { backgroundColor: color + '18' }]}>
            <MaterialCommunityIcons name={icon} size={18} color={color} />
          </View>
        )}
        <ThemedText type="bodySm" themeColor="textSecondary" numberOfLines={1}>
          {title}
        </ThemedText>
      </View>
      <ThemedText type="headlineSm" style={{ color, marginTop: Spacing.two }} numberOfLines={1}>
        {value}
      </ThemedText>
      {subtitle && (
        <ThemedText type="bodySm" themeColor="textSecondary" style={kpiStyles.subtitle}>
          {subtitle}
        </ThemedText>
      )}
    </ThemedView>
  );
}

const kpiStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    marginTop: Spacing.one,
  },
});

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

type FinanceStatus = 'paid' | 'upcoming' | 'reconciled' | 'discrepancy' | 'returned' | 'pending';

const statusConfig: Record<FinanceStatus, { label: string; color: string }> = {
  paid: { label: 'Paid', color: FinanceColors.revenue },
  upcoming: { label: 'Upcoming', color: FinanceColors.warning },
  reconciled: { label: 'Reconciled', color: FinanceColors.revenue },
  discrepancy: { label: 'Discrepancy', color: FinanceColors.fees },
  returned: { label: 'Returned', color: FinanceColors.neutral },
  pending: { label: 'Pending', color: FinanceColors.warning },
};

export function FinanceStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase() as FinanceStatus;
  const config = statusConfig[normalized] ?? { label: status, color: FinanceColors.neutral };

  return (
    <View style={[badgeStyles.pill, { borderColor: config.color + '60', backgroundColor: config.color + '14' }]}>
      <View style={[badgeStyles.dot, { backgroundColor: config.color }]} />
      <ThemedText type="labelMd" style={{ color: config.color }}>
        {config.label}
      </ThemedText>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
  },
});

// ---------------------------------------------------------------------------
// Date Range Selector (uses existing SegmentedTabs pattern)
// ---------------------------------------------------------------------------

export type DateRangePreset = 7 | 15 | 30 | 60 | 90;

const dateRangeOptions: { value: DateRangePreset; label: string }[] = [
  { value: 7, label: '7D' },
  { value: 15, label: '15D' },
  { value: 30, label: '30D' },
  { value: 60, label: '60D' },
  { value: 90, label: '90D' },
];

export function DateRangeSelector({
  value,
  onChange,
}: {
  value: DateRangePreset;
  onChange: (days: DateRangePreset) => void;
}) {
  const theme = useTheme();

  return (
    <View style={[dateRangeStyles.track, { backgroundColor: theme.backgroundElement }]}>
      {dateRangeOptions.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[dateRangeStyles.tab, isActive && { backgroundColor: theme.surfaceContainerLowest }]}>
            <ThemedText
              type="labelMd"
              themeColor={isActive ? 'text' : 'textSecondary'}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const dateRangeStyles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: Radius.DEFAULT,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
  },
});

// ---------------------------------------------------------------------------
// Fee Gauge Bar (effective_fee_rate with color zones)
// ---------------------------------------------------------------------------

export function FeeGaugeBar({ rate }: { rate: number }) {
  const theme = useTheme();
  const clampedRate = Math.min(Math.max(rate, 0), 50);
  const progress = clampedRate / 50;

  const color = rate < 15 ? FinanceColors.revenue : rate < 25 ? FinanceColors.warning : FinanceColors.fees;
  const label = rate < 15 ? 'Healthy' : rate < 25 ? 'Moderate' : 'High';

  return (
    <View style={gaugeStyles.container}>
      <View style={gaugeStyles.row}>
        <ThemedText type="bodySm" themeColor="textSecondary">Effective Fee Rate</ThemedText>
        <View style={gaugeStyles.badgeRow}>
          <ThemedText type="labelMd" style={{ color }}>{formatPercent(rate)}</ThemedText>
          <View style={[gaugeStyles.labelBadge, { backgroundColor: color + '18' }]}>
            <ThemedText type="labelMd" style={{ color }}>{label}</ThemedText>
          </View>
        </View>
      </View>
      <View style={[gaugeStyles.track, { backgroundColor: theme.backgroundElement }]}>
        <View style={[gaugeStyles.fill, { width: `${progress * 100}%` as unknown as number, backgroundColor: color }]} />
        {/* Zone markers */}
        <View style={[gaugeStyles.marker, { left: '30%' }]} />
        <View style={[gaugeStyles.marker, { left: '50%' }]} />
      </View>
      <View style={gaugeStyles.legendRow}>
        <ThemedText type="bodySm" style={{ color: FinanceColors.revenue }}>0%</ThemedText>
        <ThemedText type="bodySm" style={{ color: FinanceColors.warning }}>15%</ThemedText>
        <ThemedText type="bodySm" style={{ color: FinanceColors.fees }}>25%+</ThemedText>
      </View>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  labelBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  track: {
    height: 10,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  marker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

// ---------------------------------------------------------------------------
// Profit Margin Ring (circular progress indicator)
// ---------------------------------------------------------------------------

export function ProfitMarginRing({ margin }: { margin: number }) {
  const theme = useTheme();
  const color = margin > 20 ? FinanceColors.revenue : margin > 10 ? FinanceColors.warning : FinanceColors.fees;
  const clampedMargin = Math.min(Math.max(margin, 0), 100);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(clampedMargin / 100, { duration: 800 });
  }, [clampedMargin, progress]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 360}deg` }],
  }));

  return (
    <View style={ringStyles.container}>
      <View style={[ringStyles.ring, { borderColor: theme.backgroundElement, borderWidth: 6 }]}>
        <Animated.View style={[ringStyles.ringFill, { borderColor: color, borderWidth: 6 }, ringStyle]} />
        <View style={ringStyles.centerText}>
          <ThemedText type="headlineSm" style={{ color, textAlign: 'center' }}>
            {formatPercent(margin)}
          </ThemedText>
        </View>
      </View>
      <ThemedText type="bodySm" themeColor="textSecondary" style={ringStyles.label}>
        Profit Margin
      </ThemedText>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  ring: {
    width: 80,
    height: 80,
    borderRadius: 40,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringFill: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 46,
  },
  centerText: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    textAlign: 'center',
  },
});

// ---------------------------------------------------------------------------
// Skeleton loaders
// ---------------------------------------------------------------------------

export function FinanceKPISkeleton() {
  return (
    <ThemedView type="surfaceContainerLowest" style={skeletonStyles.card}>
      <Skeleton width="60%" height={12} />
      <Skeleton width="80%" height={24} style={skeletonStyles.value} />
      <Skeleton width="40%" height={10} />
    </ThemedView>
  );
}

export function FinanceChartSkeleton({ height = 200 }: { height?: number }) {
  return <Skeleton width="100%" height={height} radius={Radius.md} />;
}

export function FinanceTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <View style={skeletonStyles.table}>
      <Skeleton width="100%" height={36} radius={0} />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} width="100%" height={44} radius={0} style={skeletonStyles.tableRow} />
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.two,
  },
  value: {
    marginTop: Spacing.two,
  },
  table: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  tableRow: {
    marginTop: 1,
  },
});

// ---------------------------------------------------------------------------
// Error state with retry
// ---------------------------------------------------------------------------

export function FinanceErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  const theme = useTheme();

  return (
    <ThemedView type="surfaceContainerLowest" style={errorStyles.container}>
      <View style={[errorStyles.iconWrap, { backgroundColor: FinanceColors.fees + '18' }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={32} color={FinanceColors.fees} />
      </View>
      <ThemedText type="headlineSm" style={errorStyles.title}>Something went wrong</ThemedText>
      <ThemedText type="bodyMd" themeColor="textSecondary" style={errorStyles.message}>
        {error}
      </ThemedText>
      <Pressable
        onPress={onRetry}
        style={[errorStyles.button, { backgroundColor: theme.primary }]}>
        <ThemedText type="labelMd" style={{ color: theme.onPrimary }}>
          Try Again
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const errorStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: Spacing.five,
    borderRadius: Radius.md,
    gap: Spacing.three,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.DEFAULT,
    marginTop: Spacing.two,
  },
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

export function FinanceEmptyState({ message }: { message: string }) {
  return (
    <ThemedView type="surfaceContainerLowest" style={emptyStyles.container}>
      <MaterialCommunityIcons name="chart-box-outline" size={40} color={FinanceColors.neutral} />
      <ThemedText type="bodyMd" themeColor="textSecondary" style={emptyStyles.text}>
        {message}
      </ThemedText>
    </ThemedView>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: Spacing.five,
    borderRadius: Radius.md,
    gap: Spacing.three,
  },
  text: {
    textAlign: 'center',
  },
});

// ---------------------------------------------------------------------------
// Section container
// ---------------------------------------------------------------------------

export function FinanceSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={sectionStyles.container}>
      <View style={sectionStyles.header}>
        <ThemedText type="headlineSm">{title}</ThemedText>
        {action}
      </View>
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

// ---------------------------------------------------------------------------
// Comparison card (for fee breakdown "You earned X, Daraz took Y")
// ---------------------------------------------------------------------------

export function FinanceComparisonCard({
  earned,
  platformTook,
  percentage,
}: {
  earned: number;
  platformTook: number;
  percentage: number;
}) {
  return (
    <ThemedView type="surfaceContainerLowest" style={comparisonStyles.card}>
      <View style={comparisonStyles.row}>
        <View style={comparisonStyles.side}>
          <ThemedText type="bodySm" themeColor="textSecondary">You earned</ThemedText>
          <ThemedText type="headlineSm" style={{ color: FinanceColors.revenue }}>
            {formatPKR(earned)}
          </ThemedText>
        </View>
        <View style={comparisonStyles.divider} />
        <View style={[comparisonStyles.side, comparisonStyles.rightSide]}>
          <ThemedText type="bodySm" themeColor="textSecondary">Daraz took</ThemedText>
          <ThemedText type="headlineSm" style={{ color: FinanceColors.fees }}>
            {formatPKR(platformTook)}
          </ThemedText>
          <ThemedText type="bodySm" style={{ color: FinanceColors.fees }}>
            ({formatPercent(percentage)})
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const comparisonStyles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    flex: 1,
    gap: Spacing.one,
  },
  rightSide: {
    alignItems: 'flex-end',
  },
  divider: {
    width: 1,
    height: 48,
    marginHorizontal: Spacing.three,
  },
});
