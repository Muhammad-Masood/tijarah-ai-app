import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ChatComposer, MessageBubble, ThinkingRow } from '@/components/chat-kit';
import { formatPrice } from '@/components/product-kit';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useProductChat } from '@/hooks/use-product-chat';
import type { Product, ReturnsInsights, ReviewAnalysisResponse } from '@/lib/api';

/** Per-product AI chat — grounded in this product's own listing + insights data. See `useProductChat`. */
export function ProductChatPanel({
  product,
  insights,
  style,
}: {
  product: Product;
  insights: { reviewAnalysis: ReviewAnalysisResponse | null; returnsInsights: ReturnsInsights | null };
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const { messages, suggestedPrompts, isSending, sendMessage } = useProductChat(product, insights);
  const [draft, setDraft] = useState('');
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
        {isSending && <ThinkingRow />}
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

      <ChatComposer
        value={draft}
        onChangeText={setDraft}
        onSend={handleSend}
        isSending={isSending}
        placeholder="Ask a question…"
      />
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
});
