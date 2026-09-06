import { Image } from 'expo-image';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SegmentedTabs } from '@/components/segmented-tabs';
import {
  FinanceColors,
  FinanceEmptyState,
  FinanceErrorState,
  formatPKR,
} from '@/components/finance-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useDarazProducts } from '@/hooks/use-daraz-products';
import { useExpenses } from '@/hooks/use-expenses';
import { useShopifyProducts } from '@/hooks/use-shopify-products';
import { useTheme } from '@/hooks/use-theme';
import type { ProductExpenseRead } from '@/lib/api';

type PlatformFilter = 'all' | 'daraz' | 'shopify';

export default function ExpensesScreen() {
  const theme = useTheme();
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');

  const params = useMemo(
    () => ({ platform: platformFilter === 'all' ? undefined : platformFilter }),
    [platformFilter],
  );
  const { expenses, isLoading, error, refetch, removeExpense } = useExpenses(params);

  // Build a sku_id → image lookup from both marketplace catalogs
  const { products: darazProducts } = useDarazProducts();
  const { products: shopifyProducts } = useShopifyProducts();
  const productImageMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of darazProducts) {
      if (p.id && p.image) map.set(p.id, p.image);
    }
    for (const p of shopifyProducts) {
      if (p.id && p.image) map.set(p.id, p.image);
    }
    return map;
  }, [darazProducts, shopifyProducts]);

  const totalAmount = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  );

  const handleDelete = useCallback(
    (expense: ProductExpenseRead) => {
      Alert.alert(
        'Delete Expense',
        `Remove "${expense.category}" (${formatPKR(expense.amount)})?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => removeExpense(expense.id).catch(() => {}),
          },
        ],
      );
    },
    [removeExpense],
  );

  if (error) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
          <FinanceErrorState error={error} onRetry={refetch} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.headerArea}>
          <View style={styles.headerTopRow}>
            <ThemedText type="headlineMd">Expenses</ThemedText>
            <Pressable
              onPress={() => router.push('/expense-form' as never)}
              style={[styles.addButton, { backgroundColor: theme.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Add expense">
              <MaterialCommunityIcons name="plus" size={18} color={theme.onPrimary} />
              <ThemedText type="labelMd" style={{ color: theme.onPrimary }}>
                Add
              </ThemedText>
            </Pressable>
          </View>

          {/* Total summary */}
          <View style={[styles.totalCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.border }]}>
            <View style={styles.totalLabel}>
              <MaterialCommunityIcons name="calculator" size={18} color={FinanceColors.fees} />
              <ThemedText type="bodySm" themeColor="textSecondary">
                Total Expenses
              </ThemedText>
            </View>
            <ThemedText type="headlineSm" style={{ color: FinanceColors.fees }}>
              {formatPKR(totalAmount)}
            </ThemedText>
          </View>

          <SegmentedTabs
            options={[
              { value: 'all', label: 'All' },
              { value: 'daraz', label: 'Daraz' },
              { value: 'shopify', label: 'Shopify' },
            ]}
            value={platformFilter}
            onChange={(v) => setPlatformFilter(v as PlatformFilter)}
          />
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ThemedText type="bodyMd" themeColor="textSecondary">
              Loading expenses...
            </ThemedText>
          </View>
        ) : expenses.length === 0 ? (
          <FinanceEmptyState message="No expenses recorded yet. Tap Add to track product costs." />
        ) : (
          <FlatList
            data={expenses}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  router.push(`/expense-form?id=${item.id}` as never)
                }
                onLongPress={() => handleDelete(item)}
                style={[styles.row, { borderBottomColor: theme.border }]}>
                <View style={[styles.thumbnail, { backgroundColor: theme.backgroundElement }]}>
                  {productImageMap.get(item.sku_id) ? (
                    <Image
                      source={{ uri: productImageMap.get(item.sku_id) }}
                      style={styles.thumbnailImage}
                      contentFit="cover"
                    />
                  ) : (
                    <MaterialCommunityIcons name="image-outline" size={20} color={theme.textSecondary} />
                  )}
                </View>
                <View style={styles.rowContent}>
                  <View style={styles.rowTop}>
                    <ThemedText type="bodyMd" numberOfLines={1} style={styles.rowTitle}>
                      {item.category}
                    </ThemedText>
                    <ThemedText type="bodyMd" style={{ color: FinanceColors.fees }}>
                      {formatPKR(item.amount)}
                    </ThemedText>
                  </View>
                  <View style={styles.rowBottom}>
                    <ThemedText type="bodySm" themeColor="textSecondary" numberOfLines={1}>
                      SKU: {item.sku_id}
                    </ThemedText>
                    <View style={[styles.platformBadge, { backgroundColor: theme.surfaceContainerHigh }]}>
                      <ThemedText type="bodySm" style={{ color: theme.onSurfaceVariant }}>
                        {item.platform}
                      </ThemedText>
                    </View>
                  </View>
                  {item.description ? (
                    <ThemedText
                      type="bodySm"
                      themeColor="textSecondary"
                      numberOfLines={1}
                      style={styles.description}>
                      {item.description}
                    </ThemedText>
                  ) : null}
                </View>
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
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
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
  },
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  totalLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    borderBottomWidth: 1,
    paddingVertical: Spacing.three,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  rowContent: {
    flex: 1,
    gap: Spacing.one,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTitle: {
    flex: 1,
    marginRight: Spacing.two,
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  platformBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  description: {
    marginTop: 2,
  },
});
