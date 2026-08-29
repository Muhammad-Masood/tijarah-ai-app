import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

/**
 * Shared chat visual grammar for every AI chat surface (per-product panel,
 * Ask Tijarah tab): user turns are filled bubbles, assistant turns are an
 * accent rule + label — no bubble — so the two never get confused at a
 * glance. Kept in one place so the two surfaces can't drift apart.
 */
export function MessageBubble({ message }: { message: ChatMessage }) {
  const theme = useTheme();

  if (message.role === 'user') {
    return (
      <View style={styles.userRow}>
        <View style={[styles.userBubble, { backgroundColor: theme.primaryContainer }]}>
          <ThemedText type="bodyMd" themeColor="onPrimaryContainer">
            {message.text}
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantRow}>
      <View style={[styles.assistantRule, { backgroundColor: theme.primary }]} />
      <View style={styles.assistantTextGroup}>
        <ThemedText type="labelMd" themeColor="textSecondary">
          TIJARAH AI
        </ThemedText>
        <ThemedText type="bodyMd">{message.text}</ThemedText>
      </View>
    </View>
  );
}

export function ThinkingRow() {
  const theme = useTheme();

  return (
    <View style={styles.assistantRow}>
      <View style={[styles.assistantRule, { backgroundColor: theme.primary }]} />
      <View style={styles.assistantTextGroup}>
        <ThemedText type="labelMd" themeColor="textSecondary">
          TIJARAH AI
        </ThemedText>
        <ThemedText type="bodyMd" themeColor="textSecondary">
          Thinking…
        </ThemedText>
      </View>
    </View>
  );
}

export function ChatComposer({
  value,
  onChangeText,
  onSend,
  isSending,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  isSending: boolean;
  placeholder: string;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [isFocused, setIsFocused] = useState(false);
  const canSend = value.trim().length > 0 && !isSending;

  return (
    <View
      style={[
        styles.composerRow,
        { borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, Spacing.two) },
      ]}>
      <View
        style={[
          styles.composerInputWrapper,
          {
            borderColor: isFocused ? theme.primary : theme.border,
            borderWidth: isFocused ? 1.5 : 1,
            backgroundColor: theme.surfaceContainerLow,
            shadowColor: theme.primary,
            shadowOpacity: isFocused ? 0.16 : 0,
          },
        ]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          style={[styles.composerInput, { color: theme.text }]}
          multiline
        />
      </View>
      <Pressable
        onPress={onSend}
        disabled={!canSend}
        style={[styles.sendButton, { backgroundColor: value.trim() ? theme.primary : theme.surfaceContainerHigh }]}>
        <SymbolView
          name="arrow.up"
          tintColor={value.trim() ? theme.onPrimary : theme.textSecondary}
          size={16}
          fallback={
            <ThemedText type="bodyMd" themeColor={value.trim() ? 'onPrimary' : 'textSecondary'}>
              ↑
            </ThemedText>
          }
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    alignItems: 'flex-end',
  },
  userBubble: {
    maxWidth: '82%',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  assistantRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    maxWidth: '92%',
  },
  assistantRule: {
    width: 2,
    borderRadius: Radius.full,
    alignSelf: 'stretch',
  },
  assistantTextGroup: {
    flex: 1,
    gap: Spacing.half,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
  },
  composerInputWrapper: {
    flex: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 0,
  },
  composerInput: {
    maxHeight: 100,
    paddingVertical: Spacing.two,
    fontSize: 16,
    lineHeight: 20,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
