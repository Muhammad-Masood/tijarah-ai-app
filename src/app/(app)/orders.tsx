import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StoreSelectorSheet, type StoreOption } from '@/components/store-selector-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useDarazAccessToken } from '@/hooks/use-daraz-access-token';
import { useShopifyAccessToken } from '@/hooks/use-shopify-access-token';
import { useSupportedMarketplaces } from '@/hooks/use-supported-marketplaces';
import { useTheme } from '@/hooks/use-theme';
import {
  ApiError,
  getDarazOrders,
  getShopifyOrders,
  type DarazOrder,
  type ShopifyOrder,
} from '@/lib/api';

type Channel = 'shopify' | 'daraz';
type Order = ShopifyOrder | DarazOrder;
type OrderRecord = { order: Order; channel: Channel };
const ordersCache = new Map<Channel, Order[]>();

function isDarazOrder(order: Order): order is DarazOrder {
  return 'order_id' in order;
}

function formatDate(value?: string | null) {
  if (!value) return 'Date unavailable';
  const normalized = value.replace(
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/,
    '$1T$2$3:$4',
  );
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function orderUpdatedDate(order: Order): string | null {
  return isDarazOrder(order) ? order.updated_at ?? null : order.updatedAt ?? null;
}

function orderId(order: Order) {
  return isDarazOrder(order) ? String(order.order_number ?? order.order_id) : order.name;
}

function orderStatus(order: Order) {
  return isDarazOrder(order)
    ? order.statuses[0] ?? 'Processing'
    : order.displayFulfillmentStatus ?? order.displayFinancialStatus ?? 'Processing';
}

function orderCustomer(order: Order) {
  if (isDarazOrder(order)) {
    return (
      [order.customer_first_name, order.customer_last_name].filter(Boolean).join(' ') || 'Customer'
    );
  }
  return order.customer?.displayName ?? order.customer?.email ?? 'Customer';
}

function orderAmount(order: Order) {
  if (isDarazOrder(order)) return order.price ? `PKR ${order.price}` : 'Amount unavailable';
  return order.totalAmount
    ? `${order.totalAmount} ${order.currencyCode ?? ''}`.trim()
    : 'Amount unavailable';
}

function orderImage(order: Order): string | null {
  if (isDarazOrder(order)) return order.items[0]?.product_main_image ?? null;
  const image = order.lineItems[0]?.image;
  return typeof image === 'string'
    ? image
    : image?.url ?? image?.src ?? order.lineItems[0]?.image_url ?? null;
}

function orderDate(order: Order): string | null {
  return isDarazOrder(order) ? order.created_at ?? null : order.createdAt ?? null;
}

function getOrderDate(order: Order): Date | null {
  const raw = orderDate(order);
  if (!raw) return null;
  const normalized = raw.replace(
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/,
    '$1T$2$3:$4',
  );
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthKey(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(value: string): string {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });
}

export default function OrdersScreen() {
  const theme = useTheme();
  const { accessToken } = useAuth();
  const daraz = useDarazAccessToken();
  const shopify = useShopifyAccessToken();
  const {
    marketplaces,
    isLoading: isLoadingMarketplaces,
    error: marketplacesError,
    refetch: refetchMarketplaces,
  } = useSupportedMarketplaces();

  const [selectedStore, setSelectedStore] = useState<StoreOption>('all');
  const [orderTab, setOrderTab] = useState<Channel>('shopify');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [isStorePickerVisible, setIsStorePickerVisible] = useState(false);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const connectedMarketplaces = useMemo(
    () => marketplaces.filter((marketplace) => marketplace.is_connected),
    [marketplaces],
  );

  const selectedMarketplace =
    selectedStore === 'all'
      ? null
      : (connectedMarketplaces.find((marketplace) => marketplace.id === selectedStore) ?? null);

  const activeChannel: Channel | null =
    selectedMarketplace?.slug === 'daraz' || selectedMarketplace?.slug === 'shopify'
      ? selectedMarketplace.slug
      : null;

  const connection = activeChannel === 'shopify' ? shopify : activeChannel === 'daraz' ? daraz : null;
  const isConnectionLoading = activeChannel
    ? connection?.isLoading ?? false
    : daraz.isLoading || shopify.isLoading;

  const channelToken =
    activeChannel === 'shopify'
      ? shopify.shopifyAccessToken
      : activeChannel === 'daraz'
        ? daraz.darazAccessToken
        : null;

  const visibleOrders = useMemo(() => {
    return orders.filter(({ order, channel }) => {
      // When "All Stores" is selected, show orders from every channel.
      const matchesChannel = selectedStore === 'all' || channel === orderTab;
      const matchesMonth =
        selectedMonth === 'all' || monthKey(orderDate(order)) === selectedMonth;

      // Date range filter
      const orderDateObj = getOrderDate(order);
      let matchesDateRange = true;

      if (orderDateObj) {
        if (fromDate) {
          const start = new Date(fromDate);
          start.setHours(0, 0, 0, 0);
          if (orderDateObj < start) matchesDateRange = false;
        }
        if (toDate) {
          const end = new Date(toDate);
          end.setHours(23, 59, 59, 999);
          if (orderDateObj > end) matchesDateRange = false;
        }
      } else if (fromDate || toDate) {
        matchesDateRange = false;
      }

      return matchesChannel && matchesMonth && matchesDateRange;
    });
  }, [orderTab, orders, selectedMonth, fromDate, toDate, selectedStore]);

  const monthOptions = useMemo(
    () =>
      Array.from(
        new Set(
          orders
            .filter(({ channel }) => selectedStore === 'all' || channel === orderTab)
            .map(({ order }) => monthKey(orderDate(order)))
            .filter(Boolean) as string[],
        ),
      ).sort().reverse(),
    [orderTab, orders, selectedStore],
  );

  useEffect(() => {
    if (!accessToken || isConnectionLoading) return;

    const requests: Promise<OrderRecord[]>[] = [];

    if ((!activeChannel || activeChannel === 'shopify') && shopify.shopifyAccessToken) {
      requests.push(
        getShopifyOrders(accessToken, shopify.shopifyAccessToken).then((items) => {
          ordersCache.set('shopify', items);
          return items.map((order) => ({ order, channel: 'shopify' as const }));
        }),
      );
    }

    if ((!activeChannel || activeChannel === 'daraz') && daraz.darazAccessToken) {
      requests.push(
        getDarazOrders(accessToken, daraz.darazAccessToken).then((response) => {
          ordersCache.set('daraz', response.orders);
          return response.orders.map((order) => ({ order, channel: 'daraz' as const }));
        }),
      );
    }

    if (requests.length === 0) return;

    let cancelled = false;

    Promise.all(requests)
      .then((results) => {
        if (cancelled) return;
        setOrders(results.flat());
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Could not load orders.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    activeChannel,
    channelToken,
    daraz.darazAccessToken,
    daraz.isLoading,
    isConnectionLoading,
    reloadKey,
    shopify.isLoading,
    shopify.shopifyAccessToken,
  ]);

  function selectStore(value: StoreOption) {
    setSelectedStore(value);
    setError(null);
    setSelectedMonth('all');
    setFromDate(null);
    setToDate(null);

    const marketplace = connectedMarketplaces.find((item) => item.id === value);
    const nextChannel =
      marketplace?.slug === 'shopify' || marketplace?.slug === 'daraz' ? marketplace.slug : null;

    setOrderTab(nextChannel ?? 'shopify');

    const cachedOrders = nextChannel
      ? (ordersCache.get(nextChannel) ?? []).map(
          (order): OrderRecord => ({ order, channel: nextChannel }),
        )
      : (['shopify', 'daraz'] as Channel[]).flatMap((channel) =>
          (ordersCache.get(channel) ?? []).map(
            (order): OrderRecord => ({ order, channel }),
          ),
        );

    setOrders(cachedOrders);
    setIsLoading(cachedOrders.length === 0);
    setIsStorePickerVisible(false);
  }

  function clearDateRange() {
    setFromDate(null);
    setToDate(null);
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => setReloadKey((key) => key + 1)}
              tintColor={theme.primary}
            />
          }>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back">
              <MaterialCommunityIcons name="arrow-left" size={24} color={theme.onSurface} />
            </Pressable>

            <ThemedText type="headlineSm">Orders</ThemedText>

            <Pressable
              onPress={() => setIsStorePickerVisible(true)}
              style={styles.storeSelector}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Select store">
              {selectedMarketplace && (
                <View style={[styles.storeSelectorLogo, { backgroundColor: theme.primaryContainer }]}>
                  <Image
                    source={{ uri: selectedMarketplace.logo_url }}
                    style={styles.storeSelectorLogoImage}
                    contentFit="contain"
                  />
                </View>
              )}
              <ThemedText type="bodySm" themeColor="textSecondary" style={styles.storeSelectorLabel}>
                {selectedMarketplace?.name ?? 'All Stores'}
              </ThemedText>
              <MaterialCommunityIcons name="chevron-down" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>

          {/* Heading */}
          <View style={styles.headingBlock}>
            <ThemedText type="displayLgMobile">Order center</ThemedText>
            <ThemedText type="bodyMd" themeColor="textSecondary">
              Review orders from each connected sales channel.
            </ThemedText>
          </View>

          {/* Month filter */}
          {orders.length > 0 && monthOptions.length > 0 && (
            <View style={styles.monthFilter}>
              <ThemedText type="labelMd" themeColor="textSecondary">
                MONTH
              </ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.monthOptions}>
                <Pressable
                  onPress={() => setSelectedMonth('all')}
                  style={[
                    styles.monthChip,
                    {
                      borderColor: selectedMonth === 'all' ? theme.primary : theme.border,
                      backgroundColor:
                        selectedMonth === 'all'
                          ? theme.primaryContainer
                          : theme.surfaceContainerLowest,
                    },
                  ]}>
                  <ThemedText
                    type="bodySm"
                    themeColor={selectedMonth === 'all' ? 'primary' : 'textSecondary'}>
                    All time
                  </ThemedText>
                </Pressable>

                {monthOptions.map((month) => (
                  <Pressable
                    key={month}
                    onPress={() => setSelectedMonth(month)}
                    style={[
                      styles.monthChip,
                      {
                        borderColor: selectedMonth === month ? theme.primary : theme.border,
                        backgroundColor:
                          selectedMonth === month
                            ? theme.primaryContainer
                            : theme.surfaceContainerLowest,
                      },
                    ]}>
                    <ThemedText
                      type="bodySm"
                      themeColor={selectedMonth === month ? 'primary' : 'textSecondary'}>
                      {monthLabel(month)}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Date range filter */}
          <View style={styles.dateRangeFilter}>
            <ThemedText type="labelMd" themeColor="textSecondary">
              DATE RANGE
            </ThemedText>

            <View style={styles.dateRangeRow}>
              {/* From date */}
              <Pressable
                onPress={() => setShowFromPicker(true)}
                style={[
                  styles.dateChip,
                  {
                    borderColor: fromDate ? theme.primary : theme.border,
                    backgroundColor: fromDate
                      ? theme.primaryContainer
                      : theme.surfaceContainerLowest,
                  },
                ]}>
                <MaterialCommunityIcons
                  name="calendar-start"
                  size={16}
                  color={fromDate ? theme.primary : theme.textSecondary}
                />
                <ThemedText
                  type="bodySm"
                  themeColor={fromDate ? 'primary' : 'textSecondary'}>
                  {fromDate ? fromDate.toLocaleDateString() : 'From'}
                </ThemedText>
              </Pressable>

              <ThemedText type="bodySm" themeColor="textSecondary">
                →
              </ThemedText>

              {/* To date */}
              <Pressable
                onPress={() => setShowToPicker(true)}
                style={[
                  styles.dateChip,
                  {
                    borderColor: toDate ? theme.primary : theme.border,
                    backgroundColor: toDate
                      ? theme.primaryContainer
                      : theme.surfaceContainerLowest,
                  },
                ]}>
                <MaterialCommunityIcons
                  name="calendar-end"
                  size={16}
                  color={toDate ? theme.primary : theme.textSecondary}
                />
                <ThemedText
                  type="bodySm"
                  themeColor={toDate ? 'primary' : 'textSecondary'}>
                  {toDate ? toDate.toLocaleDateString() : 'To'}
                </ThemedText>
              </Pressable>

              {/* Clear button */}
              {(fromDate || toDate) && (
                <Pressable onPress={clearDateRange} hitSlop={8}>
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={20}
                    color={theme.textSecondary}
                  />
                </Pressable>
              )}
            </View>
          </View>

          {/* Empty / error / loading states */}
          {selectedStore === 'all' && visibleOrders.length === 0 && !isLoading && (
            <View
              style={[
                styles.stateCard,
                { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest },
              ]}>
              <MaterialCommunityIcons name="store-outline" size={28} color={theme.primary} />
              <ThemedText type="bodyLg">No orders in this view</ThemedText>
              <ThemedText type="bodySm" themeColor="textSecondary" style={styles.centerText}>
                Try another store tab, month, or date range.
              </ThemedText>
            </View>
          )}

          {connection && !isConnectionLoading && !channelToken && activeChannel && (
            <View
              style={[
                styles.stateCard,
                { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest },
              ]}>
              <MaterialCommunityIcons name="store-off-outline" size={28} color={theme.textSecondary} />
              <ThemedText type="bodyLg">
                {activeChannel === 'shopify' ? 'Shopify is not connected' : 'Daraz is not connected'}
              </ThemedText>
              <ThemedText type="bodySm" themeColor="textSecondary" style={styles.centerText}>
                Connect this channel to view its orders.
              </ThemedText>
              <Pressable onPress={() => router.push('/connect-stores')}>
                <ThemedText type="bodyMd" themeColor="primary">
                  Connect store
                </ThemedText>
              </Pressable>
            </View>
          )}

          {isLoading && orders.length === 0 && (
            <View style={styles.loading}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText type="bodyMd" themeColor="textSecondary">
                Loading {activeChannel ? `${activeChannel} orders` : 'orders from connected stores'}...
              </ThemedText>
            </View>
          )}

          {isLoading && orders.length > 0 && (
            <View style={styles.updatingRow}>
              <ActivityIndicator size="small" color={theme.primary} />
              <ThemedText type="bodySm" themeColor="textSecondary">
                Updating orders...
              </ThemedText>
            </View>
          )}

          {error && (
            <View style={styles.loading}>
              <ThemedText type="bodyMd" themeColor="danger" style={styles.centerText}>
                {error}
              </ThemedText>
              <Pressable onPress={() => setReloadKey((key) => key + 1)}>
                <ThemedText type="bodyMd" themeColor="primary">
                  Try again
                </ThemedText>
              </Pressable>
            </View>
          )}

          {!isLoading && !error && visibleOrders.length === 0 && selectedMarketplace && (
            <View style={styles.loading}>
              <MaterialCommunityIcons
                name="clipboard-text-outline"
                size={32}
                color={theme.textSecondary}
              />
              <ThemedText type="bodyMd" themeColor="textSecondary">
                No orders found.
              </ThemedText>
            </View>
          )}

          {/* Order list */}
          {visibleOrders.length > 0 && (
            <View style={styles.orderList}>
              {visibleOrders.map(({ order, channel: orderChannel }) => (
                <Pressable
                  key={`${orderChannel}-${isDarazOrder(order) ? String(order.order_id) : order.id}`}
                  onPress={() =>
                    router.push({
                      pathname: '/order-detail',
                      params: {
                        id: isDarazOrder(order) ? String(order.order_id) : order.id,
                        channel: orderChannel,
                      },
                    })
                  }
                  style={({ pressed }) => [
                    styles.orderRow,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.surfaceContainerLowest,
                    },
                    pressed && styles.pressed,
                  ]}>
                  {orderImage(order) ? (
                    <Image
                      source={{ uri: orderImage(order) ?? undefined }}
                      style={styles.orderImage}
                      contentFit="cover"
                      transition={150}
                    />
                  ) : (
                    <View style={[styles.orderIcon, { backgroundColor: theme.primaryContainer }]}>
                      <MaterialCommunityIcons
                        name="package-variant-closed"
                        size={22}
                        color={theme.primary}
                      />
                    </View>
                  )}

                  <View style={styles.orderCopy}>
                    <ThemedText type="bodyLg" numberOfLines={1}>
                      Order {orderId(order)}
                    </ThemedText>
                    <ThemedText type="bodySm" themeColor="textSecondary" numberOfLines={1}>
                      {orderCustomer(order)}
                    </ThemedText>

                    <View style={styles.orderMeta}>
                      <View style={styles.dateCopy}>
                        <ThemedText type="bodySm" themeColor="textSecondary" numberOfLines={1}>
                          Placed {formatDate(isDarazOrder(order) ? order.created_at : order.createdAt)}
                        </ThemedText>
                      </View>

                      <View style={[styles.statusBadge, { backgroundColor: theme.primaryContainer }]}>
                        <ThemedText type="labelMd" themeColor="primary" numberOfLines={1}>
                          {orderStatus(order)}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  <View style={styles.orderAmount}>
                    <ThemedText type="bodyMd" numberOfLines={2} style={styles.amountText}>
                      {orderAmount(order)}
                    </ThemedText>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color={theme.textSecondary}
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Date pickers */}
      {showFromPicker && (
        <DateTimePicker
          value={fromDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            if (Platform.OS === 'android') setShowFromPicker(false);
            if (selected) setFromDate(selected);
          }}
        />
      )}

      {showToPicker && (
        <DateTimePicker
          value={toDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            if (Platform.OS === 'android') setShowToPicker(false);
            if (selected) setToDate(selected);
          }}
        />
      )}

      <StoreSelectorSheet
        visible={isStorePickerVisible}
        selected={selectedStore}
        marketplaces={connectedMarketplaces}
        isLoading={isLoadingMarketplaces}
        error={marketplacesError}
        onRetry={refetchMarketplaces}
        onClose={() => setIsStorePickerVisible(false)}
        onSelect={selectStore}
      />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    maxWidth: 180,
  },
  storeSelectorLabel: { maxWidth: 120 },
  storeSelectorLogo: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeSelectorLogoImage: { width: 20, height: 20 },
  headingBlock: { gap: Spacing.one },

  // Month filter
  monthFilter: { gap: Spacing.one },
  monthOptions: { gap: Spacing.one, paddingRight: Spacing.two },
  monthChip: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },

  // Date range filter
  dateRangeFilter: { gap: Spacing.one },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexWrap: 'wrap',
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },

  // Order list
  orderList: { gap: Spacing.two },
  orderRow: {
    minHeight: 76,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  orderIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e1f2ee',
  },
  orderImage: { width: 42, height: 42, borderRadius: Radius.sm },
  orderCopy: { flex: 1, minWidth: 0, gap: Spacing.half },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minWidth: 0,
  },
  dateCopy: { flex: 1, minWidth: 0, gap: Spacing.half },
  statusBadge: {
    maxWidth: 110,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.half,
  },
  orderAmount: {
    width: 92,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    gap: Spacing.one,
  },
  amountText: { textAlign: 'right' },

  // States
  stateCard: {
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.four,
  },
  loading: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  updatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  centerText: { textAlign: 'center' },
  pressed: { opacity: 0.75 },
});