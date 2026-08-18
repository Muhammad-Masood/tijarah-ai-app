import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ManropeFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const theme = useTheme();
  const box = size === 'sm' ? 56 : 88;
  const glyph = size === 'sm' ? 24 : 36;

  return (
    <View
      style={[
        styles.brandMark,
        { width: box, height: box, borderRadius: Radius.md, backgroundColor: theme.primary },
      ]}>
      <ThemedText
        style={{ fontFamily: ManropeFamily[700], fontWeight: '700', fontSize: glyph, color: theme.onPrimary }}>
        T
      </ThemedText>
    </View>
  );
}

type AuthFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'words';
  autoComplete?: 'name' | 'email' | 'new-password' | 'current-password';
  error?: string;
  rightAdornment?: ReactNode;
};

export function AuthField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete,
  error,
  rightAdornment,
}: AuthFieldProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error ? theme.danger : isFocused ? theme.primary : theme.border;

  return (
    <View style={styles.fieldGroup}>
      <ThemedText type="bodyMd" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View
        style={[
          styles.inputRow,
          { borderColor, backgroundColor: theme.surfaceContainerLowest },
          isFocused && !error && { shadowColor: theme.primary },
          isFocused && !error && styles.inputFocusGlow,
        ]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          // Android's Autofill/Smart Lock framework pops a suggestion or
          // save-password overlay on focus for these autoComplete hints,
          // which steals focus back from the field and reads as the
          // keyboard flickering open/closed or keystrokes being dropped.
          importantForAutofill="no"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[styles.input, { color: theme.text }]}
        />
        {rightAdornment}
      </View>
      {error && (
        <ThemedText type="bodySm" themeColor="danger">
          {error}
        </ThemedText>
      )}
    </View>
  );
}

export function PasswordVisibilityToggle({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle} hitSlop={8}>
      <ThemedText type="bodySm" themeColor="primary">
        {visible ? 'Hide' : 'Show'}
      </ThemedText>
    </Pressable>
  );
}

export function OrDivider({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.dividerRow}>
      <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
      <ThemedText type="bodySm" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
    </View>
  );
}

export function GoogleButton({ label, onPress }: { label: string; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.googleButton,
        { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest },
        pressed && styles.pressed,
      ]}>
      <View style={styles.googleMark}>
        <ThemedText style={styles.googleMarkText}>G</ThemedText>
      </View>
      <ThemedText type="bodyLg" style={styles.emphasisText}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  brandMark: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  fieldGroup: {
    gap: Spacing.one,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.DEFAULT,
    paddingHorizontal: Spacing.three,
  },
  inputFocusGlow: {
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.three,
    fontFamily: ManropeFamily[400],
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.DEFAULT,
    paddingVertical: Spacing.three,
  },
  googleMark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#DADCE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleMarkText: {
    color: '#4285F4',
    fontSize: 11,
    fontWeight: '700',
  },
  emphasisText: {
    fontFamily: ManropeFamily[600],
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
