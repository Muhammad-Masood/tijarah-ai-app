import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChannelConnectCard } from '@/components/onboarding-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChannelOrder } from '@/constants/channels';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function ConnectStoresScreen() {
  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          <View style={styles.topRow}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <ThemedText type="headlineSm">←</ThemedText>
            </Pressable>
            <ThemedText type="labelMd" themeColor="textSecondary">
              STEP 4 OF 7
            </ThemedText>
          </View>

          <View style={styles.headerBlock}>
            <ThemedText type="displayLgMobile">Connect Your Stores</ThemedText>
            <ThemedText type="bodyLg" themeColor="textSecondary">
              Tijarah AI will securely sync your products, orders, inventory, and fees. You can
              connect more stores anytime.
            </ThemedText>
          </View>

          <View style={styles.cardList}>
            {ChannelOrder.map((channelId) => (
              <ChannelConnectCard
                key={channelId}
                channelId={channelId}
                onConnect={() =>
                  router.push({ pathname: '/store-connecting', params: { platform: channelId } })
                }
              />
            ))}
          </View>

          <View style={styles.comingSoonRow}>
            <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.comingSoonText}>
              More channels coming soon
            </ThemedText>
          </View>

          <ThemedText type="bodySm" themeColor="textSecondary" style={styles.trustLine}>
            We only request the access needed to read your store data. No changes are made
            without your approval.
          </ThemedText>

          <Pressable style={styles.skipRow} onPress={() => router.replace('/(tabs)')} hitSlop={8}>
            <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.skipText}>
              Skip for now
            </ThemedText>
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
