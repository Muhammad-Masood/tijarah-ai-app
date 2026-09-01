import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FinanceNavItem = {
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  route: string;
  tint: string;
};

const financeItems: FinanceNavItem[] = [
  {
    title: 'Dashboard',
    description: 'Overview of revenue, profit, fees and cash flow',
    icon: 'view-dashboard-outline',
    route: '/finance-dashboard',
    tint: '#3B82F6',
  },
  {
    title: 'Transactions',
    description: 'Browse and filter all Daraz transactions',
    icon: 'receipt-text-outline',
    route: '/finance-transactions',
    tint: '#10B981',
  },
  {
    title: 'Payouts',
    description: 'Track payout statements and status',
    icon: 'bank-transfer',
    route: '/finance-payouts',
    tint: '#F59E0B',
  },
  {
    title: 'Fee Breakdown',
    description: 'Commission, shipping, penalties and discounts',
    icon: 'receipt-outline',
    route: '/finance-fees',
    tint: '#EF4444',
  },
  {
    title: 'Profit & Loss',
    description: 'Revenue vs costs with margin analysis',
    icon: 'chart-timeline-variant',
    route: '/finance-profit',
    tint: '#059669',
  },
  {
    title: 'Cash Flow',
    description: 'Daily inflow and outflow trends',
    icon: 'chart-areaspline',
    route: '/finance-cashflow',
    tint: '#6366F1',
  },
];

export default function FinanceScreen() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          <ThemedText type="headlineMd">Finance</ThemedText>
          <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.subtitle}>
            Daraz seller financial analytics and insights
          </ThemedText>

          <View style={styles.grid}>
            {financeItems.map((item) => (
              <Pressable
                key={item.title}
                onPress={() => router.push(item.route as never)}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <View style={[styles.iconWrap, { backgroundColor: item.tint + '18' }]}>
                  <MaterialCommunityIcons name={item.icon} size={24} color={item.tint} />
                </View>
                <ThemedText type="bodyLg" style={styles.cardTitle}>
                  {item.title}
                </ThemedText>
                <ThemedText type="bodySm" themeColor="textSecondary" numberOfLines={2}>
                  {item.description}
                </ThemedText>
              </Pressable>
            ))}
          </View>
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
  subtitle: {
    marginTop: -Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    marginTop: Spacing.one,
  },
});
