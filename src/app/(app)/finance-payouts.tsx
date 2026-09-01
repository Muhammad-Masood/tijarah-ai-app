import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { StackedBarChart, ChartLegend } from '@/components/finance-charts';
import {
  FinanceColors,
  FinanceEmptyState,
  FinanceErrorState,
  FinanceKPICard,
  FinanceKPISkeleton,
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
  const [tab, setTab] = useState<PayoutTab>('all');
  const dates = getDefaultDates();
  const { data, isLoading, error, refetch } = usePayoutAnalytics(dates);

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

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerRow}>
            <ThemedText type="headlineMd">Payout Analytics</ThemedText>
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

          {/* KPI Cards */}
          {isLoading ? (
            <View style={styles.kpiGrid}>
              {Array.from({ length: 4 }).map((_, i) => <FinanceKPISkeleton key={i} />)}
            </View>
          ) : data ? (
            <View style={styles.kpiGrid}>
              <FinanceKPICard title="Total Payouts" value={String(data.total_payouts)} icon="bank-transfer" tone="primary" />
              <FinanceKPICard title="Total Amount" value={formatPKR(data.total_amount)} icon="cash-multiple" tone="neutral" />
              <FinanceKPICard title="Paid Amount" value={formatPKR(data.paid_amount)} icon="check-circle" tone="revenue" />
              <FinanceKPICard title="Upcoming Amount" value={formatPKR(data.upcoming_amount)} icon="clock-outline" tone="warning" />
            </View>
          ) : null}

          {/* Stacked Bar Chart */}
          {!isLoading && chartData.length > 0 && (
            <ThemedView type="surfaceContainerLowest" style={styles.chartCard}>
              <ThemedText type="bodyLg" style={styles.chartTitle}>Payout Composition</ThemedText>
              <StackedBarChart data={chartData} height={180} />
              <ChartLegend
                items={[
                  { label: 'Item Revenue', color: FinanceColors.revenue },
                  { label: 'Other Revenue', color: FinanceColors.primary },
                  { label: 'Fees', color: FinanceColors.fees },
                ]}
              />
            </ThemedView>
          )}

          {/* Payouts Table */}
          <ThemedView type="surfaceContainerLowest" style={styles.table}>
            {filteredPayouts.length === 0 ? (
              <FinanceEmptyState message="No payouts found." />
            ) : (
              filteredPayouts.map((payout, index) => (
                <Pressable
                  key={payout.payout_id}
                  onPress={() => router.push({ pathname: '/finance-settlement', params: { payout_id: payout.statement_number } } as never)}
                  style={[styles.tableRow, { borderBottomColor: theme.border }, index === filteredPayouts.length - 1 && styles.tableRowLast]}>
                  <View style={styles.cell}>
                    <ThemedText type="bodyMd" numberOfLines={1}>{payout.statement_number}</ThemedText>
                    <ThemedText type="bodySm" themeColor="textSecondary">
                      {new Date(payout.created_at).toLocaleDateString()}
                    </ThemedText>
                  </View>
                  <View style={styles.cellRight}>
                    <ThemedText type="bodySm" style={{ color: FinanceColors.revenue }}>
                      {formatPKR(payout.item_revenue)}
                    </ThemedText>
                    <ThemedText type="bodySm" style={{ color: FinanceColors.fees }}>
                      {formatPKR(payout.fees_total)}
                    </ThemedText>
                  </View>
                  <View style={styles.cellRight}>
                    <ThemedText type="bodyMd" style={{ fontWeight: '600' }}>
                      {formatPKR(payout.amount)}
                    </ThemedText>
                    <FinanceStatusBadge status={payout.paid ? 'paid' : 'upcoming'} />
                  </View>
                </Pressable>
              ))
            )}
          </ThemedView>
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
  chartTitle: {
    marginBottom: Spacing.one,
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
  tableRowLast: {
    borderBottomWidth: 0,
  },
  cell: {
    flex: 1,
    gap: 2,
  },
  cellRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
});
