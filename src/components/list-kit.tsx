import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Grouped list container with subtle dividers between rows instead of
 * per-row card borders — the "settings list" treatment used by the Profile
 * screen's quick links and the More tab menu.
 */
export function ListSection({ children }: { children: ReactNode }) {
  return (
    <ThemedView type="backgroundElement" style={styles.section}>
      {children}
    </ThemedView>
  );
}

export function ListRow({
  label,
  value,
  onPress,
  leading,
  showChevron = true,
  isLast = false,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  leading?: ReactNode;
  showChevron?: boolean;
  isLast?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && { borderBottomColor: theme.border, borderBottomWidth: 1 },
        pressed && onPress && styles.pressed,
      ]}>
      {leading}
      <ThemedText type="bodyMd" style={styles.rowLabel}>
        {label}
      </ThemedText>
      {value && (
        <ThemedText type="bodyMd" themeColor="textSecondary">
          {value}
        </ThemedText>
      )}
      {showChevron && (
        <ThemedText type="bodyLg" themeColor="textSecondary" style={styles.chevron}>
          ›
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  row: {
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
  chevron: {
    marginLeft: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
