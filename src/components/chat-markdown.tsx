import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Block =
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'ordered'; items: string[] }
  | { kind: 'bullet'; items: string[] }
  | { kind: 'table'; headers: string[]; rows: string[][] };

/** Splits assistant markdown into simple blocks — enough for chat-style bold, lists, tables, and paragraphs. */
function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.split('\n');
  let paragraphLines: string[] = [];
  let listKind: 'ordered' | 'bullet' | null = null;
  let listItems: string[] = [];
  let tableRows: string[] = [];

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

  const flushTable = () => {
    if (tableRows.length < 2) {
      // Not a valid table, treat as paragraph
      paragraphLines.push(...tableRows);
      tableRows = [];
      return;
    }
    
    const parseRow = (row: string): string[] => {
      return row
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim());
    };
    
    const headers = parseRow(tableRows[0]);
    const rows = tableRows.slice(2).map(parseRow); // Skip header and separator
    
    blocks.push({ kind: 'table', headers, rows });
    tableRows = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    const isTableRow = trimmed.startsWith('|') && trimmed.endsWith('|');
    const isTableSeparator = /^\|[-:\s|]+\|$/.test(trimmed);

    if (isTableRow) {
      flushParagraph();
      flushList();
      if (!isTableSeparator) {
        tableRows.push(trimmed);
      }
      continue;
    }

    // If we were collecting table rows but this line isn't a table row, flush the table
    if (tableRows.length > 0) {
      flushTable();
    }

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
  flushTable();
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
  const theme = useTheme();
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

        if (block.kind === 'table') {
          return (
            <View key={index} style={[styles.table, { borderColor: theme.border }]}>
              <View style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                {block.headers.map((header, cellIndex) => (
                  <View key={cellIndex} style={styles.tableCell}>
                    <ThemedText type="labelMd" themeColor="textSecondary">
                      {header}
                    </ThemedText>
                  </View>
                ))}
              </View>
              {block.rows.map((row, rowIndex) => (
                <View key={rowIndex} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                  {row.map((cell, cellIndex) => (
                    <View key={cellIndex} style={styles.tableCell}>
                      <InlineText text={cell} />
                    </View>
                  ))}
                </View>
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
  table: {
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 2,
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
