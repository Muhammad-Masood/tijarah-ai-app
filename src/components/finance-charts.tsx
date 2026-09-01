/**
 * Custom SVG-based chart components for the Finance module.
 * Built on react-native-svg — no external charting library needed.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ---------------------------------------------------------------------------
// Area Chart (dual series: inflow/outflow with gradient fills)
// ---------------------------------------------------------------------------

type AreaChartDataPoint = {
  x: number; // day index or timestamp
  inflow: number;
  outflow: number;
};

export function AreaChart({
  data,
  height = 200,
  inflowColor = '#10B981',
  outflowColor = '#EF4444',
}: {
  data: AreaChartDataPoint[];
  height?: number;
  inflowColor?: string;
  outflowColor?: string;
}) {
  const theme = useTheme();

  const chartWidth = 320;
  const padding = { top: 10, right: 10, bottom: 30, left: 45 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const { inflowPath, outflowPath, inflowArea, outflowArea, xLabels, yLabels } = useMemo(() => {
    if (data.length === 0) {
      return { maxVal: 1, inflowPath: '', outflowPath: '', inflowArea: '', outflowArea: '', xLabels: [], yLabels: [] };
    }

    const allValues = data.flatMap((d) => [d.inflow, d.outflow]);
    const max = Math.max(...allValues, 1);
    const xStep = data.length > 1 ? innerW / (data.length - 1) : innerW;

    const toY = (val: number) => innerH - (val / max) * innerH;
    const toX = (i: number) => i * xStep;

    // Build path strings
    const iPoints = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.inflow)}`);
    const oPoints = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.outflow)}`);

    const iPath = iPoints.join(' ');
    const oPath = oPoints.join(' ');

    // Area paths (close to bottom)
    const iArea = `${iPath} L${toX(data.length - 1)},${innerH} L0,${innerH} Z`;
    const oArea = `${oPath} L${toX(data.length - 1)},${innerH} L0,${innerH} Z`;

    // X-axis labels (show ~5 evenly spaced)
    const labelCount = Math.min(5, data.length);
    const xLbls: { x: number; label: string }[] = [];
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.round((i / (labelCount - 1)) * (data.length - 1));
      xLbls.push({ x: toX(idx), label: String(data[idx].x) });
    }

    // Y-axis labels
    const yLbls = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
      y: innerH - frac * innerH,
      label: frac >= 1 ? `${(max / 1000).toFixed(0)}K` : frac === 0 ? '0' : `${((max * frac) / 1000).toFixed(0)}K`,
    }));

    return { maxVal: max, inflowPath: iPath, outflowPath: oPath, inflowArea: iArea, outflowArea: oArea, xLabels: xLbls, yLabels: yLbls };
  }, [data, innerW, innerH]);

  if (data.length === 0) return null;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={chartWidth} height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
        <Defs>
          <LinearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={inflowColor} stopOpacity="0.3" />
            <Stop offset="1" stopColor={inflowColor} stopOpacity="0.02" />
          </LinearGradient>
          <LinearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={outflowColor} stopOpacity="0.3" />
            <Stop offset="1" stopColor={outflowColor} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        <G x={padding.left} y={padding.top}>
          {/* Grid lines */}
          {yLabels.map((lbl, i) => (
            <G key={`y-${i}`}>
              <Path d={`M0,${lbl.y} L${innerW},${lbl.y}`} stroke={theme.border} strokeWidth={0.5} />
              <SvgText x={-8} y={lbl.y + 4} fill={theme.textSecondary} fontSize={9} textAnchor="end">
                {lbl.label}
              </SvgText>
            </G>
          ))}
          {/* Area fills */}
          <Path d={inflowArea} fill="url(#inflowGrad)" />
          <Path d={outflowArea} fill="url(#outflowGrad)" />
          {/* Lines */}
          <Path d={inflowPath} fill="none" stroke={inflowColor} strokeWidth={2} />
          <Path d={outflowPath} fill="none" stroke={outflowColor} strokeWidth={2} />
          {/* X labels */}
          {xLabels.map((lbl, i) => (
            <SvgText key={`x-${i}`} x={lbl.x} y={innerH + 18} fill={theme.textSecondary} fontSize={9} textAnchor="middle">
              {lbl.label}
            </SvgText>
          ))}
        </G>
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Donut Chart (pie with inner radius + center text)
// ---------------------------------------------------------------------------

type DonutSlice = {
  label: string;
  value: number;
  color: string;
};

export function DonutChart({
  data,
  size = 200,
  centerLabel,
  centerValue,
}: {
  data: DonutSlice[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const theme = useTheme();
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR * 0.55;

  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;

  const slices = useMemo(() => {
    let cumAngle = -Math.PI / 2;
    return data.map((slice) => {
      const angle = (slice.value / total) * Math.PI * 2;
      const startAngle = cumAngle;
      cumAngle += angle;
      const endAngle = cumAngle;

      const x1 = cx + outerR * Math.cos(startAngle);
      const y1 = cy + outerR * Math.sin(startAngle);
      const x2 = cx + outerR * Math.cos(endAngle);
      const y2 = cy + outerR * Math.sin(endAngle);
      const x3 = cx + innerR * Math.cos(endAngle);
      const y3 = cy + innerR * Math.sin(endAngle);
      const x4 = cx + innerR * Math.cos(startAngle);
      const y4 = cy + innerR * Math.sin(startAngle);

      const largeArc = angle > Math.PI ? 1 : 0;

      const d = [
        `M${x1},${y1}`,
        `A${outerR},${outerR} 0 ${largeArc} 1 ${x2},${y2}`,
        `L${x3},${y3}`,
        `A${innerR},${innerR} 0 ${largeArc} 0 ${x4},${y4}`,
        'Z',
      ].join(' ');

      return { d, color: slice.color, label: slice.label };
    });
  }, [data, total, cx, cy, outerR, innerR]);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((slice, i) => (
          <Path key={i} d={slice.d} fill={slice.color} stroke={theme.surfaceContainerLowest} strokeWidth={2} />
        ))}
        {centerValue && (
          <SvgText x={cx} y={cy - 4} fill={theme.onSurface} fontSize={14} fontWeight="700" textAnchor="middle">
            {centerValue}
          </SvgText>
        )}
        {centerLabel && (
          <SvgText x={cx} y={cy + 14} fill={theme.textSecondary} fontSize={10} textAnchor="middle">
            {centerLabel}
          </SvgText>
        )}
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Horizontal Bar Chart (fee categories as proportion of revenue)
// ---------------------------------------------------------------------------

type BarDataPoint = {
  label: string;
  value: number;
  color: string;
};

export function HorizontalBarChart({
  data,
  height = 200,
}: {
  data: BarDataPoint[];
  height?: number;
}) {
  const theme = useTheme();
  const chartWidth = 320;
  const padding = { top: 10, right: 10, bottom: 10, left: 80 };
  const innerW = chartWidth - padding.left - padding.right;
  const barHeight = Math.min(24, (height - padding.top - padding.bottom) / data.length - 8);
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={chartWidth} height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
        <G x={padding.left} y={padding.top}>
          {data.map((item, i) => {
            const y = i * (barHeight + 8);
            const width = (item.value / maxVal) * innerW;
            return (
              <G key={item.label}>
                <SvgText x={-8} y={y + barHeight / 2 + 4} fill={theme.textSecondary} fontSize={10} textAnchor="end">
                  {item.label}
                </SvgText>
                <Rect x={0} y={y} width={innerW} height={barHeight} rx={4} fill={theme.backgroundElement} />
                <Rect x={0} y={y} width={Math.max(width, 2)} height={barHeight} rx={4} fill={item.color} />
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Grouped Bar Chart (Revenue vs Costs vs Net Profit)
// ---------------------------------------------------------------------------

type GroupedBarData = {
  label: string;
  value: number;
  color: string;
};

export function GroupedBarChart({
  data,
  height = 200,
}: {
  data: GroupedBarData[];
  height?: number;
}) {
  const theme = useTheme();
  const chartWidth = 320;
  const padding = { top: 10, right: 10, bottom: 40, left: 50 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  const barWidth = Math.min(48, innerW / data.length - 16);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={chartWidth} height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
        <G x={padding.left} y={padding.top}>
          {/* Baseline */}
          <Path d={`M0,${innerH} L${innerW},${innerH}`} stroke={theme.border} strokeWidth={1} />
          {data.map((item, i) => {
            const x = (i / data.length) * innerW + (innerW / data.length - barWidth) / 2;
            const barH = (Math.abs(item.value) / maxVal) * innerH;
            const y = innerH - barH;
            return (
              <G key={item.label}>
                <Rect x={x} y={y} width={barWidth} height={barH} rx={4} fill={item.color} />
                <SvgText x={x + barWidth / 2} y={innerH + 16} fill={theme.textSecondary} fontSize={9} textAnchor="middle">
                  {item.label}
                </SvgText>
                <SvgText x={x + barWidth / 2} y={y - 6} fill={item.color} fontSize={9} fontWeight="600" textAnchor="middle">
                  {(item.value / 1000).toFixed(0)}K
                </SvgText>
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Stacked Bar Chart (payout breakdown)
// ---------------------------------------------------------------------------

type StackedBarData = {
  label: string;
  segments: { value: number; color: string }[];
};

export function StackedBarChart({
  data,
  height = 200,
}: {
  data: StackedBarData[];
  height?: number;
}) {
  const theme = useTheme();
  const chartWidth = 320;
  const padding = { top: 10, right: 10, bottom: 40, left: 50 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxTotal = Math.max(...data.map((d) => d.segments.reduce((s, seg) => s + Math.abs(seg.value), 0)), 1);
  const barWidth = Math.min(32, innerW / data.length - 8);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={chartWidth} height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
        <G x={padding.left} y={padding.top}>
          {data.map((item, i) => {
            const x = (i / data.length) * innerW + (innerW / data.length - barWidth) / 2;
            let cumY = innerH;
            return (
              <G key={item.label}>
                {item.segments.map((seg, j) => {
                  const segH = (Math.abs(seg.value) / maxTotal) * innerH;
                  cumY -= segH;
                  return <Rect key={j} x={x} y={cumY} width={barWidth} height={Math.max(segH, 1)} rx={2} fill={seg.color} />;
                })}
                <SvgText x={x + barWidth / 2} y={innerH + 16} fill={theme.textSecondary} fontSize={8} textAnchor="middle">
                  {item.label}
                </SvgText>
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Chart Legend
// ---------------------------------------------------------------------------

export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  const theme = useTheme();
  return (
    <View style={legendStyles.row}>
      {items.map((item) => (
        <View key={item.label} style={legendStyles.item}>
          <View style={[legendStyles.dot, { backgroundColor: item.color }]} />
          <Text style={[legendStyles.label, { color: theme.textSecondary }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const legendStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 11,
  },
});
