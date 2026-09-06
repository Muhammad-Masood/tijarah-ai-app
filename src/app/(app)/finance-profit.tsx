import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { GroupedBarChart, ChartLegend } from '@/components/finance-charts';
import {
  FinanceColors,
  FinanceChartSkeleton,
  FinanceEmptyState,
  FinanceErrorState,
  FinanceKPICard,
  FinanceKPISkeleton,
  ProfitMarginRing,
  DateRangePicker,
  type DateRange,
  formatPKR,
} from '@/components/finance-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Skeleton } from '@/components/skeleton';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useProfitAnalytics } from '@/hooks/use-finance-profit';

function getDefaultDates(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

export default function FinanceProfitScreen() {
  const { width } = useWindowDimensions();
  const [dates, setDates] = useState<DateRange>(getDefaultDates);
  const { data, isLoading, error, refetch } = useProfitAnalytics(dates);
  const isWideLayout = width >= 760;

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
        { label: 'Net Revenue', value: data.net_revenue, color: FinanceColors.primary },
        { label: 'Costs', value: data.total_costs, color: FinanceColors.fees },
        { label: 'Net Profit', value: data.net_profit, color: data.net_profit >= 0 ? FinanceColors.profit : FinanceColors.fees },
      ]
    : [];

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerBlock}>
            <ThemedText type="labelMd" themeColor="primary">PROFITABILITY</ThemedText>
            <View style={styles.headerRow}>
              <View style={styles.titleBlock}>
                <ThemedText type="displayLgMobile">Profit &amp; Loss</ThemedText>
                <ThemedText type="bodySm" themeColor="textSecondary">
                  See how revenue turns into profit after costs.
                </ThemedText>
              </View>
              <DateRangePicker value={dates} onChange={setDates} />
            </View>
          </View>

          {isLoading ? (
            <>
              <ThemedView type="surfaceContainerLowest" style={styles.heroCard}>
                <Skeleton width="28%" height={12} />
                <Skeleton width="72%" height={38} style={styles.heroSkeletonValue} />
                <Skeleton width="35%" height={12} />
              </ThemedView>
              <View style={styles.kpiRow}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <FinanceKPISkeleton key={index} />
                ))}
              </View>
              <View style={[styles.insightGrid, isWideLayout && styles.insightGridWide]}>
                <View style={styles.loadingInsight}>
                  <FinanceChartSkeleton height={128} />
                </View>
                <View style={styles.loadingInsight}>
                  <FinanceChartSkeleton height={248} />
                </View>
              </View>
            </>
          ) : data ? (
            <>
              <ThemedView
                type="surfaceContainerLowest"
                style={[styles.heroCard, { borderLeftColor: data.net_profit >= 0 ? FinanceColors.profit : FinanceColors.fees }]}>
                <View style={styles.heroTopRow}>
                  <ThemedText type="labelMd" themeColor="textSecondary">NET PROFIT</ThemedText>
                  <ThemedText type="labelMd" style={{ color: data.net_profit >= 0 ? FinanceColors.profit : FinanceColors.fees }}>
                    {data.net_profit >= 0 ? 'PROFITABLE' : 'LOSS-MAKING'}
                  </ThemedText>
                </View>
                <ThemedText
                  type="displayLg"
                  style={[styles.heroValue, { color: data.net_profit >= 0 ? FinanceColors.profit : FinanceColors.fees }]}>
                  {formatPKR(data.net_profit)}
                </ThemedText>
                <ThemedText type="bodySm" themeColor="textSecondary">{data.period}</ThemedText>
              </ThemedView>

              <View style={styles.sectionIntro}>
                <ThemedText type="headlineSm">The numbers behind it</ThemedText>
                <ThemedText type="bodySm" themeColor="textSecondary">Revenue, costs, and order volume for this period.</ThemedText>
              </View>

              <View style={styles.kpiRow}>
                <FinanceKPICard title="Revenue" value={formatPKR(data.total_revenue)} icon="cash-multiple" tone="revenue" />
                <FinanceKPICard title="Net Revenue" value={formatPKR(data.net_revenue)} icon="cash" tone="revenue" />
                <FinanceKPICard title="Costs" value={formatPKR(data.total_costs)} icon="receipt" tone="fees" />
                <FinanceKPICard title="Product Expenses" value={formatPKR(data.total_product_expenses)} icon="package-variant" tone="fees" />
                <FinanceKPICard title="Orders" value={String(data.order_count)} icon="package-variant-closed" tone="primary" />
              </View>

              <View style={[styles.insightGrid, isWideLayout && styles.insightGridWide]}>
                <ThemedView type="surfaceContainerLowest" style={styles.ringCard}>
                  <View style={styles.cardHeading}>
                    <ThemedText type="bodyLg">Profit margin</ThemedText>
                    <ThemedText type="bodySm" themeColor="textSecondary">How much revenue remains after costs</ThemedText>
                  </View>
                  <ProfitMarginRing margin={data.profit_margin} />
                </ThemedView>

                <ThemedView type="surfaceContainerLowest" style={styles.chartCard}>
                  <View style={styles.cardHeading}>
                    <ThemedText type="bodyLg">Revenue vs costs</ThemedText>
                    <ThemedText type="bodySm" themeColor="textSecondary">A direct comparison of your totals</ThemedText>
                  </View>
                  <GroupedBarChart data={chartData} height={200} />
                  <ChartLegend
                    items={[
                      { label: 'Revenue', color: FinanceColors.revenue },
                      { label: 'Net Revenue', color: FinanceColors.primary },
                      { label: 'Costs', color: FinanceColors.fees },
                      { label: 'Net Profit', color: FinanceColors.profit },
                    ]}
                  />
                </ThemedView>
              </View>
            </>
          ) : (
            <FinanceEmptyState message="No profit data is available for this period." />
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
    gap: Spacing.five,
  },
  headerBlock: {
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  titleBlock: {
    flex: 1,
    minWidth: 200,
    gap: Spacing.one,
  },
  sectionIntro: {
    gap: Spacing.one,
  },
  heroCard: {
    padding: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: Spacing.one,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  heroValue: {
    marginTop: Spacing.two,
  },
  heroSkeletonValue: {
    marginTop: Spacing.two,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  insightGrid: {
    gap: Spacing.four,
  },
  insightGridWide: {
    flexDirection: 'row',
  },
  loadingInsight: {
    flex: 1,
    minWidth: 0,
  },
  cardHeading: {
    alignSelf: 'stretch',
    gap: Spacing.one,
  },
  ringCard: {
    flex: 1,
    minWidth: 0,
    padding: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  chartCard: {
    flex: 1,
    minWidth: 0,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
});
