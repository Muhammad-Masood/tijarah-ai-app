import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListRow, ListSection } from '@/components/list-kit';
import { ChannelLogo } from '@/components/onboarding-kit';
import { Avatar, EditableAccountRow, PlanBadge, StaticAccountRow, SubscriptionCard } from '@/components/profile-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChannelOrder } from '@/constants/channels';
import { ManropeFamily, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

// Mock business/subscription data — there is no backend field for these yet
// (MerchantRead only has full_name/business_name/email/role/phone_number).
// Shaped as a plain object so a future pass can swap it for a real fetch.
const BUSINESS_DETAILS = {
  businessType: 'Fashion & Apparel',
  primaryMarket: 'Pakistan',
  currency: 'PKR',
};

const SUBSCRIPTION = {
  planName: 'Growth Plan',
  renewalDate: 'September 18, 2026',
};

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function ProfileScreen() {
  const theme = useTheme();
  const { session, signOut } = useAuth();
  const merchant = session ?? null;

  // Hooks must run unconditionally on every render, so state is seeded from
  // `merchant` (which may be null) before the render-time bail-out below.
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [fullName, setFullName] = useState(merchant?.full_name ?? '');
  const [businessName, setBusinessName] = useState(merchant?.business_name ?? '');
  const [email, setEmail] = useState(merchant?.email ?? '');
  const [phone, setPhone] = useState(merchant?.phone_number ?? 'Add phone number');

  // Session is still hydrating from SecureStore, or there's no signed-in
  // user — nothing meaningful to show here.
  if (!merchant) return null;

  function handleSignOut() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          <View style={styles.topRow}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <ThemedText type="headlineSm">←</ThemedText>
            </Pressable>
            <ThemedText type="headlineSm">Profile</ThemedText>
            <Pressable onPress={() => setIsEditingHeader((editing) => !editing)} hitSlop={8}>
              <ThemedText type="headlineSm" themeColor={isEditingHeader ? 'primary' : 'text'}>
                {isEditingHeader ? '✓' : '✎'}
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.identityBlock}>
            <Avatar name={fullName} />
            {isEditingHeader ? (
              <View style={styles.identityEditGroup}>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Full name"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.identityInput, { borderColor: theme.border, color: theme.text }]}
                />
                <TextInput
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="Business name"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.identityInput, { borderColor: theme.border, color: theme.text }]}
                />
              </View>
            ) : (
              <View style={styles.identityTextGroup}>
                <ThemedText type="bodyLg" style={styles.fullName}>
                  {fullName}
                </ThemedText>
                <ThemedText type="bodyMd" themeColor="textSecondary">
                  {businessName}
                </ThemedText>
              </View>
            )}
            <PlanBadge label={SUBSCRIPTION.planName} />
          </View>

          <View style={styles.subsection}>
            <ThemedText type="labelMd" themeColor="textSecondary">
              ACCOUNT
            </ThemedText>
            <ListSection>
              <EditableAccountRow label="Email" value={email} onSave={setEmail} verified />
              <EditableAccountRow label="Phone number" value={phone} onSave={setPhone} />
              <StaticAccountRow label="Password & security" value="••••••••" isLast />
            </ListSection>
          </View>

          <View style={styles.subsection}>
            <ThemedText type="labelMd" themeColor="textSecondary">
              BUSINESS DETAILS
            </ThemedText>
            <ListSection>
              <ListRow label="Business type" value={BUSINESS_DETAILS.businessType} showChevron={false} />
              <ListRow label="Primary market" value={BUSINESS_DETAILS.primaryMarket} showChevron={false} />
              <ListRow label="Currency" value={BUSINESS_DETAILS.currency} showChevron={false} />
              <Pressable
                onPress={() => router.push('/connect-stores')}
                style={({ pressed }) => [styles.channelsRow, pressed && styles.pressed]}>
                <ThemedText type="bodyMd" style={styles.rowLabel}>
                  Selling channels
                </ThemedText>
                <View style={styles.channelBadges}>
                  {ChannelOrder.map((channelId) => (
                    <ChannelLogo key={channelId} channelId={channelId} size="sm" />
                  ))}
                </View>
                <ThemedText type="bodyLg" themeColor="textSecondary">
                  ›
                </ThemedText>
              </Pressable>
            </ListSection>
          </View>

          <View style={styles.subsection}>
            <ThemedText type="labelMd" themeColor="textSecondary">
              SUBSCRIPTION
            </ThemedText>
            <SubscriptionCard planName={SUBSCRIPTION.planName} renewalDate={SUBSCRIPTION.renewalDate} />
          </View>

          <ListSection>
            <ListRow label="Notifications" />
            <ListRow label="Cost & Margin Settings" />
            <ListRow label="Help & Support" />
            <ListRow label="Terms, Privacy & Legal" isLast />
          </ListSection>

          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.logOutButton,
              { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="bodyLg" themeColor="danger" style={styles.logOutLabel}>
              Log Out
            </ThemedText>
          </Pressable>

          <ThemedText type="bodySm" themeColor="textSecondary" style={styles.versionText}>
            Tijarah AI v{APP_VERSION}
          </ThemedText>
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
  identityBlock: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  identityTextGroup: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  identityEditGroup: {
    width: '100%',
    maxWidth: 280,
    gap: Spacing.two,
  },
  identityInput: {
    borderWidth: 1,
    borderRadius: Radius.DEFAULT,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontFamily: ManropeFamily[400],
    fontSize: 16,
    textAlign: 'center',
  },
  fullName: {
    fontWeight: '600',
  },
  subsection: {
    gap: Spacing.two,
  },
  channelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    minHeight: 52,
  },
  rowLabel: {
    flex: 1,
  },
  channelBadges: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  logOutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.DEFAULT,
    paddingVertical: Spacing.three,
  },
  logOutLabel: {
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
