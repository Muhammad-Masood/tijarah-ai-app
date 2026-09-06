import { useState } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AreaChart, ChartLegend } from '@/components/finance-charts';
import { Sparkline } from '@/components/mini-charts';
import {
  FinanceColors,
  FinanceErrorState,
  formatPKR,
} from '@/components/finance-kit';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useCashFlow } from '@/hooks/use-finance-cashflow';
import { useTheme } from '@/hooks/use-theme';

type Aggregation = 'daily' | 'weekly';

export default function FinanceCashFlowScreen() {
  const theme = useTheme();
  const [days] = useState<30 | 60 | 90>(30);
  const [aggregation, setAggregation] = useState<Aggregation>('daily');
  const { data, isLoading, error, refetch } = useCashFlow(days);

  if (error) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
          <FinanceErrorState error={error} onRetry={refetch} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  // Guard against `data` being undefined mid-fetch — original code called
  // .reduce() on it directly, which would throw before the first resolve.
  const safeData = data ?? [];

  // Aggregate data by week if needed
  const chartData = (() => {
    if (safeData.length === 0) return [];

    if (aggregation === 'weekly') {
      const weeks: { x: number; inflow: number; outflow: number }[] = [];
      let weekInflow = 0;
      let weekOutflow = 0;
      let weekNum = 1;

      safeData.forEach((entry, i) => {
        weekInflow += entry.inflow;
        weekOutflow += entry.outflow;
        if ((i + 1) % 7 === 0 || i === safeData.length - 1) {
          weeks.push({ x: weekNum, inflow: weekInflow, outflow: weekOutflow });
          weekInflow = 0;
          weekOutflow = 0;
          weekNum++;
        }
      });
      return weeks;
    }

    return safeData.map((entry) => ({
      x: new Date(entry.date).getDate(),
      inflow: entry.inflow,
      outflow: entry.outflow,
    }));
  })();

  const totalInflow = safeData.reduce((sum, e) => sum + e.inflow, 0);
  const totalOutflow = safeData.reduce((sum, e) => sum + e.outflow, 0);
  const netCash = totalInflow - totalOutflow;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerRow}>
            <ThemedText type="headlineSm">Cash Flow</ThemedText>
            <SegmentedTabs
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
              ]}
              value={aggregation}
              onChange={(v) => setAggregation(v as Aggregation)}
            />
          </View>

          {/* Net position is the primary answer this screen provides. */}
          <ThemedView type="surfaceContainer" style={styles.heroCard}>
            <View style={styles.heroCopy}>
              <ThemedText type="bodySm" themeColor="textSecondary">Net position</ThemedText>
              <ThemedText type="displayLgMobile" numberOfLines={1}>
                {formatPKR(netCash)}
              </ThemedText>
              <View style={[styles.positionBadge, { backgroundColor: (netCash >= 0 ? FinanceColors.profit : FinanceColors.fees) + '18' }]}>
                <MaterialCommunityIcons
                  name={netCash >= 0 ? 'arrow-up-right' : 'arrow-down-right'}
                  size={14}
                  color={netCash >= 0 ? FinanceColors.profit : FinanceColors.fees}
                />
                <ThemedText type="labelMd" style={{ color: netCash >= 0 ? FinanceColors.profit : FinanceColors.fees }}>
                  {netCash >= 0 ? 'Positive cash position' : 'Negative cash position'}
                </ThemedText>
              </View>
            </View>
            {safeData.length > 0 && (
              <Sparkline points={safeData.slice(-7).map((entry) => entry.net)} tone="success" height={44} />
            )}
          </ThemedView>

          {/* Supporting KPIs */}
          <View style={styles.kpiGrid}>
            <ThemedView type="surfaceContainer" style={styles.metricCard}>
              <View style={styles.metricLabel}>
                <MaterialCommunityIcons name="arrow-down-left" size={16} color={FinanceColors.revenue} />
                <ThemedText type="bodySm" themeColor="textSecondary">Inflow</ThemedText>
              </View>
              <ThemedText type="headlineSm" numberOfLines={1}>{formatPKR(totalInflow)}</ThemedText>
            </ThemedView>
            <ThemedView type="surfaceContainer" style={styles.metricCard}>
              <View style={styles.metricLabel}>
                <MaterialCommunityIcons name="arrow-up-right" size={16} color={FinanceColors.fees} />
                <ThemedText type="bodySm" themeColor="textSecondary">Outflow</ThemedText>
              </View>
              <ThemedText type="headlineSm" numberOfLines={1}>{formatPKR(totalOutflow)}</ThemedText>
            </ThemedView>
          </View>

          {/* Chart */}
          <View style={styles.section}>
            <ThemedText type="labelMd" themeColor="textSecondary" style={styles.sectionLabel}>
              TREND
            </ThemedText>
            <ThemedView type="surfaceContainerLowest" style={styles.chartCard}>
              {isLoading ? (
                <View style={styles.chartPlaceholder}>
                  <ActivityIndicator color={FinanceColors.revenue} />
                  <ThemedText type="bodySm" themeColor="textSecondary" style={styles.placeholderText}>
                    Loading cash flow…
                  </ThemedText>
                </View>
              ) : chartData.length > 0 ? (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScrollContent}>
                    <AreaChart data={chartData} height={180} />
                  </ScrollView>
                  <ChartLegend
                    items={[
                      { label: 'Inflow', color: FinanceColors.revenue },
                      { label: 'Outflow', color: FinanceColors.fees },
                    ]}
                  />
                </>
              ) : (
                <View style={styles.chartPlaceholder}>
                  <ThemedText type="bodySm" themeColor="textSecondary" style={styles.placeholderText}>
                    No cash flow data for this period
                  </ThemedText>
                </View>
              )}
            </ThemedView>
          </View>

          {/* Recent activity */}
          {!isLoading && safeData.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="labelMd" themeColor="textSecondary" style={styles.sectionLabel}>
                RECENT ACTIVITY
              </ThemedText>
              <ThemedView type="surfaceContainer" style={styles.table}>
                {safeData.slice(-15).reverse().map((entry) => (
                  <View key={entry.date} style={[styles.activityRow, { borderBottomColor: theme.border }]}>
                    <View style={styles.activityCopy}>
                      <ThemedText type="bodyMd" style={styles.activityDate}>
                        {new Date(entry.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                      </ThemedText>
                      <ThemedText type="bodySm" themeColor="textSecondary" numberOfLines={1}>
                        In {formatPKR(entry.inflow)}  ·  Out {formatPKR(entry.outflow)}
                      </ThemedText>
                    </View>
                    <ThemedText type="bodyMd" style={[styles.activityNet, { color: entry.net >= 0 ? FinanceColors.profit : FinanceColors.fees }]}>
                      {entry.net >= 0 ? '+' : ''}{formatPKR(entry.net)}
                    </ThemedText>
                  </View>
                ))}
              </ThemedView>
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
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  heroCard: {
    minHeight: 144,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  heroCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  positionBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.full,
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    padding: Spacing.three,
    borderRadius: Radius.md,
    gap: Spacing.two,
  },
  metricLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  section: {
    gap: Spacing.two,
  },
  sectionLabel: {
    letterSpacing: 0.5,
  },
  chartCard: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  chartScrollContent: {
    minWidth: '100%',
    justifyContent: 'center',
  },
  chartPlaceholder: {
    height: 220,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  placeholderText: {
    textAlign: 'center',
  },
  table: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  activityCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  activityDate: {
    fontWeight: '600',
  },
  activityNet: {
    fontWeight: '600',
    textAlign: 'right',
  },
});