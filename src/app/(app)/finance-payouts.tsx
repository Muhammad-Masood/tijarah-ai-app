import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ChartLegend, StackedBarChart } from '@/components/finance-charts';
import {
  FinanceChartSkeleton,
  FinanceColors,
  FinanceEmptyState,
  FinanceErrorState,
  FinanceKPICard,
  FinanceKPISkeleton,
  FinanceTableSkeleton,
  FinanceStatusBadge,
  formatPKR,
} from '@/components/finance-kit';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { usePayoutAnalytics } from '@/hooks/use-finance-payouts';
import { useTheme } from '@/hooks/use-theme';

type PayoutTab = 'all' | 'paid' | 'upcoming';

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

export default function FinancePayoutsScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<PayoutTab>('all');
  const dates = getDefaultDates();
  const { data, isLoading, error, refetch } = usePayoutAnalytics(dates);
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

  const allPayouts = data ? [...data.paid, ...data.upcoming] : [];
  const filteredPayouts = allPayouts.filter((p) => {
    if (tab === 'all') return true;
    if (tab === 'paid') return p.paid;
    return !p.paid;
  });

  // Stacked bar chart data
  const chartData = allPayouts.slice(0, 10).map((p) => ({
    label: p.statement_number.slice(-6),
    segments: [
      { value: p.item_revenue, color: FinanceColors.revenue },
      { value: Math.abs(p.other_revenue_total), color: FinanceColors.primary },
      { value: Math.abs(p.fees_total), color: FinanceColors.fees },
    ],
  }));
  const hasPayouts = filteredPayouts.length > 0;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerBlock}>
            <ThemedText type="labelMd" themeColor="primary">PAYOUTS</ThemedText>
            <View style={styles.headerRow}>
              <View style={styles.titleBlock}>
                <ThemedText type="displayLgMobile">Payout Analytics</ThemedText>
                <ThemedText type="bodySm" themeColor="textSecondary">
                  Track paid transfers and what is scheduled next.
                </ThemedText>
              </View>
            </View>
            <SegmentedTabs
              options={[
                { value: 'all', label: 'All' },
                { value: 'paid', label: 'Paid' },
                { value: 'upcoming', label: 'Upcoming' },
              ]}
              value={tab}
              onChange={(v) => setTab(v as PayoutTab)}
            />
          </View>

          {isLoading ? (
            <View style={styles.kpiGrid}>
              {Array.from({ length: 4 }).map((_, i) => <FinanceKPISkeleton key={i} />)}
            </View>
          ) : data ? (
            <>
              <View style={styles.sectionIntro}>
                <ThemedText type="headlineSm">Payout overview</ThemedText>
                <ThemedText type="bodySm" themeColor="textSecondary">Totals for the current 30-day period.</ThemedText>
              </View>
              <View style={styles.kpiGrid}>
                <FinanceKPICard title="Total Payouts" value={String(data.total_payouts)} icon="bank-transfer" tone="primary" />
                <FinanceKPICard title="Total Amount" value={formatPKR(data.total_amount)} icon="cash-multiple" tone="neutral" />
                <FinanceKPICard title="Paid Amount" value={formatPKR(data.paid_amount)} icon="check-circle" tone="revenue" />
                <FinanceKPICard title="Upcoming Amount" value={formatPKR(data.upcoming_amount)} icon="clock-outline" tone="warning" />
              </View>
            </>
          ) : null}

          {isLoading ? (
            <ThemedView type="surfaceContainerLowest" style={styles.chartCard}>
              <FinanceChartSkeleton height={180} />
            </ThemedView>
          ) : chartData.length > 0 ? (
            <ThemedView type="surfaceContainerLowest" style={styles.chartCard}>
              <View style={styles.cardHeading}>
                <ThemedText type="bodyLg">Payout composition</ThemedText>
                <ThemedText type="bodySm" themeColor="textSecondary">Revenue and fees across recent statements.</ThemedText>
              </View>
              <StackedBarChart data={chartData} height={180} />
              <ChartLegend
                items={[
                  { label: 'Item Revenue', color: FinanceColors.revenue },
                  { label: 'Other Revenue', color: FinanceColors.primary },
                  { label: 'Fees', color: FinanceColors.fees },
                ]}
              />
            </ThemedView>
          ) : data ? (
            <FinanceEmptyState message="No payout activity for this period." />
          ) : null}

          <View style={styles.tableSection}>
            <View style={styles.sectionIntro}>
              <ThemedText type="headlineSm">Payout statements</ThemedText>
              <ThemedText type="bodySm" themeColor="textSecondary">Select a statement to view its settlement details.</ThemedText>
            </View>

            {isLoading ? (
              <ThemedView type="surfaceContainerLowest" style={styles.table}>
                <FinanceTableSkeleton rows={4} />
              </ThemedView>
            ) : (
              <ThemedView type="surfaceContainerLowest" style={styles.table}>
                {hasPayouts ? filteredPayouts.map((payout, index) => (
                  <Pressable
                    key={payout.payout_id}
                    onPress={() => router.push({ pathname: '/finance-settlement', params: { payout_id: payout.statement_number } } as never)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open payout statement ${payout.statement_number}`}
                    accessibilityHint="Opens settlement details"
                    style={({ pressed }) => [
                      styles.tableRow,
                      isWideLayout ? styles.tableRowWide : styles.tableRowCompact,
                      { borderBottomColor: theme.border },
                      index === filteredPayouts.length - 1 && styles.tableRowLast,
                      pressed && styles.tableRowPressed,
                    ]}>
                    <View style={styles.payoutPrimary}>
                      <View style={styles.cell}>
                        <ThemedText type="bodyMd" numberOfLines={1}>{payout.statement_number}</ThemedText>
                        <ThemedText type="bodySm" themeColor="textSecondary">
                          {new Date(payout.created_at).toLocaleDateString()}
                        </ThemedText>
                      </View>
                      <View style={styles.cellRight}>
                        <ThemedText type="bodyMd" style={styles.totalAmount} numberOfLines={1}>
                          {formatPKR(payout.amount)}
                        </ThemedText>
                        <FinanceStatusBadge status={payout.paid ? 'paid' : 'upcoming'} />
                      </View>
                    </View>
                    <View style={styles.breakdownCell}>
                      <View style={styles.breakdownItem}>
                        <ThemedText type="labelMd" themeColor="textSecondary">REVENUE</ThemedText>
                        <ThemedText type="bodySm" style={{ color: FinanceColors.revenue }} numberOfLines={1}>
                          {formatPKR(payout.item_revenue)}
                        </ThemedText>
                      </View>
                      <View style={styles.breakdownItem}>
                        <ThemedText type="labelMd" themeColor="textSecondary">FEES</ThemedText>
                        <ThemedText type="bodySm" style={{ color: FinanceColors.fees }} numberOfLines={1}>
                          {formatPKR(payout.fees_total)}
                        </ThemedText>
                      </View>
                    </View>
                  </Pressable>
                )) : (
                <View style={styles.emptyTable}>
                  <FinanceEmptyState message={`No ${tab === 'all' ? '' : tab + ' '}payouts found.`} />
                </View>
                )}
              </ThemedView>
            )}
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
  titleBlock: {
    flex: 1,
    minWidth: 220,
    gap: Spacing.one,
  },
  sectionIntro: {
    gap: Spacing.one,
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
  cardHeading: {
    alignSelf: 'stretch',
    gap: Spacing.one,
  },
  tableSection: {
    gap: Spacing.three,
  },
  table: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    gap: Spacing.two,
  },
  tableRowWide: {
    minHeight: 84,
  },
  tableRowCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: Spacing.three,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableRowPressed: {
    opacity: 0.72,
  },
  payoutPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cell: {
    flex: 1,
    gap: 2,
  },
  cellRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  totalAmount: {
    fontWeight: '600',
  },
  breakdownCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  breakdownItem: {
    gap: Spacing.half,
  },
  emptyTable: {
    padding: Spacing.two,
  },
});
