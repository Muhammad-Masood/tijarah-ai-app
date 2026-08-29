import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type Block =
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'ordered'; items: string[] }
  | { kind: 'bullet'; items: string[] };

/** Splits assistant markdown into simple blocks — enough for chat-style bold, lists, and paragraphs. */
function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.split('\n');
  let paragraphLines: string[] = [];
  let listKind: 'ordered' | 'bullet' | null = null;
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    blocks.push({ kind: 'paragraph', lines: paragraphLines });
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listKind || listItems.length === 0) return;
    blocks.push({ kind: listKind, items: listItems });
    listKind = null;
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);

    if (orderedMatch) {
      flushParagraph();
      if (listKind !== 'ordered') {
        flushList();
        listKind = 'ordered';
      }
      listItems.push(orderedMatch[1]);
      continue;
    }

    if (bulletMatch) {
      flushParagraph();
      if (listKind !== 'bullet') {
        flushList();
        listKind = 'bullet';
      }
      listItems.push(bulletMatch[1]);
      continue;
    }

    flushList();
    if (trimmed.length === 0) {
      flushParagraph();
    } else {
      paragraphLines.push(trimmed);
    }
  }

  flushList();
  flushParagraph();
  return blocks;
}

/** Renders inline `**bold**` segments inside a line of text. */
function InlineText({ text, muted }: { text: string; muted?: boolean }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  if (parts.length === 1 && !parts[0].includes('**')) {
    return (
      <ThemedText type="bodyMd" themeColor={muted ? 'textSecondary' : undefined}>
        {text}
      </ThemedText>
    );
  }

  return (
    <ThemedText type="bodyMd" themeColor={muted ? 'textSecondary' : undefined}>
      {parts.map((part, index) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <ThemedText key={index} type="bodyMd" style={styles.bold}>
            {part.slice(2, -2)}
          </ThemedText>
        ) : (
          part
        ),
      )}
    </ThemedText>
  );
}

/** User-friendly rendering for assistant chat markdown — no raw `**` or list markers. */
export function ChatMarkdown({ text }: { text: string }) {
  const blocks = parseBlocks(text);

  if (blocks.length === 0) {
    return <ThemedText type="bodyMd">{text}</ThemedText>;
  }

  return (
    <View style={styles.stack}>
      {blocks.map((block, index) => {
        if (block.kind === 'paragraph') {
          return (
            <View key={index} style={styles.paragraph}>
              {block.lines.map((line, lineIndex) => (
                <InlineText key={lineIndex} text={line} />
              ))}
            </View>
          );
        }

        return (
          <View key={index} style={styles.list}>
            {block.items.map((item, itemIndex) => (
              <View key={itemIndex} style={styles.listRow}>
                <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.listMarker}>
                  {block.kind === 'ordered' ? `${itemIndex + 1}.` : '•'}
                </ThemedText>
                <View style={styles.listContent}>
                  <InlineText text={item} />
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.two,
  },
  paragraph: {
    gap: Spacing.half,
  },
  list: {
    gap: Spacing.one,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.one,
  },
  listMarker: {
    minWidth: 18,
    lineHeight: 22,
  },
  listContent: {
    flex: 1,
  },
  bold: {
    fontWeight: '700',
  },
});
