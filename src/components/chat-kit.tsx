import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatMarkdown } from '@/components/chat-markdown';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  toolCalls?: { name: string; status: 'running' | 'done' }[];
  visualizations?: { chart_type: string; title: string; plotly_spec: unknown }[];
  isStreaming?: boolean;
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
        <ChatMarkdown text={message.text} />
        {message.visualizations && message.visualizations.length > 0 && (
          <View style={styles.vizStack}>
            {message.visualizations.map((viz, index) => (
              <VisualizationCard key={`viz-${index}`} title={viz.title} plotlySpec={viz.plotly_spec} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

export function ThinkingRow({ toolCalls }: { toolCalls?: { name: string; status: 'running' | 'done' }[] }) {
  const theme = useTheme();

  const activeTools = toolCalls?.filter((tool) => tool.status === 'running') ?? [];
  const label = activeTools.length > 0 ? formatToolName(activeTools[0].name) : 'Thinking';

  return (
    <View style={styles.assistantRow}>
      <View style={[styles.assistantRule, { backgroundColor: theme.primary }]} />
      <View style={styles.assistantTextGroup}>
        <ThemedText type="labelMd" themeColor="textSecondary">
          TIJARAH AI
        </ThemedText>
        <ThemedText type="bodyMd" themeColor="textSecondary">
          {label}…
        </ThemedText>
        {activeTools.length > 1 && (
          <View style={styles.toolChipRow}>
            {activeTools.slice(1).map((tool, index) => (
              <View key={`thinking-tool-${index}`} style={[styles.toolChip, { backgroundColor: theme.surfaceContainerHigh }]}>
                <ThemedText type="bodySm" themeColor="textSecondary">
                  {formatToolName(tool.name)}
                </ThemedText>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function formatToolName(name: string): string {
  // get_financial_summary -> Fetching financial summary
  const cleaned = (name ?? '').replace(/^get_|^create_/i, '').replace(/_/g, ' ');
  if (!cleaned) return 'Working';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function ToolChips({ toolCalls }: { toolCalls: { name: string; status: 'running' | 'done' }[] }) {
  const theme = useTheme();
  const running = toolCalls.filter((tool) => tool.status === 'running');
  if (running.length === 0) return null;

  return (
    <View style={styles.assistantRow}>
      <View style={[styles.assistantRule, { backgroundColor: theme.primary }]} />
      <View style={styles.toolChipRow}>
        {running.map((tool, index) => (
          <View key={`tool-chip-${index}`} style={[styles.toolChip, { backgroundColor: theme.surfaceContainerHigh }]}>
            <ThemedText type="bodySm" themeColor="textSecondary">
               {formatToolName(tool.name)}…
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

type ChartTrace = {
  name: string;
  x: (string | number)[];
  y: number[];
  kind: 'line' | 'bar';
};

/** Pull renderable series out of a Plotly figure spec (`{data: [{x, y, type, name}, …]}`). */
function extractChartTraces(plotlySpec: unknown): ChartTrace[] {
  if (!plotlySpec || typeof plotlySpec !== 'object') return [];
  const data = (plotlySpec as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];

  const traces: ChartTrace[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== 'object') continue;
    const trace = raw as { x?: unknown; y?: unknown; type?: unknown; name?: unknown };
    if (!Array.isArray(trace.x) || !Array.isArray(trace.y) || trace.y.length === 0) continue;
    traces.push({
      name: typeof trace.name === 'string' && trace.name ? trace.name : `Series ${traces.length + 1}`,
      x: trace.x.map((value) => (typeof value === 'string' || typeof value === 'number' ? value : String(value))),
      y: trace.y.map((value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0)),
      kind: trace.type === 'bar' ? 'bar' : 'line',
    });
  }
  return traces;
}

/** Compact axis values: 31164 -> "31K", 5051 -> "5.1K", 938 -> "938". */
function formatAxisValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 10_000) return `${(value / 1_000).toFixed(0)}K`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.round(value)}`;
}

/** ISO dates shrink to MM-DD so several fit under the chart; other labels truncate. */
function formatCategoryLabel(label: string | number): string {
  const text = String(label);
  const isoDate = /^\d{4}-(\d{2})-(\d{2})/.exec(text);
  if (isoDate) return `${isoDate[1]}-${isoDate[2]}`;
  return text.length > 7 ? `${text.slice(0, 6)}…` : text;
}

/**
 * Renders a `visualization` event's Plotly spec as a lightweight SVG chart —
 * every trace (not just the first), with a legend, gridlines, and a zero
 * baseline when values dip negative. Width follows the chat column via
 * onLayout instead of a hardcoded pixel width.
 */
export function VisualizationCard({ title, plotlySpec }: { title: string; plotlySpec?: unknown }) {
  const theme = useTheme();
  const traces = useMemo(() => extractChartTraces(plotlySpec), [plotlySpec]);
  const [cardWidth, setCardWidth] = useState(0);

  if (traces.length === 0) {
    return (
      <View style={[styles.vizCard, { backgroundColor: theme.surfaceContainerHigh, borderColor: theme.border }]}>
        <ThemedText type="labelMd" themeColor="textSecondary">
          {title || 'Chart'}
        </ThemedText>
        <ThemedText type="bodySm" themeColor="textSecondary">
          Chart data unavailable
        </ThemedText>
      </View>
    );
  }

  const palette = [theme.primary, theme.tertiary, theme.secondary, theme.success, theme.danger];
  const traceColor = (index: number) => palette[index % palette.length];

  const chartHeight = 200;
  const padding = { top: 12, right: 10, bottom: 28, left: 46 };
  const chartWidth = cardWidth > 0 ? Math.max(cardWidth - Spacing.three * 2, 220) : 0;
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;

  const allValues = traces.flatMap((trace) => trace.y);
  const minValue = Math.min(0, ...allValues);
  let maxValue = Math.max(0, ...allValues);
  if (maxValue === minValue) maxValue = minValue + 1;
  maxValue += (maxValue - minValue) * 0.08; // headroom so peaks don't touch the card edge
  const range = maxValue - minValue;
  const toY = (value: number) => innerH - ((value - minValue) / range) * innerH;
  const zeroY = toY(0);

  const pointCount = Math.max(...traces.map((trace) => trace.y.length));
  const barTraces = traces.filter((trace) => trace.kind === 'bar');
  const labelStep = Math.max(1, Math.ceil(pointCount / 5));
  const xFor = (index: number) =>
    barTraces.length > 0
      ? ((index + 0.5) / pointCount) * innerW
      : (index / Math.max(pointCount - 1, 1)) * innerW;

  return (
    <View
      style={[styles.vizCard, { backgroundColor: theme.surfaceContainerHigh, borderColor: theme.border }]}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        if (Math.abs(width - cardWidth) > 1) setCardWidth(width);
      }}>
      <ThemedText type="labelMd" themeColor="textSecondary">
        {title}
      </ThemedText>
      {chartWidth > 0 && (
        <Svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <G x={padding.left} y={padding.top}>
            {/* Horizontal gridlines + y-axis ticks spanning the real value range */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
              const y = innerH - frac * innerH;
              return (
                <G key={`grid-${frac}`}>
                  <Path d={`M0,${y} L${innerW},${y}`} stroke={theme.border} strokeWidth={0.5} />
                  <SvgText x={-8} y={y + 3} fill={theme.textSecondary} fontSize={9} textAnchor="end">
                    {formatAxisValue(minValue + frac * range)}
                  </SvgText>
                </G>
              );
            })}
            {/* Zero baseline when the data dips negative */}
            {minValue < 0 && (
              <Path d={`M0,${zeroY} L${innerW},${zeroY}`} stroke={theme.outline} strokeWidth={1} />
            )}
            {/* Bars first so overlapping line traces stay visible */}
            {traces.map((trace, traceIndex) =>
              trace.kind !== 'bar'
                ? null
                : trace.y.map((value, index) => {
                    const groupWidth = innerW / pointCount;
                    const barWidth = Math.max((groupWidth * 0.7) / barTraces.length - 1, 2);
                    const x = index * groupWidth + groupWidth * 0.15 + traceIndex * (barWidth + 1);
                    const y = Math.min(toY(value), zeroY);
                    const height = Math.max(Math.abs(toY(value) - zeroY), 1);
                    return (
                      <Rect
                        key={`bar-${traceIndex}-${index}`}
                        x={x}
                        y={y}
                        width={barWidth}
                        height={height}
                        rx={2}
                        fill={traceColor(traceIndex)}
                      />
                    );
                  }),
            )}
            {traces.map((trace, traceIndex) => {
              if (trace.kind !== 'line') return null;
              const points = trace.y.map((value, index) => ({ x: xFor(index), y: toY(value) }));
              const path = points
                .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
                .join(' ');
              return (
                <G key={`line-${traceIndex}`}>
                  <Path
                    d={path}
                    fill="none"
                    stroke={traceColor(traceIndex)}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {points.length <= 24 &&
                    points.map((point, index) => (
                      <Circle key={`point-${index}`} cx={point.x} cy={point.y} r={2.5} fill={traceColor(traceIndex)} />
                    ))}
                </G>
              );
            })}
            {/* Thinned-out x labels; edge labels anchor inward so they never clip */}
            {traces[0].x.map((label, index) => {
              if (index % labelStep !== 0) return null;
              let anchor: 'start' | 'middle' | 'end' = 'middle';
              if (barTraces.length === 0) {
                if (index === 0) anchor = 'start';
                else if (index === pointCount - 1) anchor = 'end';
              }
              return (
                <SvgText
                  key={`x-label-${index}`}
                  x={xFor(index)}
                  y={innerH + 16}
                  fill={theme.textSecondary}
                  fontSize={8}
                  textAnchor={anchor}>
                  {formatCategoryLabel(label)}
                </SvgText>
              );
            })}
          </G>
        </Svg>
      )}
      {traces.length > 1 && (
        <View style={styles.vizLegend}>
          {traces.map((trace, index) => (
            <View key={`legend-${index}`} style={styles.vizLegendItem}>
              <View style={[styles.vizLegendDot, { backgroundColor: traceColor(index) }]} />
              <ThemedText type="bodySm" themeColor="textSecondary">
                {trace.name}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function ChatComposer({
  value,
  onChangeText,
  onSend,
  isSending,
  placeholder,
  bottomInset,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  isSending: boolean;
  placeholder: string;
  /** Override safe-area bottom padding — pass 0 while the keyboard is open. */
  bottomInset?: number;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [isFocused, setIsFocused] = useState(false);
  const canSend = value.trim().length > 0 && !isSending;
  const resolvedBottomInset = bottomInset ?? Math.max(insets.bottom, Spacing.two);

  return (
    <View
      style={[
        styles.composerRow,
        { borderTopColor: theme.border, paddingBottom: resolvedBottomInset },
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
  toolChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  toolChip: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  vizStack: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  vizCard: {
    width: '100%',
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  vizLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  vizLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  vizLegendDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
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
