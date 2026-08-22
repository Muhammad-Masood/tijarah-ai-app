import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Pulsing placeholder block used to build skeleton loading states. */
export function Skeleton({
  width = '100%',
  height,
  radius = Radius.sm,
  style,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, borderRadius: radius, backgroundColor: theme.backgroundElement },
        height !== undefined && { height },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Skeleton placeholder matching the shape of a ProductRow. */
export function ProductRowSkeleton() {
  const theme = useTheme();

  return (
    <View style={[styles.row, { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest }]}>
      <Skeleton width={48} height={48} radius={Radius.DEFAULT} />
      <View style={styles.body}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="40%" height={12} />
      </View>
      <Skeleton width={56} height={14} />
    </View>
  );
}

/** Stack of ProductRow skeletons for list loading states. */
export function ProductListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <ProductRowSkeleton key={index} />
      ))}
    </View>
  );
}

/** Skeleton placeholder matching the Product Detail screen layout. */
export function ProductDetailSkeleton() {
  return (
    <View style={styles.detail}>
      <Skeleton width="100%" radius={Radius.md} style={styles.detailImage} />

      <View style={styles.detailHeader}>
        <Skeleton width="70%" height={22} />
        <Skeleton width="35%" height={18} />
      </View>

      <View style={styles.detailBadgeRow}>
        <Skeleton width={72} height={22} radius={Radius.full} />
        <Skeleton width={72} height={22} radius={Radius.full} />
      </View>

      <View style={styles.detailListSection}>
        <Skeleton width="100%" height={44} radius={0} />
        <Skeleton width="100%" height={44} radius={0} />
        <Skeleton width="100%" height={44} radius={0} />
      </View>

      <View style={styles.detailDescription}>
        <Skeleton width="30%" height={12} />
        <Skeleton width="100%" height={14} />
        <Skeleton width="100%" height={14} />
        <Skeleton width="60%" height={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.two,
  },
  body: {
    flex: 1,
    gap: Spacing.half,
  },
  list: {
    gap: Spacing.two,
  },
  detail: {
    gap: Spacing.four,
  },
  detailImage: {
    aspectRatio: 4 / 3,
  },
  detailHeader: {
    gap: Spacing.one,
  },
  detailBadgeRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  detailListSection: {
    gap: 1,
    overflow: 'hidden',
    borderRadius: Radius.md,
  },
  detailDescription: {
    gap: Spacing.two,
  },
});
