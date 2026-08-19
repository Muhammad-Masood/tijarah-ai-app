import { StyleSheet, View } from 'react-native';

import type { Tone } from '@/constants/dashboard-mock';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Resolves a design-system semantic tone to a theme color. No new colors — see `dashboard-kit.tsx`. */
export function resolveToneColor(theme: ReturnType<typeof useTheme>, tone: Tone): string {
  switch (tone) {
    case 'success':
      return theme.success;
    case 'warning':
      return theme.tertiary;
    case 'danger':
      return theme.danger;
    case 'aiInsight':
      return theme.primary;
    case 'neutral':
    default:
      return theme.textSecondary;
  }
}

/** Hook form of `resolveToneColor` for components rendered directly (not inside a `.map()` callback). */
export function useToneColor(tone: Tone): string {
  const theme = useTheme();
  return resolveToneColor(theme, tone);
}

/**
 * Minimal bar-style sparkline built from plain Views (no chart/SVG library in
 * this project). Reads as a quick trend, not detailed analysis, per the
 * dashboard spec's "keep charts minimal" constraint.
 */
export function Sparkline({ points, tone, height = 32 }: { points: number[]; tone: Tone; height?: number }) {
  const color = useToneColor(tone);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  return (
    <View style={[styles.sparklineRow, { height }]}>
      {points.map((point, index) => {
        const ratio = (point - min) / range;
        const barHeight = Math.max(3, ratio * height);
        const isLast = index === points.length - 1;
        return (
          <View
            key={index}
            style={[
              styles.sparklineBar,
              {
                height: barHeight,
                backgroundColor: color,
                opacity: isLast ? 1 : 0.35 + ratio * 0.4,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

/**
 * Compact horizontal stacked bar representing a count distribution (e.g.
 * inventory stock status). Segments are proportional to their `count`.
 */
export function DistributionBar({ segments }: { segments: { label: string; count: number; tone: Tone }[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0) || 1;

  return (
    <View style={styles.distributionRow}>
      {segments.map((segment) => (
        <SegmentSlice key={segment.label} flex={segment.count / total} tone={segment.tone} />
      ))}
    </View>
  );
}

function SegmentSlice({ flex, tone }: { flex: number; tone: Tone }) {
  const color = useToneColor(tone);
  return <View style={[styles.segment, { flex, backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  sparklineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
  sparklineBar: {
    flex: 1,
    borderRadius: Radius.sm,
    minWidth: 3,
  },
  distributionRow: {
    flexDirection: 'row',
    height: 10,
    borderRadius: Radius.full,
    overflow: 'hidden',
    gap: 2,
  },
  segment: {
    height: '100%',
  },
});
