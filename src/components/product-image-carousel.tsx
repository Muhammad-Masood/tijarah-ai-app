import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Horizontally paged, dot-indexed image gallery used at the top of the product detail screen. */
export function ProductImageCarousel({ images }: { images: string[] }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!width) return;
      const index = Math.round(event.nativeEvent.contentOffset.x / width);
      setActiveIndex(index);
    },
    [width],
  );

  return (
    <View>
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={[styles.imageWrapper, { backgroundColor: theme.backgroundElement }]}>
        {images.length > 0 && width > 0 && (
          <FlatList
            data={images}
            keyExtractor={(uri, index) => `${uri}-${index}`}
            renderItem={({ item }) => <Image source={{ uri: item }} style={[styles.image, { width }]} contentFit="cover" />}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          />
        )}
      </View>

      {images.length > 1 && (
        <View style={styles.dotsRow}>
          {images.map((uri, index) => (
            <View
              key={`${uri}-${index}`}
              style={[
                styles.dot,
                {
                  width: index === activeIndex ? 16 : 6,
                  backgroundColor: index === activeIndex ? theme.primary : theme.border,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  imageWrapper: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  image: {
    height: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  dot: {
    height: 6,
    borderRadius: Radius.full,
  },
});
