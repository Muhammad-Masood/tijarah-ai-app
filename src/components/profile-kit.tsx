import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ManropeFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Initials-based avatar placeholder — reused anywhere a user identity appears (no stock photography). */
export function Avatar({ name, size = 64 }: { name: string; size?: number }) {
  const theme = useTheme();
  const initials = getInitials(name);

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.backgroundSelected },
      ]}>
      <ThemedText style={{ fontFamily: ManropeFamily[700], fontWeight: '700', fontSize: size * 0.36 }}>
        {initials}
      </ThemedText>
    </View>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PlanBadge({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.planBadge, { backgroundColor: theme.primaryContainer }]}>
      <ThemedText type="labelMd" themeColor="primary">
        {label}
      </ThemedText>
    </View>
  );
}

/**
 * Account row that expands into an inline editor on tap. There is no
 * backend field to persist this to yet, so `onSave` only updates local
 * screen state — a lightweight, non-blocking affordance rather than a real
 * settings flow (see `profile.tsx` for the judgment call).
 */
export function EditableAccountRow({
  label,
  value,
  onSave,
  verified,
  isLast = false,
}: {
  label: string;
  value: string;
  onSave: (next: string) => void;
  verified?: boolean;
  isLast?: boolean;
}) {
  const theme = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function startEditing() {
    setDraft(value);
    setIsEditing(true);
  }

  function commit() {
    onSave(draft.trim() || value);
    setIsEditing(false);
  }

  return (
    <View style={[styles.accountRow, !isLast && { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
      <View style={styles.accountRowHeader}>
        <ThemedText type="bodyMd" themeColor="textSecondary">
          {label}
        </ThemedText>
        {!isEditing && (
          <Pressable onPress={startEditing} hitSlop={8} style={styles.accountRowValueTouchable}>
            <ThemedText type="bodyMd">{value}</ThemedText>
            {verified && (
              <ThemedText type="bodySm" themeColor="success">
                ✓
              </ThemedText>
            )}
            <ThemedText type="bodyLg" themeColor="textSecondary">
              ›
            </ThemedText>
          </Pressable>
        )}
      </View>

      {isEditing && (
        <View style={styles.editRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            autoFocus
            style={[styles.editInput, { borderColor: theme.border, color: theme.text }]}
            placeholderTextColor={theme.textSecondary}
          />
          <Pressable onPress={() => setIsEditing(false)} hitSlop={8}>
            <ThemedText type="bodySm" themeColor="textSecondary">
              Cancel
            </ThemedText>
          </Pressable>
          <Pressable onPress={commit} hitSlop={8}>
            <ThemedText type="bodySm" themeColor="primary" style={styles.saveLabel}>
              Save
            </ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/** Non-editable account row (e.g. Password & security) — chevron only, no destination screen yet. */
export function StaticAccountRow({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable style={[styles.accountRow, !isLast && { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
      <View style={styles.accountRowHeader}>
        <ThemedText type="bodyMd" themeColor="textSecondary">
          {label}
        </ThemedText>
        <View style={styles.accountRowValueTouchable}>
          <ThemedText type="bodyMd">{value}</ThemedText>
          <ThemedText type="bodyLg" themeColor="textSecondary">
            ›
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

export function SubscriptionCard({
  planName,
  renewalDate,
  onManagePress,
}: {
  planName: string;
  renewalDate: string;
  onManagePress?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.subscriptionCard, { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest }]}>
      <View style={styles.subscriptionInfo}>
        <ThemedText type="bodyLg" style={styles.subscriptionPlan}>
          {planName}
        </ThemedText>
        <ThemedText type="bodySm" themeColor="textSecondary">
          Renews on {renewalDate}
        </ThemedText>
      </View>
      <Pressable
        onPress={onManagePress}
        style={({ pressed }) => [styles.manageButton, { borderColor: theme.border }, pressed && styles.pressed]}>
        <ThemedText type="bodySm" style={styles.manageLabel}>
          Manage Plan
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  planBadge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  accountRow: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  accountRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountRowValueTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.DEFAULT,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    fontFamily: ManropeFamily[400],
    fontSize: 14,
  },
  saveLabel: {
    fontWeight: '600',
  },
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  subscriptionInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  subscriptionPlan: {
    fontWeight: '600',
  },
  manageButton: {
    borderWidth: 1,
    borderRadius: Radius.DEFAULT,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  manageLabel: {
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
});
