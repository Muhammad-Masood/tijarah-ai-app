import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AreaChart,
  DonutChart,
  GroupedBarChart,
  ChartLegend,
} from '@/components/finance-charts';
import {
  DateRangePicker,
  FinanceColors,
  FinanceChartSkeleton,
  FinanceEmptyState,
  FinanceErrorState,
  FinanceKPICard,
  FinanceKPISkeleton,
  FinanceSection,
  TopProductCard,
  formatPKR,
  formatPercent,
  formatCompact,
  type DateRange,
} from '@/components/finance-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useProductFinancials } from '@/hooks/use-product-financials';

const FEE_COLORS = [
  FinanceColors.fees,
  FinanceColors.warning,
  FinanceColors.primary,
  FinanceColors.neutral,
  FinanceColors.revenue,
  '#8B5CF6',
];

export function getDefaultDates(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

export default function ProductFinancialsScreen() {
  const { width } = useWindowDimensions();
  const [dates, setDates] = useState<DateRange>(getDefaultDates);
  const { data, isLoading, error, refetch } = useProductFinancials({
    startDate: dates.startDate,
    endDate: dates.endDate,
    sortBy: 'gross_revenue',
  });
  const isWideLayout = width >= 760;

  const trendChartData = useMemo(() => {
    if (!data?.daily_trend?.length) return [];
    return data.daily_trend.map((point) => ({
      x: new Date(point.date).getDate(),
      inflow: point.revenue,
      outflow: point.fees + point.refunds,
    }));
  }, [data]);

  const profitTrendData = useMemo(() => {
    if (!data?.daily_trend?.length) return [];
    return data.daily_trend.map((point) => ({
      x: new Date(point.date).getDate(),
      inflow: point.net_profit >= 0 ? point.net_profit : 0,
      outflow: point.net_profit < 0 ? Math.abs(point.net_profit) : 0,
    }));
  }, [data]);

  const feeDonutData = useMemo(() => {
    if (!data?.fee_distribution?.length) return [];
    return data.fee_distribution.map((slice, i) => ({
      label: slice.category,
      value: slice.amount,
      color: FEE_COLORS[i % FEE_COLORS.length],
    }));
  }, [data]);

  const comparisonChartData = useMemo(() => {
    if (!data?.top_products_chart?.length) return [];
    return data.top_products_chart.slice(0, 5).flatMap((bar) => [
      { label: `${bar.product_name.slice(0, 8)} Rev`, value: bar.gross_revenue, color: FinanceColors.revenue },
      { label: `${bar.product_name.slice(0, 8)} Profit`, value: bar.net_profit, color: bar.net_profit >= 0 ? FinanceColors.profit : FinanceColors.fees },
    ]);
  }, [data]);

  const totalFees = useMemo(
    () => data?.fee_distribution.reduce((sum, s) => sum + s.amount, 0) ?? 0,
    [data],
  );

  if (error) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
          <View style={styles.topRow}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <ThemedText type="headlineSm">←</ThemedText>
            </Pressable>
            <ThemedText type="headlineSm">Product Financials</ThemedText>
            <View style={styles.topRowSpacer} />
          </View>
          <FinanceErrorState error={error} onRetry={refetch} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerBlock}>
            <View style={styles.topRow}>
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <ThemedText type="headlineSm">←</ThemedText>
              </Pressable>
              <ThemedText type="headlineSm">Product Financials</ThemedText>
              <View style={styles.topRowSpacer} />
            </View>
            <ThemedText type="bodySm" themeColor="textSecondary">
              Per-product revenue, fees, and profit breakdown.
            </ThemedText>
            <DateRangePicker value={dates} onChange={setDates} />
          </View>

          {isLoading ? (
            <>
              <View style={styles.kpiRow}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <FinanceKPISkeleton key={i} />
                ))}
              </View>
              <FinanceChartSkeleton height={200} />
              <FinanceChartSkeleton height={200} />
            </>
          ) : data && data.products.length > 0 ? (
            <>
              {/* Summary KPIs */}
              <View style={styles.kpiRow}>
                <FinanceKPICard
                  title="Products"
                  value={String(data.total_products)}
                  icon="package-variant"
                  tone="primary"
                />
                <FinanceKPICard
                  title="Total Revenue"
                  value={formatCompact(data.summary.total_gross_revenue as number ?? 0)}
                  subtitle={formatPKR(data.summary.total_gross_revenue as number ?? 0)}
                  icon="cash-multiple"
                  tone="revenue"
                />
                <FinanceKPICard
                  title="Net Profit"
                  value={formatCompact(data.summary.total_net_profit as number ?? 0)}
                  subtitle={formatPKR(data.summary.total_net_profit as number ?? 0)}
                  icon="trending-up"
                  tone={(data.summary.total_net_profit as number ?? 0) >= 0 ? 'profit' : 'fees'}
                />
                <FinanceKPICard
                  title="Total Fees"
                  value={formatCompact(totalFees)}
                  subtitle={formatPKR(totalFees)}
                  icon="receipt"
                  tone="fees"
                />
              </View>

              {/* Daily Revenue & Fees Trend */}
              {trendChartData.length > 0 && (
                <FinanceSection title="Daily Revenue & Fees">
                  <ThemedView type="surfaceContainerLowest" style={styles.chartCard}>
                    <AreaChart
                      data={trendChartData}
                      height={200}
                      inflowColor={FinanceColors.revenue}
                      outflowColor={FinanceColors.fees}
                    />
                    <ChartLegend
                      items={[
                        { label: 'Revenue', color: FinanceColors.revenue },
                        { label: 'Fees + Refunds', color: FinanceColors.fees },
                      ]}
                    />
                  </ThemedView>
                </FinanceSection>
              )}

              {/* Fee Distribution */}
              {feeDonutData.length > 0 && (
                <FinanceSection title="Fee Breakdown">
                  <ThemedView type="surfaceContainerLowest" style={styles.chartCard}>
                    <DonutChart
                      data={feeDonutData}
                      size={200}
                      centerLabel="Total Fees"
                      centerValue={formatCompact(totalFees)}
                    />
                    <ChartLegend items={feeDonutData.map((s) => ({ label: s.label, color: s.color }))} />
                  </ThemedView>
                </FinanceSection>
              )}

              {/* Top Products Comparison */}
              {comparisonChartData.length > 0 && (
                <FinanceSection title="Top Products Comparison">
                  <ThemedView type="surfaceContainerLowest" style={styles.chartCard}>
                    <GroupedBarChart data={comparisonChartData} height={220} />
                    <ChartLegend
                      items={[
                        { label: 'Revenue', color: FinanceColors.revenue },
                        { label: 'Profit', color: FinanceColors.profit },
                      ]}
                    />
                  </ThemedView>
                </FinanceSection>
              )}

              {/* Full Product List */}
              <FinanceSection title={`All Products (${data.total_products})`}>
                <View style={styles.productList}>
                  {data.products.map((product, index) => (
                    <TopProductCard
                      key={product.sku ?? index}
                      rank={index + 1}
                      product={product}
                      onPress={() =>
                        router.push({
                          pathname: '/product-detail',
                          params: { id: product.sku, source: 'daraz', tab: 'finance' },
                        })
                      }
                    />
                  ))}
                </View>
              </FinanceSection>
            </>
          ) : (
            <FinanceEmptyState message="No product financial data is available for this period. Make sure your store is connected and you have sales." />
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.three,
  },
  topRowSpacer: {
    width: 20,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  chartCard: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  productList: {
    gap: Spacing.three,
  },
});
