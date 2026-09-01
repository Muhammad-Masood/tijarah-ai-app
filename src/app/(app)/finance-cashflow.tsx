import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AreaChart, ChartLegend } from '@/components/finance-charts';
import {
  FinanceColors,
  FinanceErrorState,
  FinanceKPICard,
  formatPKR,
} from '@/components/finance-kit';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useCashFlow } from '@/hooks/use-finance-cashflow';

type Aggregation = 'daily' | 'weekly';

export default function FinanceCashFlowScreen() {
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

  // Aggregate data by week if needed
  const chartData = (() => {
    if (!data || data.length === 0) return [];

    if (aggregation === 'weekly') {
      const weeks: { x: number; inflow: number; outflow: number }[] = [];
      let weekInflow = 0;
      let weekOutflow = 0;
      let weekNum = 1;

      data.forEach((entry, i) => {
        weekInflow += entry.inflow;
        weekOutflow += entry.outflow;
        if ((i + 1) % 7 === 0 || i === data.length - 1) {
          weeks.push({ x: weekNum, inflow: weekInflow, outflow: weekOutflow });
          weekInflow = 0;
          weekOutflow = 0;
          weekNum++;
        }
      });
      return weeks;
    }

    return data.map((entry) => ({
      x: new Date(entry.date).getDate(),
      inflow: entry.inflow,
      outflow: entry.outflow,
    }));
  })();

  const totalInflow = data.reduce((sum, e) => sum + e.inflow, 0);
  const totalOutflow = data.reduce((sum, e) => sum + e.outflow, 0);
  const netCash = totalInflow - totalOutflow;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerRow}>
            <ThemedText type="headlineMd">Cash Flow</ThemedText>
            <SegmentedTabs
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
              ]}
              value={aggregation}
              onChange={(v) => setAggregation(v as Aggregation)}
            />
          </View>

          {/* Summary KPIs */}
          <View style={styles.kpiGrid}>
            <FinanceKPICard title="Total Inflow" value={formatPKR(totalInflow)} icon="arrow-down-bold" tone="revenue" />
            <FinanceKPICard title="Total Outflow" value={formatPKR(totalOutflow)} icon="arrow-up-bold" tone="fees" />
            <FinanceKPICard
              title="Net Cash Position"
              value={formatPKR(netCash)}
              icon={netCash >= 0 ? 'trending-up' : 'trending-down'}
              tone={netCash >= 0 ? 'profit' : 'fees'}
            />
          </View>

          {/* Area Chart */}
          <ThemedView type="surfaceContainerLowest" style={styles.chartCard}>
            {isLoading ? (
              <View style={styles.chartPlaceholder} />
            ) : chartData.length > 0 ? (
              <>
                <AreaChart data={chartData} height={220} />
                <ChartLegend
                  items={[
                    { label: 'Inflow', color: FinanceColors.revenue },
                    { label: 'Outflow', color: FinanceColors.fees },
                  ]}
                />
              </>
            ) : (
              <View style={styles.chartPlaceholder} />
            )}
          </ThemedView>

          {/* Daily breakdown table */}
          {!isLoading && data.length > 0 && (
            <ThemedView type="surfaceContainerLowest" style={styles.table}>
              <View style={[styles.tableHeader, { borderBottomColor: '#ddd' }]}>
                <ThemedText type="labelMd" themeColor="textSecondary" style={styles.tableCell}>Date</ThemedText>
                <ThemedText type="labelMd" themeColor="textSecondary" style={styles.tableCellRight}>Inflow</ThemedText>
                <ThemedText type="labelMd" themeColor="textSecondary" style={styles.tableCellRight}>Outflow</ThemedText>
                <ThemedText type="labelMd" themeColor="textSecondary" style={styles.tableCellRight}>Net</ThemedText>
              </View>
              {data.slice(-15).reverse().map((entry) => (
                <View key={entry.date} style={[styles.tableRow, { borderBottomColor: '#eee' }]}>
                  <ThemedText type="bodySm" style={styles.tableCell}>
                    {new Date(entry.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                  </ThemedText>
                  <ThemedText type="bodySm" style={[styles.tableCellRight, { color: FinanceColors.revenue }]}>
                    {formatPKR(entry.inflow)}
                  </ThemedText>
                  <ThemedText type="bodySm" style={[styles.tableCellRight, { color: FinanceColors.fees }]}>
                    {formatPKR(entry.outflow)}
                  </ThemedText>
                  <ThemedText
                    type="bodySm"
                    style={[styles.tableCellRight, { color: entry.net >= 0 ? FinanceColors.profit : FinanceColors.fees, fontWeight: '600' }]}>
                    {formatPKR(entry.net)}
                  </ThemedText>
                </View>
              ))}
            </ThemedView>
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
  chartCard: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  chartPlaceholder: {
    height: 220,
    width: '100%',
  },
  table: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  tableCell: {
    flex: 1,
  },
  tableCellRight: {
    flex: 1,
    textAlign: 'right',
  },
});
