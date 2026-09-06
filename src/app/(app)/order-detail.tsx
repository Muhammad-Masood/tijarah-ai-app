import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, getDarazOrderById, getMarketplaceConnections, getShopifyOrderById, type DarazOrder, type ShopifyOrder } from '@/lib/api';

function isDarazOrder(order: ShopifyOrder | DarazOrder): order is DarazOrder { return 'order_id' in order; }
function formatDate(value?: string | null) { if (!value) return 'Date unavailable'; const normalized = value.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/, '$1T$2$3:$4'); const date = new Date(normalized); return Number.isNaN(date.getTime()) ? value : date.toLocaleString(); }
function addressText(address?: DarazOrder['address_shipping']) { return address ? [address.first_name, address.last_name, address.address1, address.address2, address.city, address.post_code, address.phone].filter(Boolean).join(', ') : 'No shipping address'; }

export default function OrderDetailScreen() {
  const { id, channel } = useLocalSearchParams<{ id?: string; channel?: string }>();
  const { accessToken } = useAuth();
  const theme = useTheme();
  const [order, setOrder] = useState<ShopifyOrder | DarazOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnectionLoading, setIsConnectionLoading] = useState(true);
  const [channelToken, setChannelToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isDaraz = channel === 'daraz';

  useEffect(() => {
    if (!accessToken || !id) return;
    let cancelled = false;
    getMarketplaceConnections(accessToken)
      .then(async (connections): Promise<ShopifyOrder | DarazOrder | undefined> => {
        if (cancelled) return;
        const connection = connections.find(
          (item) => item.marketplace?.slug === (isDaraz ? 'daraz' : 'shopify') && item.encrypted_access_token,
        );
        const token = connection?.encrypted_access_token ?? null;
        setChannelToken(token);
        setIsConnectionLoading(false);
        if (!token) return;
        return isDaraz
          ? getDarazOrderById(accessToken, token, id)
          : getShopifyOrderById(accessToken, token, id);
      })
      .then((value) => {
        if (!cancelled && value) setOrder(value);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load order details.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [accessToken, id, isDaraz]);

  const connectionError = !isConnectionLoading && !channelToken
    ? `Connect ${isDaraz ? 'Daraz' : 'Shopify'} to view this order.`
    : null;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}><Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back"><MaterialCommunityIcons name="arrow-left" size={24} color={theme.onSurface} /></Pressable><ThemedText type="headlineSm">Order details</ThemedText><View style={styles.headerSpacer} /></View>
          {(isConnectionLoading || (isLoading && !!channelToken)) && <View style={styles.loading}><ActivityIndicator /><ThemedText type="bodyMd" themeColor="textSecondary">Loading order...</ThemedText></View>}
          {!isConnectionLoading && (error || connectionError) && <View style={styles.loading}><ThemedText type="bodyMd" themeColor="danger" style={styles.centerText}>{error ?? connectionError}</ThemedText></View>}
          {!isLoading && !error && !connectionError && order && <OrderContent order={order} isDaraz={isDaraz} />}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function OrderContent({ order, isDaraz }: { order: ShopifyOrder | DarazOrder; isDaraz: boolean }) {
  const customer = isDarazOrder(order) ? [order.customer_first_name, order.customer_last_name].filter(Boolean).join(' ') || 'Customer' : order.customer?.displayName ?? order.customer?.email ?? 'Customer';
  const status = isDarazOrder(order) ? order.statuses.join(', ') || 'Processing' : order.displayFulfillmentStatus ?? order.displayFinancialStatus ?? 'Processing';
  return <>
    <View style={styles.titleBlock}><ThemedText type="displayLgMobile">Order {isDarazOrder(order) ? order.order_number ?? order.order_id : order.name}</ThemedText><ThemedText type="bodyMd" themeColor="textSecondary">{customer}</ThemedText><View style={styles.dateBlock}><ThemedText type="bodySm" themeColor="textSecondary">Placed {isDarazOrder(order) ? formatDate(order.created_at) : formatDate(order.createdAt)}</ThemedText><ThemedText type="bodySm" themeColor="textSecondary">Updated {isDarazOrder(order) ? formatDate(order.updated_at) : formatDate(order.updatedAt)}</ThemedText></View></View>
    <View style={styles.summary}><SummaryRow label="Status" value={status} /><SummaryRow label="Payment" value={isDarazOrder(order) ? order.payment_method : order.displayFinancialStatus} /><SummaryRow label="Total" value={isDarazOrder(order) ? order.price ?? 'Unavailable' : `${order.totalAmount ?? 'Unavailable'} ${order.currencyCode ?? ''}`} /></View>
    {isDarazOrder(order) && <><Section title="Shipping address"><ThemedText type="bodyMd" themeColor="textSecondary">{addressText(order.address_shipping)}</ThemedText></Section><Section title="Order notes"><ThemedText type="bodyMd" themeColor="textSecondary">{order.buyer_note || order.remarks || 'No notes'}</ThemedText></Section></>}
    <Section title={`Items (${isDarazOrder(order) ? order.items.length : order.lineItems.length})`}>
      {isDarazOrder(order) ? (
        <View style={styles.items}>{order.items.map((item) => <View key={item.order_item_id} style={styles.item}>
          {item.product_main_image ? <Image source={{ uri: item.product_main_image }} style={styles.productImage} contentFit="cover" /> : <View style={styles.productImagePlaceholder}><MaterialCommunityIcons name="package-variant" size={20} color="#5b6570" /></View>}
          <View style={styles.itemCopy}><ThemedText type="bodyLg">{item.name || item.name_en || 'Product'}</ThemedText><ThemedText type="bodySm" themeColor="textSecondary">{[item.sku, item.variation, item.status, item.tracking_code].filter(Boolean).join(' · ')}</ThemedText></View><ThemedText type="bodyMd">{`${item.paid_price ?? item.item_price ?? '—'} ${item.currency ?? ''}`.trim()}</ThemedText>
        </View>)}</View>
      ) : (
        <View style={styles.items}>{order.lineItems.map((item) => <View key={item.id} style={styles.item}>
          <View style={styles.productImagePlaceholder}><MaterialCommunityIcons name="package-variant" size={20} color="#5b6570" /></View>
          <View style={styles.itemCopy}><ThemedText type="bodyLg">{item.title}</ThemedText><ThemedText type="bodySm" themeColor="textSecondary">Quantity {item.quantity}</ThemedText></View><ThemedText type="bodyMd">{`${item.price ?? '—'} ${item.currency ?? order.currencyCode ?? ''}`.trim()}</ThemedText>
        </View>)}</View>
      )}
    </Section>
  </>;
}
function Section({ title, children }: { title: string; children: ReactNode }) { return <View style={styles.section}><ThemedText type="headlineSm">{title}</ThemedText>{children}</View>; }
function SummaryRow({ label, value }: { label: string; value?: string | null }) { return <View style={styles.summaryRow}><ThemedText type="bodyMd" themeColor="textSecondary">{label}</ThemedText><ThemedText type="bodyMd">{value || 'Unavailable'}</ThemedText></View>; }

const styles = StyleSheet.create({ screen: { flex: 1 }, flex: { flex: 1 }, scrollContent: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.four }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerSpacer: { width: 24 }, titleBlock: { gap: Spacing.one }, dateBlock: { gap: Spacing.half }, summary: { borderWidth: 1, borderColor: '#dde1e6', borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.two }, summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two }, section: { gap: Spacing.two }, items: { gap: Spacing.one }, item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, paddingVertical: Spacing.two, borderBottomWidth: 1, borderBottomColor: '#dde1e6' }, itemCopy: { flex: 1, gap: Spacing.half }, productImage: { width: 52, height: 52, borderRadius: Radius.sm }, productImagePlaceholder: { width: 52, height: 52, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e4e7ea' }, loading: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five }, centerText: { textAlign: 'center' } });
