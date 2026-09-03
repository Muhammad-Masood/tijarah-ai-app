import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import {
  FinanceChartSkeleton,
  FinanceColors,
  FinanceEmptyState,
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
  const { width } = useWindowDimensions();
  const { payout_id } = useLocalSearchParams<{ payout_id: string }>();
  const { data, isLoading, error, refetch } = useSettlementReconciliation(payout_id ?? null);
  const isWideLayout = width >= 680;

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
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back to payouts">
            <MaterialCommunityIcons name="arrow-left" size={20} color={theme.onSurface} />
            <ThemedText type="bodyMd">Back to Payouts</ThemedText>
          </Pressable>

          {isLoading ? (
            <View style={styles.loadingState} accessibilityLabel="Loading settlement details">
              <FinanceChartSkeleton height={96} />
              <FinanceChartSkeleton height={144} />
              <FinanceChartSkeleton height={220} />
            </View>
          ) : data ? (
            <>
              <View style={styles.headerBlock}>
                <ThemedText type="labelMd" themeColor="primary">SETTLEMENT CHECK</ThemedText>
                <View style={styles.headerRow}>
                  <View style={styles.titleBlock}>
                    <ThemedText type="displayLgMobile">Settlement</ThemedText>
                    <ThemedText type="bodyMd" numberOfLines={1}>{data.payout_id}</ThemedText>
                  </View>
                  <FinanceStatusBadge status={isDiscrepancy ? 'discrepancy' : 'reconciled'} />
                </View>
                {data.payout_date && (
                  <ThemedText type="bodySm" themeColor="textSecondary">
                    Paid on {new Date(data.payout_date).toLocaleDateString()}
                  </ThemedText>
                )}
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

              <View style={styles.sectionIntro}>
                <ThemedText type="headlineSm">Payout reconciliation</ThemedText>
                <ThemedText type="bodySm" themeColor="textSecondary">Compare the platform transfer with the calculated amount.</ThemedText>
              </View>

              <View style={[styles.comparisonRow, !isWideLayout && styles.comparisonStack]}>
                <ThemedView type="surfaceContainerLowest" style={styles.comparisonCard}>
                  <ThemedText type="labelMd" themeColor="textSecondary">DARAZ PAYOUT</ThemedText>
                  <ThemedText type="headlineSm" style={{ color: FinanceColors.primary }}>
                    {formatPKR(data.payout_amount)}
                  </ThemedText>
                </ThemedView>
                <View style={[styles.vsDivider, !isWideLayout && styles.vsDividerStack]}>
                  <ThemedText type="bodySm" themeColor="textSecondary">vs</ThemedText>
                </View>
                <ThemedView type="surfaceContainerLowest" style={styles.comparisonCard}>
                  <ThemedText type="labelMd" themeColor="textSecondary">CALCULATED PAYOUT</ThemedText>
                  <ThemedText
                    type="headlineSm"
                    style={{ color: isDiscrepancy ? FinanceColors.fees : FinanceColors.profit }}>
                    {formatPKR(data.calculated_payout)}
                  </ThemedText>
                </ThemedView>
              </View>

              <ThemedView type="surfaceContainerLowest" style={styles.differenceCard}>
                <View style={styles.differenceRow}>
                  <View style={styles.differenceLabel}>
                    <ThemedText type="bodyMd">Difference</ThemedText>
                    <ThemedText type="bodySm" themeColor="textSecondary">Platform payout minus calculated payout</ThemedText>
                  </View>
                  <ThemedText
                    type="headlineSm"
                    style={{ color: Math.abs(data.difference) < 1 ? FinanceColors.profit : FinanceColors.fees }}>
                    {formatPKR(data.difference)}
                  </ThemedText>
                </View>
              </ThemedView>

              <ThemedView type="surfaceContainerLowest" style={styles.breakdownTable}>
                <View style={styles.cardHeading}>
                  <ThemedText type="bodyLg">Statement breakdown</ThemedText>
                  <ThemedText type="bodySm" themeColor="textSecondary">How the calculated payout is formed.</ThemedText>
                </View>
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

              {data.orders && data.orders.length > 0 && (
                <ThemedView type="surfaceContainerLowest" style={styles.breakdownTable}>
                  <View style={styles.cardHeading}>
                    <ThemedText type="bodyLg">Order details</ThemedText>
                    <ThemedText type="bodySm" themeColor="textSecondary">{data.orders.length} orders in this statement.</ThemedText>
                  </View>
                  <View style={styles.orderHeader}>
                    <ThemedText type="labelMd" themeColor="textSecondary">ORDER</ThemedText>
                    <ThemedText type="labelMd" themeColor="textSecondary">VALUE</ThemedText>
                    <ThemedText type="labelMd" themeColor="textSecondary">FEES</ThemedText>
                    <ThemedText type="labelMd" themeColor="textSecondary">NET</ThemedText>
                  </View>
                  {data.orders.map((order, i) => (
                    <View key={order.order_no} style={[styles.orderRow, { borderBottomColor: theme.border }, i === data.orders.length - 1 && styles.orderRowLast]}>
                      <ThemedText type="bodySm" numberOfLines={1} style={styles.orderId}>#{order.order_no}</ThemedText>
                      <ThemedText type="bodySm" numberOfLines={1} style={[styles.orderAmount, { color: FinanceColors.revenue }]}>{formatPKR(order.order_value)}</ThemedText>
                      <ThemedText type="bodySm" numberOfLines={1} style={[styles.orderAmount, { color: FinanceColors.fees }]}>{formatPKR(order.fees)}</ThemedText>
                      <ThemedText type="bodySm" numberOfLines={1} style={[styles.orderAmount, styles.orderNet]}>{formatPKR(order.net)}</ThemedText>
                    </View>
                  ))}
                </ThemedView>
              )}
            </>
          ) : (
            <FinanceEmptyState message="No settlement details are available for this payout." />
          )}
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
    gap: Spacing.five,
  },
  loadingState: {
    gap: Spacing.four,
  },
  headerBlock: {
    gap: Spacing.two,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  sectionIntro: {
    gap: Spacing.one,
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
  comparisonStack: {
    flexDirection: 'column',
    alignItems: 'stretch',
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
  vsDividerStack: {
    alignItems: 'center',
    paddingVertical: 0,
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
  differenceLabel: {
    flex: 1,
    gap: Spacing.one,
  },
  breakdownTable: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardHeading: {
    gap: Spacing.one,
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
  orderRowLast: {
    borderBottomWidth: 0,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.one,
  },
  orderId: {
    width: '22%',
  },
  orderAmount: {
    width: '26%',
    textAlign: 'right',
  },
  orderNet: {
    fontWeight: '600',
  },
});
