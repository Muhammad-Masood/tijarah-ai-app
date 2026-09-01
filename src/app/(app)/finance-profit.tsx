import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GroupedBarChart, ChartLegend } from '@/components/finance-charts';
import {
  FinanceColors,
  FinanceErrorState,
  FinanceKPICard,
  ProfitMarginRing,
  formatPKR,
} from '@/components/finance-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useProfitAnalytics } from '@/hooks/use-finance-profit';

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

export default function FinanceProfitScreen() {
  const dates = getDefaultDates();
  const { data, isLoading, error, refetch } = useProfitAnalytics(dates);

  if (error) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
          <FinanceErrorState error={error} onRetry={refetch} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const chartData = data
    ? [
        { label: 'Revenue', value: data.total_revenue, color: FinanceColors.revenue },
        { label: 'Costs', value: data.total_costs, color: FinanceColors.fees },
        { label: 'Net Profit', value: data.net_profit, color: data.net_profit >= 0 ? FinanceColors.profit : FinanceColors.fees },
      ]
    : [];

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          <ThemedText type="headlineMd">Profit & Loss</ThemedText>

          {isLoading ? (
            <ThemedText type="bodyMd" themeColor="textSecondary">Loading profit data...</ThemedText>
          ) : data ? (
            <>
              {/* Hero Card */}
              <ThemedView
                type="surfaceContainerLowest"
                style={[styles.heroCard, { borderLeftColor: data.net_profit >= 0 ? FinanceColors.profit : FinanceColors.fees }]}>
                <ThemedText type="bodySm" themeColor="textSecondary">Net Profit</ThemedText>
                <ThemedText
                  type="displayLg"
                  style={{ color: data.net_profit >= 0 ? FinanceColors.profit : FinanceColors.fees }}>
                  {formatPKR(data.net_profit)}
                </ThemedText>
                <ThemedText type="bodySm" themeColor="textSecondary">
                  {data.period}
                </ThemedText>
              </ThemedView>

              {/* KPI Row */}
              <View style={styles.kpiRow}>
                <FinanceKPICard title="Revenue" value={formatPKR(data.total_revenue)} icon="cash-multiple" tone="revenue" />
                <FinanceKPICard title="Costs" value={formatPKR(data.total_costs)} icon="receipt" tone="fees" />
                <FinanceKPICard title="Orders" value={String(data.order_count)} icon="package-variant-closed" tone="primary" />
              </View>

              {/* Profit Margin Ring */}
              <ThemedView type="surfaceContainerLowest" style={styles.ringCard}>
                <ProfitMarginRing margin={data.profit_margin} />
              </ThemedView>

              {/* Grouped Bar Chart */}
              <ThemedView type="surfaceContainerLowest" style={styles.chartCard}>
                <ThemedText type="bodyLg" style={styles.chartTitle}>Revenue vs Costs vs Profit</ThemedText>
                <GroupedBarChart data={chartData} height={200} />
                <ChartLegend
                  items={[
                    { label: 'Revenue', color: FinanceColors.revenue },
                    { label: 'Costs', color: FinanceColors.fees },
                    { label: 'Net Profit', color: FinanceColors.profit },
                  ]}
                />
              </ThemedView>
            </>
          ) : null}
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
  heroCard: {
    padding: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: Spacing.one,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  ringCard: {
    padding: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  chartCard: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  chartTitle: {
    marginBottom: Spacing.one,
  },
});
