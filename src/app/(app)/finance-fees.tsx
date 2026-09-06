import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { DonutChart, HorizontalBarChart, ChartLegend } from '@/components/finance-charts';
import {
  FinanceColors,
  FinanceChartSkeleton,
  FinanceComparisonCard,
  FinanceEmptyState,
  FinanceErrorState,
  FeeGaugeBar,
  DateRangePicker,
  type DateRange,
  formatPKR,
} from '@/components/finance-kit';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useFeeBreakdown } from '@/hooks/use-finance-fees';
import { useTheme } from '@/hooks/use-theme';

function getDefaultDates(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

export default function FinanceFeesScreen() {
  const { width } = useWindowDimensions();
  const [dates, setDates] = useState<DateRange>(getDefaultDates);
  const { data, isLoading, error, refetch } = useFeeBreakdown(dates);
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

  const barData = data
    ? [
        { label: 'Commission', value: Math.abs(data.total_commission), color: FinanceColors.fees },
        { label: 'Payment', value: Math.abs(data.total_payment_fees), color: FinanceColors.primary },
        { label: 'Shipping', value: Math.abs(data.total_shipping_fees), color: FinanceColors.warning },
        { label: 'Penalties', value: Math.abs(data.total_penalties), color: '#8B5CF6' },
        { label: 'Promotions', value: Math.abs(data.total_promotional_discounts), color: FinanceColors.profit },
      ]
    : [];

  const donutData = data
    ? [
        { label: 'Commission', value: Math.abs(data.total_commission), color: FinanceColors.fees },
        { label: 'Payment', value: Math.abs(data.total_payment_fees), color: FinanceColors.primary },
        { label: 'Shipping', value: Math.abs(data.total_shipping_fees), color: FinanceColors.warning },
        { label: 'Penalties', value: Math.abs(data.total_penalties), color: '#8B5CF6' },
        { label: 'Promotions', value: Math.abs(data.total_promotional_discounts), color: FinanceColors.profit },
      ].filter((d) => d.value > 0)
    : [];

  const totalDeductions = data
    ? Math.abs(data.total_commission) + Math.abs(data.total_payment_fees) + Math.abs(data.total_shipping_fees) + Math.abs(data.total_penalties) + Math.abs(data.total_promotional_discounts)
    : 0;
  const hasFeeData = donutData.length > 0;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerBlock}>
            <ThemedText type="labelMd" themeColor="primary">COST OF SELLING</ThemedText>
            <View style={styles.headerRow}>
              <View style={styles.titleBlock}>
                <ThemedText type="displayLgMobile">Fee Breakdown</ThemedText>
                <ThemedText type="bodySm" themeColor="textSecondary">
                  Understand what the platform takes from every sale.
                </ThemedText>
              </View>
              <DateRangePicker value={dates} onChange={setDates} />
            </View>
          </View>

          {isLoading ? (
            <>
              <ThemedView type="surfaceContainerLowest" style={styles.card}>
                <Skeleton width="34%" height={12} />
                <Skeleton width="72%" height={28} style={styles.loadingValue} />
                <Skeleton width="48%" height={12} />
              </ThemedView>
              <ThemedView type="surfaceContainerLowest" style={styles.card}>
                <FinanceChartSkeleton height={56} />
              </ThemedView>
              <View style={[styles.analysisGrid, isWideLayout && styles.analysisGridWide]}>
                <View style={styles.analysisColumn}>
                  <FinanceChartSkeleton height={220} />
                </View>
                <View style={styles.analysisColumn}>
                  <FinanceChartSkeleton height={280} />
                </View>
              </View>
              <FinanceChartSkeleton height={300} />
            </>
          ) : data ? (
            <>
              <View style={styles.sectionIntro}>
                <ThemedText type="headlineSm">Where your revenue goes</ThemedText>
                <ThemedText type="bodySm" themeColor="textSecondary">A quick view of earnings versus platform deductions.</ThemedText>
              </View>

              <FinanceComparisonCard
                earned={data.total_revenue}
                platformTook={totalDeductions}
                percentage={data.effective_fee_rate}
              />

              <ThemedView type="surfaceContainerLowest" style={styles.card}>
                <View style={styles.cardHeading}>
                  <ThemedText type="bodyLg">Effective fee rate</ThemedText>
                  <ThemedText type="bodySm" themeColor="textSecondary">How much of your revenue goes to fees.</ThemedText>
                </View>
                <FeeGaugeBar rate={data.effective_fee_rate} />
              </ThemedView>

              <View style={[styles.analysisGrid, isWideLayout && styles.analysisGridWide]}>
                <View style={styles.analysisColumn}>
                  <ThemedView type="surfaceContainerLowest" style={styles.card}>
                    <View style={styles.cardHeading}>
                      <ThemedText type="bodyLg">Fees by category</ThemedText>
                      <ThemedText type="bodySm" themeColor="textSecondary">Compare the biggest deductions first.</ThemedText>
                    </View>
                    <HorizontalBarChart data={barData} height={180} />
                  </ThemedView>
                </View>

                <View style={styles.analysisColumn}>
                  <ThemedView type="surfaceContainerLowest" style={styles.donutCard}>
                    <View style={styles.cardHeading}>
                      <ThemedText type="bodyLg">Fee distribution</ThemedText>
                      <ThemedText type="bodySm" themeColor="textSecondary">The share of total deductions.</ThemedText>
                    </View>
                    {hasFeeData ? (
                      <>
                        <DonutChart
                          data={donutData}
                          size={200}
                          centerLabel="Net Payout"
                          centerValue={`PKR ${(data.net_payout / 1000).toFixed(1)}K`}
                        />
                        <ChartLegend items={donutData.map((d) => ({ label: d.label, color: d.color }))} />
                      </>
                    ) : (
                      <View style={styles.emptyChart}>
                        <ThemedText type="bodyMd" themeColor="textSecondary">
                          No fee activity for this period.
                        </ThemedText>
                      </View>
                    )}
                  </ThemedView>
                </View>
              </View>

              <View style={styles.summarySection}>
                <View style={styles.cardHeading}>
                  <ThemedText type="headlineSm">Detailed breakdown</ThemedText>
                  <ThemedText type="bodySm" themeColor="textSecondary">Exact amounts included in this period.</ThemedText>
                </View>
                <ThemedView type="surfaceContainerLowest" style={styles.summaryTable}>
                  <SummaryRow label="Total Revenue" value={formatPKR(data.total_revenue)} color={FinanceColors.revenue} />
                  <SummaryRow label="Commission" value={formatPKR(data.total_commission)} color={FinanceColors.fees} />
                  <SummaryRow label="Payment Fees" value={formatPKR(data.total_payment_fees)} color={FinanceColors.fees} />
                  <SummaryRow label="Shipping Fees" value={formatPKR(data.total_shipping_fees)} color={FinanceColors.fees} />
                  <SummaryRow label="Penalties" value={formatPKR(data.total_penalties)} color={FinanceColors.fees} />
                  <SummaryRow label="Promotional Discounts" value={formatPKR(data.total_promotional_discounts)} color={FinanceColors.fees} />
                  <SummaryRow label="Refunds" value={formatPKR(data.total_refunds)} color={FinanceColors.warning} isLast />
                </ThemedView>
              </View>
            </>
          ) : (
            <FinanceEmptyState message="No fee data is available for this period." />
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SummaryRow({ label, value, color, isLast = false }: { label: string; value: string; color: string; isLast?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.summaryRow, !isLast && { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
      <ThemedText type="bodyMd" numberOfLines={2} style={styles.summaryLabel}>{label}</ThemedText>
      <ThemedText type="bodyMd" numberOfLines={1} style={[styles.summaryValue, { color }]}>{value}</ThemedText>
    </View>
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
  loadingValue: {
    marginTop: Spacing.two,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.three,
  },
  donutCard: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.three,
  },
  cardHeading: {
    alignSelf: 'stretch',
    gap: Spacing.one,
  },
  analysisGrid: {
    gap: Spacing.four,
  },
  analysisGridWide: {
    flexDirection: 'row',
  },
  analysisColumn: {
    flex: 1,
    minWidth: 0,
  },
  summarySection: {
    gap: Spacing.three,
  },
  emptyChart: {
    minHeight: 120,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTable: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  summaryLabel: {
    flex: 1,
    minWidth: 0,
  },
  summaryValue: {
    marginLeft: Spacing.three,
    fontWeight: '600',
  },
});
