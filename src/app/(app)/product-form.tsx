import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
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
import {
  ApiError,
  createNewDarazProduct,
  createProduct,
  cleanupMarketplaceProductImages,
  generateProductListing,
  getDarazAllCategories,
  getDarazCategoryAttributes,
  getMarketplaceConnections,
  migrateDarazImage,
  type DarazCategory,
  type DarazCategoryAttribute,
  type DarazCreateProductPayload,
  type ExpoMarketplaceImageAsset,
  type ProductPlatform,
  uploadMarketplaceProductImages,
  type MarketplaceConnection,
  UnsupportedBackendCapabilityError,
  updateProduct,
} from '@/lib/api';

type FieldErrors = Partial<Record<'title' | 'price' | 'description' | 'image' | 'category', string>>;
type PublishProgress = 'idle' | 'loading_connections' | 'validating' | 'uploading_images' | 'migrating_images' | 'creating_product' | 'completed' | 'failed';

const AUTOMATIC_DARAZ_ATTRIBUTES = new Set(['name', 'name_en', 'title', 'description', 'short_description']);
const isDarazFlagEnabled = (value: string | number | boolean) =>
  value === true || value === 1 || value === '1';

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
  const [platform, setPlatform] = useState<ProductPlatform | null>(null);
  const [selectedDarazCategoryId, setSelectedDarazCategoryId] = useState<string | null>(null);
  const [selectedImageAssets, setSelectedImageAssets] = useState<ExpoMarketplaceImageAsset[]>([]);
  const [connections, setConnections] = useState<MarketplaceConnection[]>([]);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
  const [connectionsReloadKey, setConnectionsReloadKey] = useState(0);
  const [isLoadingConnections, setIsLoadingConnections] = useState(!isEditMode);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [darazCategories, setDarazCategories] = useState<DarazCategory[]>([]);
  const [darazCategoryPath, setDarazCategoryPath] = useState<DarazCategory[]>([]);
  const [darazCategoriesError, setDarazCategoriesError] = useState<string | null>(null);
  const [publishProgress, setPublishProgress] = useState<PublishProgress>(isEditMode ? 'idle' : 'loading_connections');
  const [darazCategoryAttributes, setDarazCategoryAttributes] = useState<DarazCategoryAttribute[]>([]);
  const [darazAttributeValues, setDarazAttributeValues] = useState<Record<string, string>>({});
  const [isLoadingDarazAttributes, setIsLoadingDarazAttributes] = useState(false);
  const [darazAttributesError, setDarazAttributesError] = useState<string | null>(null);
  const [hasLoadedDarazAttributes, setHasLoadedDarazAttributes] = useState(false);

  useEffect(() => {
    if (isEditMode || !accessToken) return;
    let cancelled = false;
    setIsLoadingConnections(true);
    setConnectionsError(null);
    setPublishProgress('loading_connections');
    getMarketplaceConnections(accessToken)
      .then((records) => {
        if (cancelled) return;
        const active = records.filter((record) => {
          const slug = record.marketplace?.slug?.toLowerCase();
          return (slug === 'daraz' || slug === 'shopify') && !!record.encrypted_access_token && record.marketplace?.is_connected !== false;
        });
        setConnections(active);
        setPlatform((current) => {
          if (current && active.some((record) => record.marketplace?.slug === current)) return current;
          return (active[0]?.marketplace?.slug as ProductPlatform | undefined) ?? null;
        });
        setPublishProgress('idle');
      })
      .catch((err) => {
        if (cancelled) return;
        setConnections([]);
        setPlatform(null);
        setConnectionsError(err instanceof ApiError ? err.message : 'Could not load marketplace connections.');
        setPublishProgress('failed');
      })
      .finally(() => { if (!cancelled) setIsLoadingConnections(false); });
    return () => { cancelled = true; };
  }, [accessToken, connectionsReloadKey, isEditMode]);

  useEffect(() => {
    if (!accessToken || platform !== 'daraz') {
      setDarazCategories([]);
      setDarazCategoryPath([]);
      setDarazCategoriesError(null);
      setSelectedDarazCategoryId(null);
      return;
    }

    let cancelled = false;
    setDarazCategories([]);
    setDarazCategoriesError(null);
    getDarazAllCategories(accessToken)
      .then((categories) => {
        if (cancelled) return;
        setDarazCategories(categories);
        setDarazCategoryPath([]);
        setSelectedDarazCategoryId(null);
        setCategory('');
      })
      .catch((err) => {
        if (!cancelled) {
          setDarazCategories([]);
          setDarazCategoriesError(err instanceof ApiError ? err.message : 'Could not load live Daraz categories.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, platform]);

  useEffect(() => {
    setDarazCategoryAttributes([]);
    setHasLoadedDarazAttributes(false);
    setDarazAttributeValues({});
    setDarazAttributesError(null);
    if (!accessToken || !selectedDarazCategoryId || platform !== 'daraz') {
      setIsLoadingDarazAttributes(false);
      return;
    }

    const connection = connections.find((record) => record.marketplace?.slug === 'daraz');
    if (!connection?.encrypted_access_token) {
      setDarazAttributesError('The Daraz connection is not active.');
      return;
    }

    let cancelled = false;
    setIsLoadingDarazAttributes(true);
    getDarazCategoryAttributes(accessToken, connection.encrypted_access_token, selectedDarazCategoryId)
      .then((attributes) => {
        if (!cancelled) {
          setDarazCategoryAttributes(attributes);
          setHasLoadedDarazAttributes(true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setDarazAttributesError(err instanceof ApiError ? err.message : 'Could not load required Daraz attributes.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDarazAttributes(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, connections, platform, selectedDarazCategoryId]);

  // Prefill from the fetched product once it loads (edit mode only).
  useEffect(() => {
    if (!product) return;
    setTitle(product.title);
    setPrice(String(product.price));
    setCategory(product.category);
    setImage(product.image);
    setDescription(product.description);
  }, [product]);

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFormError('Photo access is required to choose a product image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 8,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length) {
      const assets = result.assets.map((asset) => ({
        uri: asset.uri, fileName: asset.fileName ?? 'product-image',
        mimeType: asset.mimeType ?? 'image/jpeg', fileSize: asset.fileSize ?? 0,
        width: asset.width, height: asset.height,
      }));
      const invalid = assets.find((asset) => !['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType) || (asset.fileSize ?? 0) > 5 * 1024 * 1024);
      if (invalid) {
        setFormError('Images must be JPEG, PNG, or WebP and no larger than 5 MB.');
        return;
      }
      const darazInvalid = platform === 'daraz' && assets.find(
        (asset) => !['image/jpeg', 'image/png'].includes(asset.mimeType) || (asset.fileSize ?? 0) > 1024 * 1024,
      );
      if (darazInvalid) {
        setFormError('Daraz migration accepts only JPEG or PNG images up to 1 MB.');
        return;
      }
      setSelectedImageAssets(assets);
      setImage(assets[0].uri);
      setFormError(null);
    }
  }

  async function handleGenerate() {
    if (!accessToken || !image.trim()) {
      setFormError('Choose an image before generating a listing.');
      return;
    }
    setIsGenerating(true);
    setFormError(null);
    try {
      const listing = await generateProductListing(accessToken, { imageUri: image, category });
      setTitle(listing.title);
      setDescription(listing.description);
      setCategory(listing.category);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not generate a listing.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handlePublish() {
    if (isPublishing) return;
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !accessToken || !platform) return;
    const activeConnection = connections.find((record) => record.marketplace?.slug === platform);
    if (!activeConnection?.encrypted_access_token) {
      setFormError('The selected marketplace connection is no longer active.');
      return;
    }
    if (platform === 'shopify') {
      setFormError('Shopify product publishing is not available in the connected backend yet.');
      return;
    }
    if (!selectedDarazCategoryId) {
      setFormError('Choose a live Daraz category before publishing.');
      return;
    }
    const resolveDarazAttributeValue = (attribute: DarazCategoryAttribute): string => {
      if (attribute.name === 'name' || attribute.name === 'name_en' || attribute.name === 'title') return title.trim();
      if (attribute.name === 'description' || attribute.name === 'short_description') return description.trim();
      return darazAttributeValues[attribute.name]?.trim() ?? '';
    };
    if (isLoadingDarazAttributes) {
      setFormError('Wait for Daraz category attributes to finish loading.');
      return;
    }
    if (darazAttributesError) {
      setFormError(darazAttributesError);
      return;
    }
    if (!hasLoadedDarazAttributes) {
      setFormError('Daraz category attributes have not loaded. Select the leaf category again.');
      return;
    }
    const missingAttributes = darazCategoryAttributes.filter(
      (attribute) => isDarazFlagEnabled(attribute.is_mandatory) && !resolveDarazAttributeValue(attribute),
    );
    if (missingAttributes.length > 0) {
      setFormError('Complete required Daraz attributes: ' + missingAttributes.map((attribute) => attribute.label).join(', '));
      return;
    }
    if (!selectedImageAssets.length) {
      setFormError('Choose at least one product image to upload.');
      return;
    }

    setIsPublishing(true);
    setFormError(null);
    setPublishMessage(null);
    setPublishProgress('validating');
    let uploadedPaths: string[] = [];

    try {
      const priceNumber = Number(price);
      if (!Number.isFinite(priceNumber) || priceNumber <= 0) throw new ApiError(400, 'Enter a valid positive price.');
      setPublishProgress('uploading_images');
      const uploadResult = await uploadMarketplaceProductImages(accessToken, platform, selectedImageAssets);
      uploadedPaths = uploadResult.uploaded.map((entry) => entry.path);
      if (uploadResult.failed.length) throw new ApiError(400, uploadResult.failed[0].error || 'One or more image uploads failed.');
      const uploadedUrls = uploadResult.uploaded.map((entry) => entry.public_url);
      if (!uploadedUrls.length) throw new ApiError(400, 'No image uploads succeeded.');

      setPublishProgress('migrating_images');
      const migratedUrls = await Promise.all(uploadedUrls.map(async (publicUrl) => {
        const migrated = await migrateDarazImage(accessToken, activeConnection.encrypted_access_token!, publicUrl);
        return migrated.imageUrl;
      }));

      const sanitizedAttributes: Record<string, string> = {
        name: title.trim(),
        name_en: title.trim(),
        title: title.trim(),
        short_description: description.trim(),
        description: description.trim(),
      };
      const skuSaleAttributes: Record<string, string> = {};
      for (const attribute of darazCategoryAttributes) {
        const value = resolveDarazAttributeValue(attribute);
        if (!value || AUTOMATIC_DARAZ_ATTRIBUTES.has(attribute.name)) continue;
        if (isDarazFlagEnabled(attribute.is_sale_prop)) skuSaleAttributes[attribute.name] = value;
        else sanitizedAttributes[attribute.name] = value;
      }

      const payload: DarazCreateProductPayload = {
        PrimaryCategory: Number(selectedDarazCategoryId),
        Title: title.trim(),
        Images: migratedUrls,
        Attributes: sanitizedAttributes,
        Skus: [{
          SellerSku: (title.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-+/g, '-').toLowerCase() || 'daraz-product') + '-' + Date.now(),
          ...skuSaleAttributes,
          quantity: 1,
          price: priceNumber,
          package_length: 10,
          package_height: 10,
          package_weight: 1,
          package_width: 10,
          package_content: description.trim() || title.trim(),
          Images: migratedUrls,
        }],
      };

      setPublishProgress('creating_product');
      const response = await createNewDarazProduct(accessToken, activeConnection.encrypted_access_token, payload);
      setPublishProgress('completed');
      setPublishMessage(response.item_id ? 'Daraz listing created successfully (item ' + response.item_id + ').' : response.message || 'Daraz listing created successfully.');
      setFieldErrors({});
      setTitle(''); setPrice(''); setCategory(''); setImage(''); setDescription('');
      setDarazAttributeValues({}); setSelectedDarazCategoryId(null); setDarazCategoryPath([]); setSelectedImageAssets([]);
      setTimeout(() => router.back(), 1200);
    } catch (err) {
      setPublishProgress('failed');
      setFormError(err instanceof ApiError || err instanceof UnsupportedBackendCapabilityError ? err.message : 'Could not publish the product.');
      if (uploadedPaths.length) cleanupMarketplaceProductImages(accessToken, uploadedPaths).catch(() => undefined);
    } finally {
      setIsPublishing(false);
    }
  }

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
        await updateProduct(accessToken, { id: product.id, url: product.url, ...payload });
      } else {
        await createProduct(accessToken, { ...payload, url: '' });
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
          ) : !isEditMode && isLoadingConnections ? (
            <View style={styles.statusBlock}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText type="bodyMd">Loading marketplace connections...</ThemedText>
            </View>
          ) : !isEditMode && connectionsError ? (
            <View style={styles.statusBlock}>
              <ThemedText type="bodyMd" themeColor="danger">{connectionsError}</ThemedText>
              <Pressable onPress={() => setConnectionsReloadKey((value) => value + 1)} style={[styles.secondaryButton, { borderColor: theme.primary }]}>
                <ThemedText type="bodyMd" themeColor="primary">Retry</ThemedText>
              </Pressable>
            </View>
          ) : !isEditMode && connections.length === 0 ? (
            <View style={styles.statusBlock}>
              <ThemedText type="headlineSm">No marketplace connected.</ThemedText>
              <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.centerText}>Connect a marketplace before posting a product.</ThemedText>
              <Pressable onPress={() => router.push('/connect-stores')} style={[styles.secondaryButton, { borderColor: theme.primary }]}>
                <ThemedText type="bodyMd" themeColor="primary">Connect Marketplace</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              {!isEditMode && <>
                <ThemedText type="labelMd" themeColor="textSecondary">CONNECTED MARKETPLACE</ThemedText>
                <View style={styles.platformRow}>
                  {connections.map((connection) => {
                    const option = connection.marketplace!.slug as ProductPlatform;
                    return (
                      <Pressable key={connection.id} disabled={isPublishing || connections.length === 1} onPress={() => {
                        setPlatform(option); setSelectedDarazCategoryId(null); setCategory('');
                        setDarazAttributeValues({}); setFormError(null);
                      }} style={[styles.platformButton, { borderColor: theme.border }, platform === option && { backgroundColor: theme.primaryContainer, borderColor: theme.primary }]}>
                        <Image source={{ uri: connection.marketplace!.logo_url }} style={styles.marketplaceLogo} contentFit="contain" />
                        <ThemedText type="bodyMd" themeColor={platform === option ? 'onPrimaryContainer' : 'text'}>{connection.marketplace!.name}</ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
                {platform === 'shopify' && <ThemedText type="bodySm" themeColor="textSecondary">Shopify publishing is not available in the backend yet.</ThemedText>}
              </>}
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
              {platform === 'daraz' && <><ThemedText type="labelMd" themeColor="textSecondary">DARAZ CATEGORY</ThemedText>
                {darazCategoriesError && (
                  <ThemedText type="bodySm" themeColor="danger">{darazCategoriesError}</ThemedText>
                )}
                {darazCategoryPath.length > 0 && (
                  <View style={styles.categoryRow}>
                    <Pressable
                      onPress={() => {
                        setDarazCategoryPath((current) => current.slice(0, -1));
                        setSelectedDarazCategoryId(null);
                        setCategory('');
                      }}
                      style={[styles.categoryChip, { borderColor: theme.border }]}>
                      <ThemedText type="bodySm">Back</ThemedText>
                    </Pressable>
                    <ThemedText type="bodySm" themeColor="textSecondary">
                      {darazCategoryPath.map((entry) => entry.name ?? entry.category_name).join(' / ')}
                    </ThemedText>
                  </View>
                )}
                <View style={styles.categoryRow}>
                  {(darazCategoryPath.at(-1)?.children ?? darazCategories).map((option) => {
                    const optionId = String(option.id ?? option.category_id ?? '');
                    const optionName = option.name ?? option.category_name ?? 'Unnamed category';
                    const activeChildren = (option.children ?? []).filter(
                      (child) => child.is_active !== false && !['inactive', 'disabled', 'deleted'].includes(child.status?.toLowerCase() ?? ''),
                    );
                    const isLeafCategory = option.leaf === true || (option.leaf == null && activeChildren.length === 0);
                    return (
                      <Pressable
                        key={optionId || optionName}
                        onPress={() => {
                          if (!isLeafCategory && activeChildren.length > 0) {
                            setDarazCategoryPath((current) => [...current, { ...option, children: activeChildren }]);
                            setSelectedDarazCategoryId(null);
                            setCategory('');
                            return;
                          }
                          if (!isLeafCategory) {
                            setFormError('This category has no selectable leaf categories.');
                            return;
                          }
                          setCategory([...darazCategoryPath.map((entry) => entry.name ?? entry.category_name ?? ''), optionName].filter(Boolean).join(' / '));
                          setSelectedDarazCategoryId(optionId);
                        }}
                        style={[styles.categoryChip, { borderColor: theme.border }, selectedDarazCategoryId === optionId && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                        <ThemedText type="bodySm" themeColor={selectedDarazCategoryId === optionId ? 'onPrimary' : 'text'}>
                          {optionName}{!isLeafCategory ? ' >' : ''}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View></>}
              {isEditMode && <AuthField
                label="Image URL"
                value={image}
                onChangeText={setImage}
                placeholder="https://…"
                keyboardType="url"
                error={fieldErrors.image}
              />}
              <View style={styles.imageActions}>
                <Pressable onPress={handlePickImage} style={[styles.secondaryButton, { borderColor: theme.border }]}>
                  <ThemedText type="bodyMd" themeColor="primary">Choose image</ThemedText>
                </Pressable>
                <View style={styles.previewRow}>
                  {selectedImageAssets.map((asset) => <Image key={asset.uri} source={{ uri: asset.uri }} style={styles.preview} contentFit="cover" />)}
                </View>
                <Pressable onPress={handleGenerate} disabled={isGenerating} style={[styles.secondaryButton, { borderColor: theme.border }]}>
                  {isGenerating ? <ActivityIndicator color={theme.primary} /> : <ThemedText type="bodyMd" themeColor="primary">Generate with AI</ThemedText>}
                </Pressable>
              </View>
              {platform === 'daraz' && selectedDarazCategoryId && <>
                <ThemedText type="labelMd" themeColor="textSecondary">DARAZ CATEGORY ATTRIBUTES</ThemedText>
                {isLoadingDarazAttributes && <ActivityIndicator color={theme.primary} />}
                {darazAttributesError && <ThemedText type="bodySm" themeColor="danger">{darazAttributesError}</ThemedText>}
                {!isLoadingDarazAttributes && !darazAttributesError && darazCategoryAttributes
                  .filter((attribute) => !AUTOMATIC_DARAZ_ATTRIBUTES.has(attribute.name))
                  .map((attribute) => {
                    const value = darazAttributeValues[attribute.name] ?? '';
                    const requiredLabel = attribute.label + (isDarazFlagEnabled(attribute.is_mandatory) ? ' *' : '');
                    if (attribute.options.length > 0) {
                      return (
                        <View key={attribute.name}>
                          <ThemedText type="bodySm" themeColor="textSecondary">{requiredLabel}</ThemedText>
                          <View style={styles.categoryRow}>
                            {attribute.options.map((option) => (
                              <Pressable
                                key={option.name}
                                onPress={() => setDarazAttributeValues((current) => ({ ...current, [attribute.name]: option.name }))}
                                style={[styles.categoryChip, { borderColor: theme.border }, value === option.name && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                                <ThemedText type="bodySm" themeColor={value === option.name ? 'onPrimary' : 'text'}>{option.name}</ThemedText>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      );
                    }
                    return (
                      <AuthField
                        key={attribute.name}
                        label={requiredLabel}
                        value={value}
                        onChangeText={(nextValue) => setDarazAttributeValues((current) => ({ ...current, [attribute.name]: nextValue }))}
                        placeholder={attribute.input_type === 'numeric' ? 'Enter a number' : 'Enter ' + attribute.label.toLowerCase()}
                        keyboardType={attribute.input_type === 'numeric' ? 'decimal-pad' : 'default'}
                      />
                    );
                  })}
                {hasLoadedDarazAttributes && darazCategoryAttributes.filter((attribute) => !AUTOMATIC_DARAZ_ATTRIBUTES.has(attribute.name)).length === 0 && (
                  <ThemedText type="bodySm" themeColor="textSecondary">No additional attributes are required for this category.</ThemedText>
                )}
              </>}
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
              {publishMessage && <ThemedText type="bodySm" themeColor="success" style={styles.centerText}>{publishMessage}</ThemedText>}

              {isEditMode ? <PressableScale
                disabled={isSubmitting}
                onPress={handleSubmit}
                style={[styles.ctaButton, { backgroundColor: theme.primary }]}>
                {isSubmitting ? (
                  <ActivityIndicator color={theme.onPrimary} />
                ) : (
                  <ThemedText type="bodyLg" themeColor="onPrimary" style={styles.ctaLabel}>
                    Save Changes
                  </ThemedText>
                )}
              </PressableScale> : <PressableScale disabled={isPublishing || !platform || platform === 'shopify' || (platform === 'daraz' && (darazCategories.length === 0 || !!darazCategoriesError))} onPress={handlePublish} style={[styles.ctaButton, { backgroundColor: theme.primary }]}>
                {isPublishing ? <ActivityIndicator color={theme.onPrimary} /> : <ThemedText type="bodyLg" themeColor="onPrimary" style={styles.ctaLabel}>{platform === 'shopify' ? 'Shopify Publishing Unavailable' : 'Publish to Daraz (' + publishProgress + ')'}</ThemedText>}
              </PressableScale>}
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
  platformRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  platformButton: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.DEFAULT,
    paddingVertical: Spacing.two,
    gap: Spacing.one,
  },
  marketplaceLogo: { width: 28, height: 28 },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  imageActions: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  previewRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.two },
  secondaryButton: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.DEFAULT,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  preview: {
    width: 120,
    height: 120,
    borderRadius: Radius.sm,
  },
  secondaryCta: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.DEFAULT,
    paddingVertical: Spacing.three,
  },
});
