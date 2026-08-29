import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatComposer, MessageBubble, ThinkingRow } from '@/components/chat-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, ManropeFamily, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAskTijarah } from '@/hooks/use-ask-tijarah';
import { useDarazProducts } from '@/hooks/use-daraz-products';
import { useTheme } from '@/hooks/use-theme';

// Store-wide AI chat, distinct from the per-product ProductChatPanel
// (product-detail.tsx): this scope isn't self-evident the way "this one
// product" is, so the empty state maps out what Tijarah can answer instead
// of a flat suggestion list — see useAskTijarah for what's real vs. mocked.
export default function AskTijarahScreen() {
  const theme = useTheme();
  const { products, isConnected, isLoading } = useDarazProducts();
  const { messages, suggestedGroups, isSending, sendMessage, resetConversation } = useAskTijarah(
    products,
    isConnected,
    isLoading,
  );
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const hasConversation = messages.length > 1;

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, isSending]);

  function handleSend() {
    if (!draft.trim() || isSending) return;
    sendMessage(draft);
    setDraft('');
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={[styles.flex, { paddingBottom: BottomTabInset }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.brandMark, { backgroundColor: theme.primary }]}>
                <ThemedText themeColor="onPrimary" style={styles.brandMarkGlyph}>
                  T
                </ThemedText>
              </View>
              <ThemedText type="headlineMd">Ask Tijarah</ThemedText>
            </View>
            {hasConversation && (
              <Pressable
                onPress={resetConversation}
                hitSlop={8}
                accessibilityLabel="Start a new conversation"
                style={[styles.resetButton, { backgroundColor: theme.surfaceContainerHigh }]}>
                <SymbolView
                  name="arrow.counterclockwise"
                  tintColor={theme.textSecondary}
                  size={15}
                  fallback={
                    <ThemedText type="bodySm" themeColor="textSecondary">
                      ↺
                    </ThemedText>
                  }
                />
              </Pressable>
            )}
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.threadContent}
            keyboardShouldPersistTaps="handled">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isSending && <ThinkingRow />}
          </ScrollView>

          {!hasConversation && (
            <View style={styles.groups}>
              {suggestedGroups.map((group) => (
                <View key={group.label} style={styles.group}>
                  <ThemedText type="labelMd" themeColor="textSecondary">
                    {group.label}
                  </ThemedText>
                  <View style={styles.groupChips}>
                    {group.prompts.map((prompt) => (
                      <Pressable
                        key={prompt}
                        onPress={() => sendMessage(prompt)}
                        style={[
                          styles.promptChip,
                          { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest },
                        ]}>
                        <ThemedText type="bodySm">{prompt}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          <ChatComposer
            value={draft}
            onChangeText={setDraft}
            onSend={handleSend}
            isSending={isSending}
            placeholder="Ask about your catalog…"
          />
        </KeyboardAvoidingView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkGlyph: {
    fontFamily: ManropeFamily[700],
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  resetButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'flex-end',
    gap: Spacing.three,
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.three,
  },
  groups: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.containerMargin,
    paddingBottom: Spacing.two,
  },
  group: {
    gap: Spacing.one,
  },
  groupChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  promptChip: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
});
