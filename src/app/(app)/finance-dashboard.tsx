import { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AreaChart, ChartLegend, DonutChart } from '@/components/finance-charts';
import {
  DateRangeSelector,
  type DateRangePreset,
  FinanceColors,
  FinanceChartSkeleton,
  FinanceEmptyState,
  FinanceErrorState,
  FinanceKPICard,
  FinanceKPISkeleton,
  FinanceSection,
  FinanceStatusBadge,
  FinanceTableSkeleton,
  formatPKR,
  formatPercent,
} from '@/components/finance-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useFinancialDashboard } from '@/hooks/use-finance-dashboard';
import { useTheme } from '@/hooks/use-theme';

export default function FinanceDashboardScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [days, setDays] = useState<DateRangePreset>(30);
  const { data, isLoading, error, refetch } = useFinancialDashboard(days);
  const isWideLayout = width >= 760;

  if (error) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
          <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
            <FinanceErrorState error={error} onRetry={refetch} />
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // Fee donut data
  const feeDonutData = data
    ? [
        { label: 'Commission', value: Math.abs(data.fee_breakdown.total_commission), color: FinanceColors.fees },
        { label: 'Payment', value: Math.abs(data.fee_breakdown.total_payment_fees), color: FinanceColors.primary },
        { label: 'Shipping', value: Math.abs(data.fee_breakdown.total_shipping_fees), color: FinanceColors.warning },
        { label: 'Penalties', value: Math.abs(data.fee_breakdown.total_penalties), color: '#8B5CF6' },
        { label: 'Promotions', value: Math.abs(data.fee_breakdown.total_promotional_discounts), color: FinanceColors.profit },
      ]
    : [];

  // Cash flow chart data
  const cashFlowData = data?.cash_flow_trend?.map((entry) => ({
    x: new Date(entry.date).getDate(),
    inflow: entry.inflow,
    outflow: entry.outflow,
  })) ?? [];
  const hasFeeData = feeDonutData.some((slice) => slice.value > 0);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerBlock}>
            <ThemedText type="labelMd" themeColor="primary">FINANCIAL PULSE</ThemedText>
            <View style={styles.headerRow}>
              <View style={styles.titleBlock}>
                <ThemedText type="displayLgMobile">Financial Dashboard</ThemedText>
                <ThemedText type="bodySm" themeColor="textSecondary">
                  Track what came in, what went out, and what remains.
                </ThemedText>
              </View>
              <DateRangeSelector value={days} onChange={setDays} />
            </View>
          </View>

          <View style={styles.sectionIntro}>
            <ThemedText type="headlineSm">At a glance</ThemedText>
            <ThemedText type="bodySm" themeColor="textSecondary">Your key numbers for the selected period.</ThemedText>
          </View>

          {isLoading ? (
            <View style={styles.kpiGrid}>
              {Array.from({ length: 5 }).map((_, i) => (
                <FinanceKPISkeleton key={i} />
              ))}
            </View>
          ) : data ? (
            <View style={styles.kpiGrid}>
              <FinanceKPICard
                title="Total Revenue"
                value={formatPKR(data.total_revenue)}
                icon="cash-multiple"
                tone="revenue"
              />
              <FinanceKPICard
                title="Net Profit"
                value={formatPKR(data.net_profit)}
                subtitle={data.net_profit >= 0 ? 'Profitable' : 'Loss-making'}
                icon="trending-up"
                tone={data.net_profit >= 0 ? 'profit' : 'fees'}
              />
              <FinanceKPICard
                title="Profit Margin"
                value={formatPercent(data.profit_margin)}
                icon="percent"
                tone={data.profit_margin > 20 ? 'revenue' : data.profit_margin > 10 ? 'warning' : 'fees'}
              />
              <FinanceKPICard
                title="Total Fees"
                value={formatPKR(data.total_fees)}
                icon="receipt-outline"
                tone="fees"
              />
              <FinanceKPICard
                title="Avg Order Value"
                value={formatPKR(data.average_order_value)}
                icon="cart-outline"
                tone="primary"
              />
            </View>
          ) : null}

          {/* Cash Flow Chart */}
          <FinanceSection title="Cash Flow Trend">
            <ThemedView type="surfaceContainerLowest" style={styles.chartCard}>
              {isLoading ? (
                <FinanceChartSkeleton height={200} />
              ) : cashFlowData.length > 0 ? (
                <>
                  <AreaChart data={cashFlowData} />
                  <ChartLegend
                    items={[
                      { label: 'Inflow', color: FinanceColors.revenue },
                      { label: 'Outflow', color: FinanceColors.fees },
                    ]}
                  />
                </>
              ) : (
                <FinanceEmptyState message="No cash flow activity for this period." />
              )}
            </ThemedView>
          </FinanceSection>

          <View style={[styles.bottomSection, isWideLayout && styles.bottomSectionWide]}>
            <View style={styles.bottomColumn}>
              <FinanceSection title="Fee Breakdown">
                <ThemedView type="surfaceContainerLowest" style={styles.donutCard}>
                  {isLoading ? (
                    <FinanceChartSkeleton height={200} />
                  ) : data && hasFeeData ? (
                    <>
                      <DonutChart
                        data={feeDonutData}
                        size={200}
                        centerLabel="Net Payout"
                        centerValue={`PKR ${(data.fee_breakdown.net_payout / 1000).toFixed(1)}K`}
                      />
                      <ChartLegend items={feeDonutData.map((d) => ({ label: d.label, color: d.color }))} />
                    </>
                  ) : (
                    <FinanceEmptyState message="No fee activity for this period." />
                  )}
                </ThemedView>
              </FinanceSection>
            </View>

            <View style={styles.bottomColumn}>
              <FinanceSection title="Recent Payouts">
                <ThemedView type="surfaceContainerLowest" style={styles.payoutTable}>
                  {isLoading ? (
                    <FinanceTableSkeleton rows={3} />
                  ) : data?.recent_payouts?.map((payout, index) => (
                    <View
                      key={payout.payout_id}
                      style={[
                        styles.payoutRow,
                        { borderBottomColor: theme.border },
                        index === data.recent_payouts.length - 1 && styles.payoutRowLast,
                      ]}>
                      <View style={styles.payoutInfo}>
                        <ThemedText type="bodyMd" numberOfLines={1}>
                          {payout.statement_number}
                        </ThemedText>
                        <ThemedText type="bodySm" themeColor="textSecondary">
                          {new Date(payout.created_at).toLocaleDateString()}
                        </ThemedText>
                      </View>
                      <View style={styles.payoutRight}>
                        <ThemedText type="bodyMd" style={{ color: FinanceColors.revenue }}>
                          {formatPKR(payout.amount)}
                        </ThemedText>
                        <FinanceStatusBadge status={payout.status} />
                      </View>
                    </View>
                  ))}
                  {!isLoading && (!data?.recent_payouts || data.recent_payouts.length === 0) && (
                    <View style={styles.emptyRow}>
                      <ThemedText type="bodySm" themeColor="textSecondary">
                        No recent payouts for this period.
                      </ThemedText>
                    </View>
                  )}
                </ThemedView>
              </FinanceSection>
            </View>
          </View>
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
    gap: Spacing.three,
  },
  titleBlock: {
    flex: 1,
    minWidth: 220,
    gap: Spacing.one,
  },
  sectionIntro: {
    gap: Spacing.one,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  chartCard: {
    paddingVertical: Spacing.three,
    paddingHorizontal: 0,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  bottomSection: {
    gap: Spacing.four,
  },
  bottomSectionWide: {
    flexDirection: 'row',
  },
  bottomColumn: {
    flex: 1,
    minWidth: 0,
  },
  donutCard: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.three,
  },
  payoutTable: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  payoutRowLast: {
    borderBottomWidth: 0,
  },
  payoutInfo: {
    flex: 1,
    gap: 2,
  },
  payoutRight: {
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  emptyRow: {
    padding: Spacing.four,
    alignItems: 'center',
  },
});
