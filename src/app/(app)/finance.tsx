import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
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
  featured?: boolean;
};

const financeItems: FinanceNavItem[] = [
  {
    title: 'Dashboard',
    description: 'Real-time overview of revenue, profit, and health',
    icon: 'view-dashboard-outline',
    route: '/finance-dashboard',
    tint: '#3B82F6',
    featured: true,
  },
  {
    title: 'Transactions',
    description: 'Detailed ledger and history',
    icon: 'receipt-text-outline',
    route: '/finance-transactions',
    tint: '#10B981',
  },
  {
    title: 'Payouts',
    description: 'Track bank transfers',
    icon: 'bank-transfer',
    route: '/finance-payouts',
    tint: '#F59E0B',
  },
  {
    title: 'Fee Breakdown',
    description: 'Commission and costs',
    icon: 'receipt-outline',
    route: '/finance-fees',
    tint: '#EF4444',
  },
  {
    title: 'Profit & Loss',
    description: 'Margin analysis',
    icon: 'chart-timeline-variant',
    route: '/finance-profit',
    tint: '#059669',
  },
  {
    title: 'Cash Flow',
    description: 'Inflow trends',
    icon: 'chart-areaspline',
    route: '/finance-cashflow',
    tint: '#6366F1',
  },
];

export default function FinanceScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const isWideLayout = width >= 600;
  const containerWidth = Math.min(width, MaxContentWidth) - Spacing.containerMargin * 2;
  const smallCardWidth = (containerWidth - Spacing.three) / 2;
  const featuredItem = financeItems.find((item) => item.featured);
  const secondaryItems = financeItems.filter((item) => !item.featured);

  const renderFinanceCard = (item: FinanceNavItem) => {
    const isFeatured = item.featured === true;

    return (
      <Pressable
        key={item.title}
        onPress={() => router.push(item.route as never)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.title}`}
        accessibilityHint="Opens this finance view"
        style={({ pressed }) => [
          styles.card,
          isFeatured ? styles.featuredCard : styles.supportingCard,
          {
            width: isFeatured || !isWideLayout ? '100%' : smallCardWidth,
            backgroundColor: isFeatured ? theme.primaryContainer : theme.surfaceContainerLowest,
            borderColor: isFeatured ? theme.primary : theme.border,
          },
          pressed && [styles.cardPressed, { borderColor: item.tint }],
        ]}
      >
        <View style={[styles.cardHighlight, { backgroundColor: item.tint }]} />

        <View style={styles.cardTopRow}>
          <View style={[styles.iconContainer, { backgroundColor: item.tint + '15' }]}>
            <MaterialCommunityIcons name={item.icon} size={isFeatured ? 28 : 22} color={item.tint} />
          </View>
          {isFeatured ? (
            <ThemedText type="labelMd" themeColor="primary" style={styles.startLabel}>
              START HERE
            </ThemedText>
          ) : (
            <MaterialCommunityIcons name="arrow-up-right" size={20} color={theme.textSecondary} style={styles.arrow} />
          )}
        </View>

        <View style={styles.cardTextContent}>
          <ThemedText type={isFeatured ? 'headlineSm' : 'bodyLg'} style={styles.cardTitle}>
            {item.title}
          </ThemedText>
          <ThemedText
            type="bodySm"
            themeColor="textSecondary"
            numberOfLines={isFeatured ? 2 : 3}
            style={styles.description}
          >
            {item.description}
          </ThemedText>
        </View>

        {isFeatured && (
          <View style={styles.featuredAction}>
            <ThemedText type="labelMd" themeColor="primary">Open overview</ThemedText>
            <MaterialCommunityIcons name="arrow-right" size={18} color={theme.primary} />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerSection}>
            <ThemedText type="labelMd" themeColor="primary" style={styles.eyebrow}>STORE PERFORMANCE</ThemedText>
            <ThemedText type="displayLgMobile" style={styles.mainTitle}>Finance</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              Manage your store&apos;s economic performance
            </ThemedText>
          </View>

          <View style={styles.sectionHeader}>
            <ThemedText type="labelMd" themeColor="textSecondary">YOUR OVERVIEW</ThemedText>
            <ThemedText type="bodySm" themeColor="textSecondary">
              A quick read on the numbers that matter most.
            </ThemedText>
          </View>

          <View style={styles.bentoGrid}>
            {featuredItem && renderFinanceCard(featuredItem)}
          </View>

          <View style={styles.quickAccessHeader}>
            <ThemedText type="labelMd" themeColor="textSecondary">QUICK ACCESS</ThemedText>
            <ThemedText type="bodySm" themeColor="textSecondary">
              Jump into the detail behind your performance.
            </ThemedText>
          </View>

          <View style={styles.bentoGrid}>
            {secondaryItems.map(renderFinanceCard)}
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
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  headerSection: {
    marginBottom: Spacing.five,
  },
  eyebrow: {
    marginBottom: Spacing.two,
  },
  mainTitle: {
    marginBottom: Spacing.two,
  },
  subtitle: {
    marginTop: Spacing.one,
  },
  sectionHeader: {
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  quickAccessHeader: {
    gap: Spacing.one,
    marginTop: Spacing.five,
    marginBottom: Spacing.three,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  card: {
    borderRadius: Radius.md,
    padding: Spacing.four,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  featuredCard: {
    minHeight: 190,
    paddingTop: Spacing.four + Spacing.one,
  },
  supportingCard: {
    minHeight: 144,
  },
  cardHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.5,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.82,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconContainer: {
    padding: Spacing.two,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    opacity: 0.3,
  },
  cardTextContent: {
    gap: Spacing.one,
    minWidth: 0,
  },
  cardTitle: {
    fontWeight: '600',
  },
  description: {
    lineHeight: 18,
    opacity: 0.8,
  },
  startLabel: {
    opacity: 0.85,
  },
  featuredAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
});