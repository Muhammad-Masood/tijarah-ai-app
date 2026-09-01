import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { SegmentedTabs } from '@/components/segmented-tabs';
import {
  FinanceColors,
  FinanceEmptyState,
  FinanceErrorState,
  FinanceStatusBadge,
  formatPKR,
} from '@/components/finance-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useFinancialTransactions } from '@/hooks/use-finance-transactions';
import { useTheme } from '@/hooks/use-theme';

type PaidFilter = 'all' | 'paid' | 'unpaid';

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

export default function FinanceTransactionsScreen() {
  const theme = useTheme();
  const [page, setPage] = useState(1);
  const [paidFilter, setPaidFilter] = useState<PaidFilter>('all');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const dates = getDefaultDates();

  const { data, isLoading, error, refetch } = useFinancialTransactions({
    ...dates,
    page,
    pageSize: 50,
  });

  const transactions = data?.data ?? [];

  const filteredTransactions = transactions.filter((tx) => {
    if (paidFilter === 'all') return true;
    if (paidFilter === 'paid') return tx.paid_status?.toLowerCase() === 'paid';
    return tx.paid_status?.toLowerCase() !== 'paid';
  });

  if (error) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
          <FinanceErrorState error={error} onRetry={refetch} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const amountColor = (amount: string) => {
    const num = parseFloat(amount);
    return num >= 0 ? FinanceColors.revenue : FinanceColors.fees;
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    const prefix = num >= 0 ? '+' : '';
    return `${prefix}${formatPKR(num)}`;
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={styles.headerArea}>
          <ThemedText type="headlineMd">Transactions</ThemedText>
          <SegmentedTabs
            options={[
              { value: 'all', label: 'All' },
              { value: 'paid', label: 'Paid' },
              { value: 'unpaid', label: 'Unpaid' },
            ]}
            value={paidFilter}
            onChange={(v) => setPaidFilter(v as PaidFilter)}
          />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ThemedText type="bodyMd" themeColor="textSecondary">Loading transactions...</ThemedText>
          </View>
        ) : filteredTransactions.length === 0 ? (
          <FinanceEmptyState message="No transactions found for this period." />
        ) : (
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item, index) => `${item.transaction_number || 'tx'}-${item.fee_name || ''}-${index}`}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => {
              const isExpanded = expandedRow === index;
              return (
                <Pressable
                  onPress={() => setExpandedRow(isExpanded ? null : index)}
                  style={[styles.row, { borderBottomColor: theme.border }]}>
                  <View style={styles.rowMain}>
                    <View style={styles.rowLeft}>
                      <ThemedText type="bodyMd" numberOfLines={1}>{item.fee_name || 'Transaction'}</ThemedText>
                      <ThemedText type="bodySm" themeColor="textSecondary">
                        {item.transaction_date} · #{item.order_no || '—'}
                      </ThemedText>
                    </View>
                    <View style={styles.rowRight}>
                      <ThemedText type="bodyMd" style={{ color: amountColor(item.amount) }}>
                        {formatAmount(item.amount)}
                      </ThemedText>
                      <FinanceStatusBadge status={item.paid_status || 'pending'} />
                    </View>
                  </View>
                  {isExpanded && (
                    <View style={[styles.detailPanel, { backgroundColor: theme.surfaceContainer }]}>
                      <DetailRow label="Transaction Type" value={item.transaction_type} />
                      <DetailRow label="Statement" value={item.statement} />
                      <DetailRow label="Reference" value={item.reference} />
                      {item.details && <DetailRow label="Details" value={item.details} />}
                      {item.seller_sku && <DetailRow label="Seller SKU" value={item.seller_sku} />}
                      {item.orderItem_status && <DetailRow label="Status" value={item.orderItem_status} />}
                      {item.shipping_provider && <DetailRow label="Shipping" value={item.shipping_provider} />}
                      {item.VAT_in_amount && <DetailRow label="VAT" value={formatPKR(parseFloat(item.VAT_in_amount) || 0)} />}
                      {item.WHT_amount && <DetailRow label="WHT" value={formatPKR(parseFloat(item.WHT_amount) || 0)} />}
                    </View>
                  )}
                </Pressable>
              );
            }}
            ListFooterComponent={
              <View style={styles.pagination}>
                <Pressable
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={[styles.pageButton, { borderColor: theme.border, opacity: page <= 1 ? 0.4 : 1 }]}>
                  <MaterialCommunityIcons name="chevron-left" size={20} color={theme.onSurface} />
                  <ThemedText type="bodySm">Prev</ThemedText>
                </Pressable>
                <ThemedText type="bodySm" themeColor="textSecondary">Page {page}</ThemedText>
                <Pressable
                  onPress={() => setPage((p) => p + 1)}
                  disabled={filteredTransactions.length < 50}
                  style={[styles.pageButton, { borderColor: theme.border, opacity: filteredTransactions.length < 50 ? 0.4 : 1 }]}>
                  <ThemedText type="bodySm">Next</ThemedText>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={theme.onSurface} />
                </Pressable>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <ThemedText type="bodySm" themeColor="textSecondary" style={styles.detailLabel}>{label}</ThemedText>
      <ThemedText type="bodySm" numberOfLines={2}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  headerArea: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.three,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.five,
  },
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  row: {
    borderBottomWidth: 1,
    paddingVertical: Spacing.three,
  },
  rowMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  detailPanel: {
    marginTop: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.DEFAULT,
    gap: Spacing.two,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  detailLabel: {
    minWidth: 100,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.DEFAULT,
    borderWidth: 1,
  },
});
