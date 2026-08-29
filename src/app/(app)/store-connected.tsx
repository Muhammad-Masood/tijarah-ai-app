import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChannelBadge, SyncStatusPill, Tag } from '@/components/onboarding-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Channels, isChannelId } from '@/constants/channels';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SYNC_TAGS = ['Products', 'Orders', 'Inventory', 'Fees & Reviews'];

export default function StoreConnectedScreen() {
  const theme = useTheme();
  const { platform } = useLocalSearchParams<{ platform?: string }>();
  const channelId = isChannelId(platform) ? platform : 'shopify';
  const channel = Channels[channelId];

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          <View style={styles.spacer} />

          <View style={[styles.successIcon, { backgroundColor: theme.success }]}>
            <ThemedText style={styles.successCheck} themeColor="onPrimary">
              ✓
            </ThemedText>
          </View>

          <View style={styles.badgeBlock}>
            <ChannelBadge channelId={channelId} />
            <ThemedText type="headlineSm">{channel.name}</ThemedText>
            <SyncStatusPill label="Connected · Just now" tone="success" />
          </View>

          <ThemedText type="headlineMd" style={styles.heading}>
            {channel.name} Connected
          </ThemedText>

          <ThemedText type="bodyLg" themeColor="textSecondary" style={styles.body}>
            We&apos;ll now import your products, orders, inventory, and fees. This usually takes a
            few minutes — you can keep using the app while it runs in the background.
          </ThemedText>

          <View style={styles.tagRow}>
            {SYNC_TAGS.map((label) => (
              <Tag key={label} label={label} />
            ))}
          </View>

          <View style={styles.spacer} />

          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              { backgroundColor: theme.primary },
              pressed && styles.pressed,
            ]}
            onPress={() => router.replace('/')}>
            <ThemedText type="bodyLg" themeColor="onPrimary" style={styles.ctaLabel}>
              Continue to Data Import
            </ThemedText>
          </Pressable>

          <Pressable
            style={styles.secondaryRow}
            onPress={() => router.replace('/connect-stores')}
            hitSlop={8}>
            <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.secondaryText}>
              Connect another store
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
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  spacer: {
    flexGrow: 1,
    minHeight: Spacing.four,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  successCheck: {
    fontSize: 28,
    fontWeight: '700',
  },
  badgeBlock: {
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  heading: {
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  body: {
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  ctaButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.DEFAULT,
    paddingVertical: Spacing.three,
    marginBottom: Spacing.three,
  },
  ctaLabel: {
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
  secondaryRow: {
    alignSelf: 'center',
  },
  secondaryText: {
    textDecorationLine: 'underline',
  },
});
