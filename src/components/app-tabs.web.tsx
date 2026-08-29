import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TAB_ICONS: Record<string, string> = {
  home: '⌂',
  insights: '▲',
  products: '▣',
  more: '⋯',
};

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton icon={TAB_ICONS.home}>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="insights" href="/insights" asChild>
            <TabButton icon={TAB_ICONS.insights}>Insights</TabButton>
          </TabTrigger>
          {/* Center nav item, visually raised/prominent — not a plain tab —
              per the Home dashboard spec's explicit callout. */}
          <TabTrigger name="ask-tijarah" href="/ask-tijarah" asChild>
            <AskTijarahButton />
          </TabTrigger>
          <TabTrigger name="products" href="/products" asChild>
            <TabButton icon={TAB_ICONS.products}>Products</TabButton>
          </TabTrigger>
          <TabTrigger name="more" href="/more" asChild>
            <TabButton icon={TAB_ICONS.more}>More</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, icon, isFocused, ...props }: TabTriggerSlotProps & { icon: string }) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [styles.tabButtonPressable, pressed && styles.pressed]}>
      <View style={styles.tabButtonInner}>
        <ThemedText type="bodyMd" themeColor={isFocused ? 'primary' : 'textSecondary'} style={styles.tabIcon}>
          {icon}
        </ThemedText>
        <ThemedText type="bodySm" themeColor={isFocused ? 'primary' : 'textSecondary'}>
          {children}
        </ThemedText>
      </View>
    </Pressable>
  );
}

/**
 * Ask Tijarah is deliberately not a `TabButton` — it floats above the bar in
 * a filled primary circle so it reads as the primary action of the nav bar,
 * not a fifth equal tab. This is the treatment app-tabs.tsx (native) can't
 * fully replicate, since the OS-rendered native tab bar has no slot for a
 * physically raised item.
 */
export function AskTijarahButton({ isFocused, ...props }: TabTriggerSlotProps) {
  const theme = useTheme();

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [styles.raisedPressable, pressed && styles.pressed]}>
      <View
        style={[
          styles.raisedCircle,
          { backgroundColor: theme.primary, borderColor: theme.background },
          isFocused && styles.raisedCircleFocused,
        ]}>
        <ThemedText type="bodyLg" themeColor="onPrimary" style={styles.raisedIcon}>
          ✦
        </ThemedText>
      </View>
      <ThemedText type="bodySm" themeColor={isFocused ? 'primary' : 'textSecondary'}>
        Ask Tijarah
      </ThemedText>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexGrow: 1,
    maxWidth: MaxContentWidth,
  },
  tabButtonPressable: {
    flex: 1,
    alignItems: 'center',
  },
  tabButtonInner: {
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  tabIcon: {
    fontSize: 18,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.7,
  },
  raisedPressable: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
  },
  raisedCircle: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -Spacing.five,
    borderWidth: 3,
  },
  raisedCircleFocused: {
    opacity: 0.9,
  },
  raisedIcon: {
    fontSize: 20,
  },
});
