import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DonutChart, HorizontalBarChart, ChartLegend } from '@/components/finance-charts';
import {
  FinanceColors,
  FinanceComparisonCard,
  FinanceErrorState,
  FeeGaugeBar,
  formatPKR,
} from '@/components/finance-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useFeeBreakdown } from '@/hooks/use-finance-fees';
import { useTheme } from '@/hooks/use-theme';

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

export default function FinanceFeesScreen() {
  const dates = getDefaultDates();
  const { data, isLoading, error, refetch } = useFeeBreakdown(dates);

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

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          <ThemedText type="headlineMd">Fee Breakdown</ThemedText>

          {isLoading ? (
            <ThemedText type="bodyMd" themeColor="textSecondary">Loading fee data...</ThemedText>
          ) : data ? (
            <>
              {/* Comparison Card */}
              <FinanceComparisonCard
                earned={data.total_revenue}
                platformTook={totalDeductions}
                percentage={data.effective_fee_rate}
              />

              {/* Fee Gauge */}
              <ThemedView type="surfaceContainerLowest" style={styles.card}>
                <FeeGaugeBar rate={data.effective_fee_rate} />
              </ThemedView>

              {/* Horizontal Bar Chart */}
              <ThemedView type="surfaceContainerLowest" style={styles.card}>
                <ThemedText type="bodyLg" style={styles.sectionTitle}>Fees by Category</ThemedText>
                <HorizontalBarChart data={barData} height={180} />
              </ThemedView>

              {/* Donut Chart */}
              <ThemedView type="surfaceContainerLowest" style={styles.donutCard}>
                <ThemedText type="bodyLg" style={styles.sectionTitle}>Fee Distribution</ThemedText>
                <DonutChart
                  data={donutData}
                  size={200}
                  centerLabel="Net Payout"
                  centerValue={`PKR ${(data.net_payout / 1000).toFixed(1)}K`}
                />
                <ChartLegend items={donutData.map((d) => ({ label: d.label, color: d.color }))} />
              </ThemedView>

              {/* Summary Table */}
              <ThemedView type="surfaceContainerLowest" style={styles.summaryTable}>
                <SummaryRow label="Total Revenue" value={formatPKR(data.total_revenue)} color={FinanceColors.revenue} />
                <SummaryRow label="Commission" value={formatPKR(data.total_commission)} color={FinanceColors.fees} />
                <SummaryRow label="Payment Fees" value={formatPKR(data.total_payment_fees)} color={FinanceColors.fees} />
                <SummaryRow label="Shipping Fees" value={formatPKR(data.total_shipping_fees)} color={FinanceColors.fees} />
                <SummaryRow label="Penalties" value={formatPKR(data.total_penalties)} color={FinanceColors.fees} />
                <SummaryRow label="Promotional Discounts" value={formatPKR(data.total_promotional_discounts)} color={FinanceColors.fees} />
                <SummaryRow label="Refunds" value={formatPKR(data.total_refunds)} color={FinanceColors.warning} isLast />
              </ThemedView>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SummaryRow({ label, value, color, isLast = false }: { label: string; value: string; color: string; isLast?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.summaryRow, !isLast && { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
      <ThemedText type="bodyMd">{label}</ThemedText>
      <ThemedText type="bodyMd" style={{ color, fontWeight: '600' }}>{value}</ThemedText>
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
    gap: Spacing.four,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  donutCard: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.three,
  },
  sectionTitle: {
    marginBottom: Spacing.two,
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
});
