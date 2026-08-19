import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

export default function DashboardScreen() {
  const theme = useTheme();
  const { session, signOut } = useAuth();

  if (!session) return null;

  const { full_name, email, business_name: businessName } = session;

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <ThemedText type="bodyMd" themeColor="textSecondary">
                Welcome back
              </ThemedText>
              <ThemedText type="headlineMd">{businessName ?? full_name}</ThemedText>
            </View>
            <Pressable onPress={handleSignOut} hitSlop={8}>
              <ThemedText type="bodySm" themeColor="primary" style={styles.signOutText}>
                Sign out
              </ThemedText>
            </Pressable>
          </View>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="labelMd" themeColor="textSecondary">
              ACCOUNT
            </ThemedText>
            <View style={styles.cardRow}>
              <ThemedText type="bodyMd" themeColor="textSecondary">
                Name
              </ThemedText>
              <ThemedText type="bodyMd">{full_name}</ThemedText>
            </View>
            <View style={styles.cardRow}>
              <ThemedText type="bodyMd" themeColor="textSecondary">
                Email
              </ThemedText>
              <ThemedText type="bodyMd">{email}</ThemedText>
            </View>
            {businessName && (
              <View style={styles.cardRow}>
                <ThemedText type="bodyMd" themeColor="textSecondary">
                  Business
                </ThemedText>
                <ThemedText type="bodyMd">{businessName}</ThemedText>
              </View>
            )}
          </ThemedView>

          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              { backgroundColor: theme.primary },
              pressed && styles.pressed,
            ]}
            onPress={() => router.push('/connect-stores')}>
            <ThemedText type="bodyLg" themeColor="onPrimary" style={styles.ctaLabel}>
              Connect a store
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
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerText: {
    gap: Spacing.half,
  },
  signOutText: {
    textDecorationLine: 'underline',
  },
  card: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ctaButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.DEFAULT,
    paddingVertical: Spacing.three,
  },
  ctaLabel: {
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
