import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthField, PressableScale } from '@/components/auth-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useProduct } from '@/hooks/use-product';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, createProduct, updateProduct } from '@/lib/api';

type FieldErrors = Partial<Record<'title' | 'price' | 'description' | 'image' | 'category', string>>;

export default function ProductFormScreen() {
  const theme = useTheme();
  const { accessToken } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditMode = Boolean(id);
  const { product, isLoading: isLoadingProduct } = useProduct(id);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prefill from the fetched product once it loads (edit mode only).
  useEffect(() => {
    if (!product) return;
    setTitle(product.title);
    setPrice(String(product.price));
    setCategory(product.category);
    setImage(product.image);
    setDescription(product.description);
  }, [product]);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (title.trim().length < 3) errors.title = 'Title must be at least 3 characters.';
    const priceNumber = Number(price);
    if (!price.trim() || Number.isNaN(priceNumber) || priceNumber < 0) {
      errors.price = 'Enter a valid price.';
    }
    if (!description.trim()) errors.description = 'Description is required.';
    if (!image.trim()) errors.image = 'Image URL is required.';
    if (!category.trim()) errors.category = 'Category is required.';
    return errors;
  }

  async function handleSubmit() {
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !accessToken) return;

    setFormError(null);
    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        price: Number(price),
        description: description.trim(),
        image: image.trim(),
        category: category.trim(),
      };
      if (isEditMode && product?.id) {
        await updateProduct(accessToken, { id: product.id, ...payload });
      } else {
        await createProduct(accessToken, payload);
      }
      router.back();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ThemedText type="headlineSm">←</ThemedText>
          </Pressable>
          <ThemedText type="headlineSm">{isEditMode ? 'Edit Product' : 'Add Product'}</ThemedText>
          <View style={styles.topRowSpacer} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag">
          {isEditMode && isLoadingProduct && !product ? (
            <View style={styles.statusBlock}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText type="bodyMd" themeColor="textSecondary">
                Loading product…
              </ThemedText>
            </View>
          ) : (
            <View style={styles.form}>
              <AuthField
                label="Title"
                value={title}
                onChangeText={setTitle}
                placeholder="Blue Hoodie"
                autoCapitalize="words"
                error={fieldErrors.title}
              />
              <AuthField
                label="Price (PKR)"
                value={price}
                onChangeText={setPrice}
                placeholder="2500"
                keyboardType="decimal-pad"
                error={fieldErrors.price}
              />
              <AuthField
                label="Category"
                value={category}
                onChangeText={setCategory}
                placeholder="Apparel"
                autoCapitalize="words"
                error={fieldErrors.category}
              />
              <AuthField
                label="Image URL"
                value={image}
                onChangeText={setImage}
                placeholder="https://…"
                keyboardType="url"
                error={fieldErrors.image}
              />
              <AuthField
                label="Description"
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the product…"
                multiline
                numberOfLines={4}
                error={fieldErrors.description}
              />

              {formError && (
                <ThemedText type="bodySm" themeColor="danger" style={styles.centerText}>
                  {formError}
                </ThemedText>
              )}

              <PressableScale
                disabled={isSubmitting}
                onPress={handleSubmit}
                style={[styles.ctaButton, { backgroundColor: theme.primary }]}>
                {isSubmitting ? (
                  <ActivityIndicator color={theme.onPrimary} />
                ) : (
                  <ThemedText type="bodyLg" themeColor="onPrimary" style={styles.ctaLabel}>
                    {isEditMode ? 'Save Changes' : 'Add Product'}
                  </ThemedText>
                )}
              </PressableScale>
            </View>
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
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
  },
  statusBlock: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  centerText: {
    textAlign: 'center',
  },
  form: {
    gap: Spacing.three,
  },
  ctaButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.DEFAULT,
    paddingVertical: Spacing.three,
  },
  ctaLabel: {
    fontWeight: '600',
  },
});
