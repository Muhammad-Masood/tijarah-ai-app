import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AgentBadge } from '@/components/dashboard-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { notifications } from '@/constants/notifications-mock';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function NotificationsScreen() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ThemedText type="headlineSm">←</ThemedText>
          </Pressable>
          <ThemedText type="headlineSm">Notifications</ThemedText>
          <View style={styles.topRowSpacer} />
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          {notifications.map((notification) => (
            <View
              key={notification.id}
              style={[
                styles.card,
                {
                  borderColor: theme.border,
                  backgroundColor: notification.read ? theme.background : theme.surfaceContainerLowest,
                },
              ]}>
              <View style={styles.cardTopRow}>
                <AgentBadge agentId={notification.agentId} />
                <View style={styles.cardTopRowRight}>
                  {!notification.read && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
                  <ThemedText type="bodySm" themeColor="textSecondary">
                    {notification.timeAgo}
                  </ThemedText>
                </View>
              </View>
              <ThemedText type="bodyLg" style={styles.cardTitle}>
                {notification.title}
              </ThemedText>
              <ThemedText type="bodyMd" themeColor="textSecondary">
                {notification.body}
              </ThemedText>
            </View>
          ))}
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.three,
  },
  topRowSpacer: {
    width: 20,
  },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTopRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardTitle: {
    fontWeight: '600',
  },
});
