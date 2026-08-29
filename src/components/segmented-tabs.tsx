import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SegmentedTabOption<T extends string> = {
  value: T;
  label: string;
};

/** Pill-style two/three-way tab switcher, e.g. the Details/Insights toggle on the product detail screen. */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentedTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.tab, isActive && { backgroundColor: theme.surfaceContainerLowest }]}>
            <ThemedText type="bodyMd" themeColor={isActive ? 'text' : 'textSecondary'} style={isActive && styles.activeLabel}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: Radius.DEFAULT,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
  },
  activeLabel: {
    fontWeight: '600',
  },
});
