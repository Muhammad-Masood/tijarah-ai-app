import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatPrice } from '@/components/product-kit';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useProductChat, type ChatMessage } from '@/hooks/use-product-chat';
import type { Product } from '@/lib/api';

function MessageBubble({ message }: { message: ChatMessage }) {
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

/** Per-product AI chat — grounded in this product's own listing + insights data. See `useProductChat`. */
export function ProductChatPanel({ product, style }: { product: Product; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { messages, suggestedPrompts, isSending, sendMessage } = useProductChat(product);
  const [draft, setDraft] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, isSending]);

  const thumbnail = product.images?.[0] ?? product.image;

  function handleSend() {
    if (!draft.trim() || isSending) return;
    sendMessage(draft);
    setDraft('');
  }

  return (
    <KeyboardAvoidingView style={[styles.flex, style]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.contextStrip, { borderBottomColor: theme.border }]}>
        <View style={[styles.thumbnail, { backgroundColor: theme.backgroundElement }]}>
          {thumbnail && <Image source={{ uri: thumbnail }} style={styles.thumbnailImage} contentFit="cover" />}
        </View>
        <ThemedText type="bodyMd" numberOfLines={1} style={styles.contextTitle}>
          {product.title}
        </ThemedText>
        <ThemedText type="bodySm" themeColor="textSecondary">
          {formatPrice(product.price)}
        </ThemedText>
      </View>

      <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.threadContent}>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isSending && (
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
        )}
      </ScrollView>

      {messages.length === 1 && suggestedPrompts.length > 0 && (
        <View style={styles.promptsRow}>
          {suggestedPrompts.map((prompt) => (
            <Pressable
              key={prompt}
              onPress={() => sendMessage(prompt)}
              style={[styles.promptChip, { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest }]}>
              <ThemedText type="bodySm">{prompt}</ThemedText>
            </Pressable>
          ))}
        </View>
      )}

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
            value={draft}
            onChangeText={setDraft}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Ask a question…"
            placeholderTextColor={theme.textSecondary}
            style={[styles.composerInput, { color: theme.text }]}
            multiline
          />
        </View>
        <Pressable
          onPress={handleSend}
          disabled={!draft.trim() || isSending}
          style={[styles.sendButton, { backgroundColor: draft.trim() ? theme.primary : theme.surfaceContainerHigh }]}>
          <SymbolView
            name="arrow.up"
            tintColor={draft.trim() ? theme.onPrimary : theme.textSecondary}
            size={16}
            fallback={
              <ThemedText type="bodyMd" themeColor={draft.trim() ? 'onPrimary' : 'textSecondary'}>
                ↑
              </ThemedText>
            }
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  contextStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
  },
  thumbnail: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  contextTitle: {
    flex: 1,
  },
  threadContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
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
  promptsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    paddingBottom: Spacing.two,
  },
  promptChip: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
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
