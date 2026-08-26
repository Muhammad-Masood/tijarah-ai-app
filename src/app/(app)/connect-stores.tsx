import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarketplaceConnectCard } from '@/components/onboarding-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useSupportedMarketplaces } from '@/hooks/use-supported-marketplaces';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, getDarazAuthorizeUrl, getShopifyAuthorizeUrl, type Marketplace } from '@/lib/api';

export default function ConnectStoresScreen() {
  const theme = useTheme();
  const { accessToken } = useAuth();
  const { marketplaces, isLoading, error, refetch } = useSupportedMarketplaces();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [shopifyPromptMarketplace, setShopifyPromptMarketplace] = useState<Marketplace | null>(null);
  const [shopDomainInput, setShopDomainInput] = useState('');

  // Connected stores first, so a merchant sees what's already synced before
  // what's still available to connect.
  const sortedMarketplaces = useMemo(
    () => [...marketplaces].sort((a, b) => Number(b.is_connected ?? false) - Number(a.is_connected ?? false)),
    [marketplaces],
  );

  async function handleConnect(marketplace: Marketplace) {
    if (marketplace.slug === 'shopify') {
      setShopifyPromptMarketplace(marketplace);
      setShopDomainInput('');
      setConnectError(null);
      return;
    }

    if (marketplace.slug !== 'daraz') {
      router.push({ pathname: '/store-connecting', params: { platform: marketplace.slug } });
      return;
    }
    if (!accessToken) return;

    setConnectError(null);
    setConnectingId(marketplace.id);
    try {
      const authorizeUrl = await getDarazAuthorizeUrl(accessToken);
      // Opens Daraz's OAuth page in an in-app browser. Daraz redirects to the
      // backend-configured web callback (not this app) when the user
      // finishes authorizing, so we just wait for the browser to close and
      // then refetch to pick up the new connection state.
      await WebBrowser.openBrowserAsync(authorizeUrl);
      refetch();
    } catch (err) {
      setConnectError(
        err instanceof ApiError ? err.message : 'Could not start the Daraz connection. Please try again.',
      );
    } finally {
      setConnectingId(null);
    }
  }

  async function submitShopifyDomain() {
    const marketplace = shopifyPromptMarketplace;
    if (!marketplace || !accessToken || connectingId) return;

    const normalizedShopDomain = shopDomainInput
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '');

    if (!normalizedShopDomain) {
      setConnectError('Please enter your Shopify shop domain.');
      return;
    }

    setConnectError(null);
    setConnectingId(marketplace.id);
    try {
      const authorizeUrl = await getShopifyAuthorizeUrl(accessToken, normalizedShopDomain);
      setShopifyPromptMarketplace(null);
      await WebBrowser.openBrowserAsync(authorizeUrl);
      refetch();
    } catch (err) {
      setConnectError(
        err instanceof ApiError ? err.message : 'Could not start the Shopify connection. Please try again.',
      );
    } finally {
      setConnectingId(null);
    }
  }

  const isShopifyConnecting = Boolean(
    shopifyPromptMarketplace && connectingId === shopifyPromptMarketplace.id,
  );

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <Modal
          visible={Boolean(shopifyPromptMarketplace)}
          transparent
          animationType="fade"
          onRequestClose={() => setShopifyPromptMarketplace(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.border }]}>
              <ThemedText type="headlineSm">Connect Shopify</ThemedText>
              <ThemedText type="bodySm" themeColor="textSecondary">
                Enter your store domain (example: mystore.myshopify.com)
              </ThemedText>
              <TextInput
                value={shopDomainInput}
                onChangeText={setShopDomainInput}
                placeholder="mystore.myshopify.com"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isShopifyConnecting}
                keyboardType="url"
                style={[
                  styles.shopInput,
                  { borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceContainer },
                ]}
              />
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setShopifyPromptMarketplace(null)}
                  disabled={isShopifyConnecting}
                  style={[styles.modalButton, { borderColor: theme.border, backgroundColor: theme.surfaceContainer }]}>
                  <ThemedText type="labelMd">Cancel</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => void submitShopifyDomain()}
                  disabled={isShopifyConnecting}
                  style={[styles.modalButton, { backgroundColor: theme.primary }]}>
                  {isShopifyConnecting ? (
                    <ActivityIndicator color={theme.onPrimary} />
                  ) : (
                    <ThemedText type="labelMd" themeColor="onPrimary">
                      Continue
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.primary} />}>
          <View style={styles.topRow}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <ThemedText type="headlineSm">←</ThemedText>
            </Pressable>
          </View>

          <View style={styles.headerBlock}>
            <ThemedText type="displayLgMobile">Connect Your Stores</ThemedText>
            <ThemedText type="bodyLg" themeColor="textSecondary">
              Tijarah AI will securely sync your products, orders, inventory, and fees. You can
              connect more stores anytime.
            </ThemedText>
          </View>

          {isLoading && (
            <View style={styles.statusBlock}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText type="bodyMd" themeColor="textSecondary">
                Loading available marketplaces…
              </ThemedText>
            </View>
          )}

          {!isLoading && error && (
            <View style={styles.statusBlock}>
              <ThemedText type="bodyMd" themeColor="danger" style={styles.centerText}>
                {error}
              </ThemedText>
              <Pressable onPress={refetch} hitSlop={8}>
                <ThemedText type="bodyMd" themeColor="primary" style={styles.retryText}>
                  Try again
                </ThemedText>
              </Pressable>
            </View>
          )}

          {!isLoading && !error && marketplaces.length === 0 && (
            <View style={styles.statusBlock}>
              <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.centerText}>
                No marketplaces are available to connect right now.
              </ThemedText>
            </View>
          )}

          {connectError && (
            <ThemedText type="bodySm" themeColor="danger" style={styles.centerText}>
              {connectError}
            </ThemedText>
          )}

          {!isLoading && !error && marketplaces.length > 0 && (
            <View style={styles.cardList}>
              {sortedMarketplaces.map((marketplace) => (
                <MarketplaceConnectCard
                  key={marketplace.id}
                  marketplace={marketplace}
                  isConnecting={connectingId === marketplace.id}
                  onConnect={() => void handleConnect(marketplace)}
                />
              ))}
            </View>
          )}

          <View style={styles.comingSoonRow}>
            <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.comingSoonText}>
              More channels coming soon
            </ThemedText>
          </View>

          <ThemedText type="bodySm" themeColor="textSecondary" style={styles.trustLine}>
            We only request the access needed to read your store data. No changes are made
            without your approval.
          </ThemedText>

          <Pressable style={styles.skipRow} onPress={() => router.replace('/')} hitSlop={8}>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.four,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBlock: {
    gap: Spacing.two,
  },
  cardList: {
    gap: Spacing.three,
  },
  statusBlock: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  centerText: {
    textAlign: 'center',
  },
  retryText: {
    textDecorationLine: 'underline',
  },
  comingSoonRow: {
    alignItems: 'center',
  },
  comingSoonText: {
    opacity: 0.6,
  },
  trustLine: {
    textAlign: 'center',
  },
  skipRow: {
    alignSelf: 'center',
  },
  skipText: {
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  shopInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  modalButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
