import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListRow, ListSection } from '@/components/list-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

/**
 * Minimal "More" menu — a nav destination, not the full 08-Management module
 * hub (that isn't specified anywhere). "Profile" is the only row with a real
 * destination; the rest are placeholders with no backing screen yet.
 */
export default function MoreScreen() {
  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          <ThemedText type="headlineMd">More</ThemedText>

          <View style={styles.subsection}>
            <ListSection>
              <ListRow label="Profile" onPress={() => router.push('/profile')} />
              <ListRow label="Products" onPress={() => router.push('/products')} />
              <ListRow label="Connected Stores" onPress={() => router.push('/connect-stores')} />
              <ListRow label="Product Hunting" onPress={() => router.push('/product-hunting-tool')} />
              <ListRow label="Settings" />
              <ListRow label="Help & Support" isLast />
            </ListSection>
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
  subsection: {
    gap: Spacing.two,
  },
});
