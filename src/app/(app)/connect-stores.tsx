import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarketplaceConnectCard } from '@/components/onboarding-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useSupportedMarketplaces } from '@/hooks/use-supported-marketplaces';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, getDarazAuthorizeUrl, type Marketplace } from '@/lib/api';

export default function ConnectStoresScreen() {
  const theme = useTheme();
  const { accessToken } = useAuth();
  const { marketplaces, isLoading, error, refetch } = useSupportedMarketplaces();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Connected stores first, so a merchant sees what's already synced before
  // what's still available to connect.
  const sortedMarketplaces = useMemo(
    () => [...marketplaces].sort((a, b) => Number(b.is_connected ?? false) - Number(a.is_connected ?? false)),
    [marketplaces],
  );

  async function handleConnect(marketplace: Marketplace) {
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

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
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
});
