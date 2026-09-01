import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import {
  FinanceColors,
  FinanceErrorState,
  FinanceStatusBadge,
  formatPKR,
} from '@/components/finance-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useSettlementReconciliation } from '@/hooks/use-finance-settlement';
import { useTheme } from '@/hooks/use-theme';

export default function FinanceSettlementScreen() {
  const theme = useTheme();
  const { payout_id } = useLocalSearchParams<{ payout_id: string }>();
  const { data, isLoading, error, refetch } = useSettlementReconciliation(payout_id ?? null);

  if (error) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
          <FinanceErrorState error={error} onRetry={refetch} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const isDiscrepancy = data?.status === 'discrepancy' || (data && Math.abs(data.difference) >= 1);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          {/* Back button */}
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={theme.onSurface} />
            <ThemedText type="bodyMd">Back to Payouts</ThemedText>
          </Pressable>

          {isLoading ? (
            <ThemedText type="bodyMd" themeColor="textSecondary">Loading settlement details...</ThemedText>
          ) : data ? (
            <>
              {/* Header */}
              <View style={styles.headerRow}>
                <View>
                  <ThemedText type="headlineSm">{data.payout_id}</ThemedText>
                  {data.payout_date && (
                    <ThemedText type="bodySm" themeColor="textSecondary">
                      Paid on {new Date(data.payout_date).toLocaleDateString()}
                    </ThemedText>
                  )}
                </View>
                <FinanceStatusBadge status={isDiscrepancy ? 'discrepancy' : 'reconciled'} />
              </View>

              {/* Discrepancy Warning */}
              {isDiscrepancy && (
                <ThemedView
                  type="errorContainer"
                  style={[styles.warningBanner, { borderLeftColor: FinanceColors.fees }]}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color={FinanceColors.fees} />
                  <View style={styles.warningText}>
                    <ThemedText type="bodyMd" style={{ color: FinanceColors.fees, fontWeight: '600' }}>
                      Discrepancy Detected
                    </ThemedText>
                    <ThemedText type="bodySm" themeColor="textSecondary">
                      Difference of {formatPKR(Math.abs(data.difference))} between Daraz payout and calculated amount.
                    </ThemedText>
                  </View>
                </ThemedView>
              )}

              {/* Comparison Cards */}
              <View style={styles.comparisonRow}>
                <ThemedView type="surfaceContainerLowest" style={styles.comparisonCard}>
                  <ThemedText type="bodySm" themeColor="textSecondary">Daraz Payout</ThemedText>
                  <ThemedText type="headlineSm" style={{ color: FinanceColors.primary }}>
                    {formatPKR(data.payout_amount)}
                  </ThemedText>
                </ThemedView>
                <View style={styles.vsDivider}>
                  <ThemedText type="bodySm" themeColor="textSecondary">vs</ThemedText>
                </View>
                <ThemedView type="surfaceContainerLowest" style={styles.comparisonCard}>
                  <ThemedText type="bodySm" themeColor="textSecondary">Calculated Payout</ThemedText>
                  <ThemedText
                    type="headlineSm"
                    style={{ color: isDiscrepancy ? FinanceColors.fees : FinanceColors.profit }}>
                    {formatPKR(data.calculated_payout)}
                  </ThemedText>
                </ThemedView>
              </View>

              {/* Difference */}
              <ThemedView type="surfaceContainerLowest" style={styles.differenceCard}>
                <View style={styles.differenceRow}>
                  <ThemedText type="bodyMd">Difference</ThemedText>
                  <ThemedText
                    type="headlineSm"
                    style={{ color: Math.abs(data.difference) < 1 ? FinanceColors.profit : FinanceColors.fees }}>
                    {formatPKR(data.difference)}
                  </ThemedText>
                </View>
              </ThemedView>

              {/* Breakdown Table */}
              <ThemedView type="surfaceContainerLowest" style={styles.breakdownTable}>
                <ThemedText type="bodyLg" style={styles.breakdownTitle}>Statement Breakdown</ThemedText>
                <BreakdownRow label="Total Order Value (Item Revenue)" value={formatPKR(data.total_order_value)} color={FinanceColors.revenue} />
                <BreakdownRow label="Total Deductions (Fees)" value={`-${formatPKR(data.total_deductions)}`} color={FinanceColors.fees} />
                <BreakdownRow
                  label="Calculated Payout"
                  value={formatPKR(data.calculated_payout)}
                  color={FinanceColors.primary}
                  isBold
                  isLast
                />
              </ThemedView>

              {/* Orders Table (if any) */}
              {data.orders && data.orders.length > 0 && (
                <ThemedView type="surfaceContainerLowest" style={styles.breakdownTable}>
                  <ThemedText type="bodyLg" style={styles.breakdownTitle}>Order Details</ThemedText>
                  {data.orders.map((order, i) => (
                    <View key={order.order_no} style={[styles.orderRow, { borderBottomColor: theme.border }]}>
                      <ThemedText type="bodySm">#{order.order_no}</ThemedText>
                      <ThemedText type="bodySm" style={{ color: FinanceColors.revenue }}>{formatPKR(order.order_value)}</ThemedText>
                      <ThemedText type="bodySm" style={{ color: FinanceColors.fees }}>{formatPKR(order.fees)}</ThemedText>
                      <ThemedText type="bodySm" style={{ fontWeight: '600' }}>{formatPKR(order.net)}</ThemedText>
                    </View>
                  ))}
                </ThemedView>
              )}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function BreakdownRow({ label, value, color, isBold = false, isLast = false }: {
  label: string;
  value: string;
  color: string;
  isBold?: boolean;
  isLast?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.breakdownRow, !isLast && { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
      <ThemedText type="bodyMd" style={isBold ? { fontWeight: '700' } : undefined}>{label}</ThemedText>
      <ThemedText type="bodyMd" style={{ color, fontWeight: isBold ? '700' : '600' }}>{value}</ThemedText>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderLeftWidth: 4,
  },
  warningText: {
    flex: 1,
    gap: 2,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  comparisonCard: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.one,
  },
  vsDivider: {
    paddingHorizontal: Spacing.one,
  },
  differenceCard: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  differenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownTable: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  breakdownTitle: {
    marginBottom: Spacing.one,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
});
