import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListRow, ListSection } from '@/components/list-kit';
import { formatPrice } from '@/components/product-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useProduct } from '@/hooks/use-product';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, deleteProduct } from '@/lib/api';

export default function ProductDetailScreen() {
  const theme = useTheme();
  const { accessToken } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { product, isLoading, error, refetch } = useProduct(id);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleDelete() {
    if (!product?.id || !accessToken) return;
    Alert.alert('Delete product', `Delete "${product.title}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleteError(null);
          setIsDeleting(true);
          try {
            await deleteProduct(accessToken, product.id!);
            router.back();
          } catch (err) {
            setDeleteError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ThemedText type="headlineSm">←</ThemedText>
          </Pressable>
          <ThemedText type="headlineSm">Product</ThemedText>
          <View style={styles.topRowSpacer} />
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          {isLoading && (
            <View style={styles.statusBlock}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText type="bodyMd" themeColor="textSecondary">
                Loading product…
              </ThemedText>
            </View>
          )}

          {!isLoading && error && (
            <View style={styles.statusBlock}>
              <ThemedText type="bodyMd" themeColor="danger" style={styles.centerText}>
                {error}
              </ThemedText>
              <Pressable onPress={refetch} hitSlop={8}>
                <ThemedText type="bodyMd" themeColor="primary" style={styles.retryText}>
                  Try again
                </ThemedText>
              </Pressable>
            </View>
          )}

          {!isLoading && !error && product && (
            <>
              <View style={[styles.imageWrapper, { backgroundColor: theme.backgroundElement }]}>
                {product.image ? (
                  <Image source={{ uri: product.image }} style={styles.image} contentFit="cover" />
                ) : null}
              </View>

              <View style={styles.headerBlock}>
                <ThemedText type="headlineMd">{product.title}</ThemedText>
                <ThemedText type="headlineSm" themeColor="primary">
                  {formatPrice(product.price)}
                </ThemedText>
              </View>

              <ListSection>
                <ListRow label="Category" value={product.category} showChevron={false} />
                <ListRow label="Price" value={formatPrice(product.price)} showChevron={false} isLast />
              </ListSection>

              <View style={styles.descriptionBlock}>
                <ThemedText type="labelMd" themeColor="textSecondary">
                  DESCRIPTION
                </ThemedText>
                <ThemedText type="bodyMd">{product.description}</ThemedText>
              </View>

              {deleteError && (
                <ThemedText type="bodySm" themeColor="danger" style={styles.centerText}>
                  {deleteError}
                </ThemedText>
              )}

              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => router.push({ pathname: '/product-form', params: { id: product.id ?? '' } })}
                  style={[styles.editButton, { backgroundColor: theme.primary }]}>
                  <ThemedText type="bodyLg" themeColor="onPrimary" style={styles.actionLabel}>
                    Edit
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleDelete}
                  disabled={isDeleting}
                  style={[styles.deleteButton, { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest }]}>
                  {isDeleting ? (
                    <ActivityIndicator color={theme.danger} />
                  ) : (
                    <ThemedText type="bodyLg" themeColor="danger" style={styles.actionLabel}>
                      Delete
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.three,
  },
  topRowSpacer: {
    width: 20,
  },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.four,
  },
  statusBlock: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  centerText: {
    textAlign: 'center',
  },
  retryText: {
    textDecorationLine: 'underline',
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  headerBlock: {
    gap: Spacing.one,
  },
  descriptionBlock: {
    gap: Spacing.one,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  editButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.DEFAULT,
    paddingVertical: Spacing.three,
  },
  deleteButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.DEFAULT,
    paddingVertical: Spacing.three,
  },
  actionLabel: {
    fontWeight: '600',
  },
});
