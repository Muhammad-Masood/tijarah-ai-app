import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatComposer, MessageBubble, ThinkingRow, ToolChips } from '@/components/chat-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, ManropeFamily, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAskTijarah } from '@/hooks/use-ask-tijarah';
import { useTheme } from '@/hooks/use-theme';

// Store-wide AI chat, distinct from the per-product ProductChatPanel
// (product-detail.tsx): this scope isn't self-evident the way "this one
// product" is, so the empty state maps out what Tijarah can answer instead
// of a flat suggestion list — see useAskTijarah for what's real vs. mocked.
export default function AskTijarahScreen() {
  const theme = useTheme();
  const { messages, suggestedGroups, isConnected, marketplaces, isSending, activeToolCalls, sendMessage, resetConversation } =
    useAskTijarah();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  // Follow the stream only while the user is already near the bottom —
  // scrolling up to read earlier turns shouldn't yank them back down.
  const shouldAutoScrollRef = useRef(true);
  const hasConversation = messages.length > 1;
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardOffset(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardOffset(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages, isSending, keyboardOffset]);

  function handleSend() {
    if (!draft.trim() || isSending) return;
    shouldAutoScrollRef.current = true;
    sendMessage(draft);
    setDraft('');
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={[styles.flex, { paddingBottom: BottomTabInset }]}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerTopRow}>
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
            {isConnected && marketplaces.length > 0 && (
              <View style={[styles.marketplaceBanner, { backgroundColor: theme.primaryContainer }]}>
                <ThemedText type="bodySm" themeColor="onPrimaryContainer">
                  Connected: {marketplaces.map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')}
                </ThemedText>
              </View>
            )}
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.threadContent}
            onScroll={(event) => {
              const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
              shouldAutoScrollRef.current =
                contentOffset.y + layoutMeasurement.height >= contentSize.height - 80;
            }}
            scrollEventThrottle={100}
            keyboardShouldPersistTaps="handled">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isSending && activeToolCalls.length > 0 && <ToolChips toolCalls={activeToolCalls} />}
            {isSending && !messages[messages.length - 1]?.isStreaming && (
              <ThinkingRow toolCalls={activeToolCalls} />
            )}
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
                        onPress={() => {
                          shouldAutoScrollRef.current = true;
                          sendMessage(prompt);
                        }}
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
            placeholder="Ask about your catalog, stock, or financials…"
            bottomInset={keyboardOffset > 0 ? 0 : undefined}
          />
        </KeyboardAvoidingView>
        </View>
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
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    gap: Spacing.one,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
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
  marketplaceBanner: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    alignItems: 'center',
  },
});
