import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
const CATEGORY_METADATA_ATTRIBUTES = new Set(['category', 'primary_category', 'PrimaryCategory', 'category_id']);
const isRenderableDarazAttribute = (attribute: DarazCategoryAttribute) => !AUTOMATIC_DARAZ_ATTRIBUTES.has(attribute.name) && !CATEGORY_METADATA_ATTRIBUTES.has(attribute.name);
const isDateAttribute = (attribute: DarazCategoryAttribute) => {
  const metadata = `${attribute.input_type} ${attribute.attribute_type ?? ''}`.toLowerCase();
  return metadata.includes('date') || metadata.includes('time');
};
const isDateTimeAttribute = (attribute: DarazCategoryAttribute) => {
  const metadata = `${attribute.input_type} ${attribute.attribute_type ?? ''}`.toLowerCase();
  return metadata.includes('datetime') || metadata.includes('date_time') || (metadata.includes('date') && metadata.includes('time'));
};
const padDatePart = (value: number) => String(value).padStart(2, '0');
const formatLocalDate = (value: Date) => `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}-${padDatePart(value.getDate())}`;
const formatLocalDateTime = (value: Date) => `${formatLocalDate(value)} ${padDatePart(value.getHours())}:${padDatePart(value.getMinutes())}:${padDatePart(value.getSeconds())}`;
const parseAttributeDate = (value: string) => {
  if (!value) return new Date();
  const parsed = new Date(value.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}; const isDarazFlagEnabled = (value: string | number | boolean) =>
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
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [progressDetail, setProgressDetail] = useState('');
  const [activeDateAttribute, setActiveDateAttribute] = useState<string | null>(null);
  const [aiGeneratedFields, setAiGeneratedFields] = useState<string[]>([]);
  const [preparedImages, setPreparedImages] = useState<{ signature: string; urls: string[]; paths: string[] } | null>(null);
  const [datePickerStage, setDatePickerStage] = useState<'date' | 'time'>('date');

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
    setAiGeneratedFields([]);
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

  const imageSelectionSignature = selectedImageAssets.map((asset) => asset.assetId ?? asset.uri).join('|');

  function discardPreparedImages() {
    if (preparedImages?.paths.length && accessToken) cleanupMarketplaceProductImages(accessToken, preparedImages.paths).catch(() => undefined);
    setPreparedImages(null);
  }

  const hasValue = (value: unknown) => value !== null && value !== undefined && value !== '';
  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFormError('Photo access is required to choose product images.');
      return;
    }
    const remaining = Math.max(0, 8 - selectedImageAssets.length);
    if (!remaining) {
      setFieldErrors((current) => ({ ...current, image: 'Daraz supports a maximum of eight images.' }));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.canceled || !result.assets.length) return;

    const incoming: ExpoMarketplaceImageAsset[] = result.assets.map((asset) => ({
      uri: asset.uri,
      fileName: asset.fileName ?? 'product-image',
      mimeType: asset.mimeType ?? 'image/jpeg',
      fileSize: asset.fileSize ?? 0,
      width: asset.width,
      height: asset.height,
      assetId: asset.assetId,
    }));
    const rejected: string[] = [];
    const valid = incoming.filter((asset, index) => {
      if (!asset.uri) { rejected.push(`Image ${index + 1} is empty.`); return false; }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType ?? '')) { rejected.push(`${asset.fileName ?? `Image ${index + 1}`} has an unsupported format.`); return false; }
      if ((asset.fileSize ?? 0) > 5 * 1024 * 1024) { rejected.push(`${asset.fileName ?? `Image ${index + 1}`} is larger than 5 MB.`); return false; }
      if (platform === 'daraz' && (!['image/jpeg', 'image/png'].includes(asset.mimeType ?? '') || (asset.fileSize ?? 0) > 1024 * 1024)) { rejected.push(`${asset.fileName ?? `Image ${index + 1}`} does not meet Daraz's JPEG/PNG 1 MB limit.`); return false; }
      return true;
    });
    const merged = [...selectedImageAssets];
    for (const asset of valid) {
      const identity = asset.assetId ? `asset:${asset.assetId}` : `uri:${asset.uri}`;
      const duplicate = merged.some((current) => (current.assetId ? `asset:${current.assetId}` : `uri:${current.uri}`) === identity);
      if (duplicate) rejected.push(`${asset.fileName ?? 'An image'} was already selected.`);
      else if (merged.length < 8) merged.push(asset);
      else rejected.push('Only eight images can be selected.');
    }
    if (merged.length !== selectedImageAssets.length) discardPreparedImages();
    setSelectedImageAssets(merged);
    setImage(merged[0]?.uri ?? '');
    setFieldErrors((current) => ({ ...current, image: rejected.length ? rejected[0] : undefined }));
    setFormError(rejected.length > 1 ? `${rejected[0]} ${rejected.length - 1} more image(s) were rejected.` : null);
  }

  function removeImage(index: number) {
    discardPreparedImages();
    setSelectedImageAssets((current) => {
      const next = current.filter((_, assetIndex) => assetIndex !== index);
      setImage(next[0]?.uri ?? '');
      return next;
    });
  }

  function setPrimaryImage(index: number) {
    discardPreparedImages();
    setSelectedImageAssets((current) => {
      const next = [...current];
      const [primary] = next.splice(index, 1);
      if (primary) next.unshift(primary);
      setImage(next[0]?.uri ?? '');
      return next;
    });
  }
  function handleDateAttributeChange(attribute: DarazCategoryAttribute, event: DateTimePickerEvent, selected?: Date) {
    if (event.type === 'dismissed' || !selected) {
      setActiveDateAttribute(null);
      setDatePickerStage('date');
      return;
    }
    const includesTime = isDateTimeAttribute(attribute);
    const current = parseAttributeDate(darazAttributeValues[attribute.name] ?? '');
    let next = selected;
    if (datePickerStage === 'date' && includesTime) {
      next = new Date(selected);
      next.setHours(current.getHours(), current.getMinutes(), current.getSeconds(), 0);
    } else if (datePickerStage === 'time') {
      next = new Date(current);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    }
    setDarazAttributeValues((values) => ({ ...values, [attribute.name]: includesTime ? formatLocalDateTime(next) : formatLocalDate(next) }));
    if (Platform.OS === 'android' && includesTime && datePickerStage === 'date') {
      setDatePickerStage('time');
      return;
    }
    setActiveDateAttribute(null);
    setDatePickerStage('date');
  }
  async function handleGenerate() {
    if (isGenerating) return;
    if (!accessToken || !platform) { setFormError('Select a connected marketplace before generating.'); return; }
    if (!selectedImageAssets.length) { setFieldErrors((current) => ({ ...current, image: 'Select at least one product image.' })); return; }
    if (!selectedDarazCategoryId) { setFieldErrors((current) => ({ ...current, category: 'Select a primary category first.' })); return; }
    if (isLoadingDarazAttributes || !hasLoadedDarazAttributes || darazAttributesError) { setFormError(darazAttributesError ?? 'Wait for category attributes to finish loading.'); return; }
    if (!darazCategoryAttributes.length) { setFormError('This category has no attribute definitions available for AI generation.'); return; }

    setIsGenerating(true);
    setFormError(null);
    setPublishMessage(null);
    try {
      let imageUrls = preparedImages?.signature === imageSelectionSignature ? preparedImages.urls : null;
      if (!imageUrls) {
        const upload = await uploadMarketplaceProductImages(accessToken, platform, selectedImageAssets, (completed, total) => setProgressDetail(`Preparing image ${completed} of ${total}`));
        if (upload.failed.length) {
          if (upload.uploaded.length) cleanupMarketplaceProductImages(accessToken, upload.uploaded.map((entry) => entry.path)).catch(() => undefined);
          const failed = upload.failed[0];
          throw new ApiError(400, `Image ${failed.index + 1}: ${failed.error}`);
        }
        imageUrls = upload.uploaded.map((entry) => entry.public_url);
        setPreparedImages({ signature: imageSelectionSignature, urls: imageUrls, paths: upload.uploaded.map((entry) => entry.path) });
      }
      const brandHint = darazAttributeValues.brand?.trim() || undefined;
      const response = await generateProductListing(accessToken, {
        primary_category_id: Number(selectedDarazCategoryId),
        image_urls: imageUrls,
        attributes: darazCategoryAttributes,
        title_hint: title.trim() || undefined,
        brand_hint: brandHint,
      });
      const generated = { ...response.draft.Attributes };
      const firstSku = response.draft.Skus[0];
      if (firstSku?.color_family != null) generated.color_family = firstSku.color_family;
      if (firstSku?.package_content != null) generated.package_content = firstSku.package_content;
      if (firstSku?.size != null) generated.size = firstSku.size;

      setTitle((current) => hasValue(current) ? current : response.draft.Title?.trim() ?? '');
      setDescription((current) => hasValue(current) ? current : generated.description?.trim() ?? generated.short_description?.trim() ?? '');
      setDarazAttributeValues((current) => {
        const next = { ...current };
        for (const attribute of darazCategoryAttributes) {
          if (hasValue(current[attribute.name])) continue;
          const candidate = generated[attribute.name];
          if (!hasValue(candidate)) continue;
          if (attribute.options.length) {
            const option = attribute.options.find((entry) => entry.name === candidate) ?? attribute.options.find((entry) => entry.name.toLowerCase() === String(candidate).toLowerCase());
            if (option) next[attribute.name] = option.name;
          } else {
            next[attribute.name] = String(candidate);
          }
        }
        return next;
      });
      setAiGeneratedFields(response.filled.filter((entry) => entry.source === 'vision' && hasValue(entry.value)).map((entry) => entry.name));
      const needsInput = response.user_required.length > 0 || response.vision_skipped.length > 0;
      setPublishMessage(needsInput ? 'AI filled the available product details. Some fields still require your input.' : 'Product details generated. Please review the highlighted fields before publishing.');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not generate product details. Please try again.');
    } finally {
      setIsGenerating(false);
      setProgressDetail('');
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
      let uploadedUrls: string[];
      if (preparedImages?.signature === imageSelectionSignature) {
        uploadedUrls = preparedImages.urls;
        uploadedPaths = preparedImages.paths;
        setProgressDetail(`Using ${uploadedUrls.length} prepared image(s)`);
      } else {
        const uploadResult = await uploadMarketplaceProductImages(accessToken, platform, selectedImageAssets, (completed, total) => setProgressDetail(`Uploading image ${completed} of ${total}`));
        uploadedPaths = uploadResult.uploaded.map((entry) => entry.path);
        if (uploadResult.failed.length) throw new ApiError(400, `Image ${uploadResult.failed[0].index + 1}: ${uploadResult.failed[0].error || 'Upload failed.'}`);
        uploadedUrls = uploadResult.uploaded.map((entry) => entry.public_url);
      }
      if (!uploadedUrls.length) throw new ApiError(400, 'No image uploads succeeded.');

      setPublishProgress('migrating_images');
      const migratedUrls: string[] = [];
      for (const [index, publicUrl] of uploadedUrls.entries()) {
        setProgressDetail(`Migrating image ${index + 1} of ${uploadedUrls.length}`);
        const migrated = await migrateDarazImage(accessToken, activeConnection.encrypted_access_token!, publicUrl);
        migratedUrls.push(migrated.imageUrl);
      }

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
      setProgressDetail('Creating product');
      const response = await createNewDarazProduct(accessToken, activeConnection.encrypted_access_token, payload);
      setPublishProgress('completed');
      setProgressDetail('Product published');
      setPublishMessage(response.item_id ? 'Daraz listing created successfully (item ' + response.item_id + ').' : response.message || 'Daraz listing created successfully.');
      setFieldErrors({});
      setTitle(''); setPrice(''); setCategory(''); setImage(''); setDescription('');
      setDarazAttributeValues({}); setSelectedDarazCategoryId(null); setDarazCategoryPath([]); setSelectedImageAssets([]); setPreparedImages(null); setAiGeneratedFields([]);
      setTimeout(() => router.back(), 1200);
    } catch (err) {
      setPublishProgress('failed');
      setFormError(err instanceof ApiError || err instanceof UnsupportedBackendCapabilityError ? err.message : 'Could not publish the product.');
      if (uploadedPaths.length) cleanupMarketplaceProductImages(accessToken, uploadedPaths).catch(() => undefined);
      if (preparedImages?.signature === imageSelectionSignature) setPreparedImages(null);
    } finally {
      setIsPublishing(false);
    }
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (title.trim().length < 3) errors.title = 'Title must be at least 3 characters.';
    const priceNumber = Number(price);
    if (!price.trim() || Number.isNaN(priceNumber) || priceNumber <= 0) {
      errors.price = 'Enter a valid price.';
    }
    if (!description.trim()) errors.description = 'Description is required.';
    if (!image.trim()) errors.image = 'Select at least one product image.';
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
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ThemedText type="headlineSm">←</ThemedText>
          </Pressable>
          <View style={styles.headerCopy}><ThemedText type="headlineSm">{isEditMode ? 'Edit Product' : 'Add Product'}</ThemedText><ThemedText type="bodySm" themeColor="textSecondary" numberOfLines={1}>Create and publish a new marketplace listing</ThemedText></View>
          <View style={styles.topRowSpacer} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets>
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
                <SectionHeading title="Connected marketplace" subtitle="Choose where this listing will be published." />
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
              <View style={[styles.section, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.border }]}>
                <SectionHeading title="Category" subtitle="Required · Select the most specific product category." />
                <Pressable onPress={() => setIsCategoryModalVisible(true)} disabled={platform !== 'daraz'} style={[styles.categoryCard, { borderColor: fieldErrors.category ? theme.danger : theme.border }]} accessibilityRole="button" accessibilityLabel="Select category">
                  <View style={[styles.categoryIcon, { backgroundColor: theme.primaryContainer }]}><Ionicons name="grid-outline" size={22} color={theme.primary} /></View>
                  <View style={styles.categoryCopy}>
                    <ThemedText type="bodyMd">{selectedDarazCategoryId ? darazCategoryPath.at(-1)?.name ?? category.split(' / ').at(-1) : 'Select Category'}</ThemedText>
                    <ThemedText type="bodySm" themeColor="textSecondary" numberOfLines={2}>{category || 'No category selected'}</ThemedText>
                  </View>
                  <ThemedText type="bodyMd" themeColor="primary">{selectedDarazCategoryId ? 'Change' : 'Select'}</ThemedText>
                </Pressable>
                {fieldErrors.category && <ThemedText type="bodySm" themeColor="danger">{fieldErrors.category}</ThemedText>}
                {darazCategoriesError && <ThemedText type="bodySm" themeColor="danger">{darazCategoriesError}</ThemedText>}
              </View>
              <View style={[styles.section, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.border }]}>
                <View style={styles.sectionTitleRow}><View style={styles.categoryCopy}><SectionHeading title="Product images" subtitle="JPEG, PNG or WebP · up to 5 MB each. Daraz accepts up to 8." /></View><ThemedText type="bodySm" themeColor="textSecondary">{selectedImageAssets.length} of 8</ThemedText></View>
                <View style={styles.mediaGrid}>
                  {selectedImageAssets.map((asset, index) => (
                    <View key={asset.assetId ?? asset.uri} style={[styles.mediaTile, { borderColor: theme.border }]}>
                      <Image source={{ uri: asset.uri }} style={styles.mediaImage} contentFit="cover" />
                      {index === 0 && <View style={[styles.primaryBadge, { backgroundColor: theme.primary }]}><ThemedText type="bodySm" themeColor="onPrimary">Primary</ThemedText></View>}
                      <Pressable onPress={() => removeImage(index)} disabled={isPublishing} style={styles.removeImageButton} accessibilityRole="button" accessibilityLabel={`Remove image ${index + 1}`}><Ionicons name="close" size={18} color="#fff" /></Pressable>
                      {index > 0 && <Pressable onPress={() => setPrimaryImage(index)} disabled={isPublishing} style={styles.makePrimaryButton} accessibilityRole="button"><ThemedText type="bodySm" themeColor="primary">Set primary</ThemedText></Pressable>}
                      {isPublishing && ['uploading_images', 'migrating_images'].includes(publishProgress) && <View style={styles.processingOverlay}><ActivityIndicator color="#fff" /><ThemedText type="bodySm" style={styles.processingText}>{publishProgress === 'uploading_images' ? 'Uploading' : 'Migrating'}</ThemedText></View>}
                    </View>
                  ))}
                  {selectedImageAssets.length < 8 && <Pressable onPress={handlePickImage} disabled={isPublishing} style={[styles.addMediaTile, { borderColor: fieldErrors.image ? theme.danger : theme.border, backgroundColor: theme.surfaceContainerLow }]} accessibilityRole="button" accessibilityLabel="Add product images"><Ionicons name="images-outline" size={28} color={theme.primary} /><ThemedText type="bodyMd" themeColor="primary">Add Images</ThemedText></Pressable>}
                </View>
                {fieldErrors.image && <ThemedText type="bodySm" themeColor="danger">{fieldErrors.image}</ThemedText>}
                <Pressable onPress={handleGenerate} disabled={isGenerating || !selectedImageAssets.length || !platform || !selectedDarazCategoryId || isLoadingDarazAttributes || !hasLoadedDarazAttributes || !!darazAttributesError} style={[styles.secondaryButton, { borderColor: theme.border }]}>
                  {isGenerating ? <View style={styles.buttonProgress}><ActivityIndicator color={theme.primary} /><ThemedText type="bodyMd" themeColor="primary">{progressDetail || 'Generating product details'}</ThemedText></View> : <ThemedText type="bodyMd" themeColor="primary">Generate with AI</ThemedText>}
                </Pressable>
              </View>
              <AuthField
                label="Title"
                value={title}
                onChangeText={setTitle}
                placeholder="Blue Hoodie"
                autoCapitalize="words"
                error={fieldErrors.title}
                required
                helperText={`${title.length} characters`}
              />
              <AuthField
                label="Price"
                value={price}
                onChangeText={(value) => setPrice(value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
                placeholder="2500"
                keyboardType="decimal-pad"
                error={fieldErrors.price}
                required
                rightAdornment={<ThemedText type="bodyMd" themeColor="textSecondary">PKR</ThemedText>}
              />
              <Modal visible={isCategoryModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsCategoryModalVisible(false)}>
                <ThemedView style={styles.modalScreen}>
                  <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
                    <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}><Pressable onPress={() => setIsCategoryModalVisible(false)} style={styles.modalAction}><ThemedText type="bodyMd" themeColor="primary">Close</ThemedText></Pressable><ThemedText type="headlineSm">Select Category</ThemedText><View style={styles.modalAction} /></View>
                    <ScrollView contentContainerStyle={styles.modalContent}>
                      {darazCategoryPath.length > 0 && <Pressable onPress={() => setDarazCategoryPath((current) => current.slice(0, -1))} style={[styles.categoryListItem, { borderColor: theme.border }]}><Ionicons name="chevron-back" size={20} color={theme.primary} /><ThemedText type="bodyMd">Back</ThemedText></Pressable>}
                      {darazCategoryPath.length > 0 && <ThemedText type="bodySm" themeColor="textSecondary">{darazCategoryPath.map((entry) => entry.name ?? entry.category_name).join(' / ')}</ThemedText>}
                      {(darazCategoryPath.at(-1)?.children ?? darazCategories).map((option) => {
                        const optionId = String(option.id ?? option.category_id ?? '');
                        const optionName = option.name ?? option.category_name ?? 'Unnamed category';
                        const activeChildren = (option.children ?? []).filter((child) => child.is_active !== false && !['inactive', 'disabled', 'deleted'].includes(child.status?.toLowerCase() ?? ''));
                        const isLeaf = option.leaf === true || (option.leaf == null && activeChildren.length === 0);
                        return <Pressable key={optionId || optionName} onPress={() => {
                          if (!isLeaf && activeChildren.length) { setDarazCategoryPath((current) => [...current, { ...option, children: activeChildren }]); return; }
                          if (!isLeaf) { setFormError('This category has no selectable leaf categories.'); return; }
                          const nextPath = [...darazCategoryPath, option];
                          setDarazCategoryPath(nextPath); setCategory(nextPath.map((entry) => entry.name ?? entry.category_name ?? '').filter(Boolean).join(' / ')); setSelectedDarazCategoryId(optionId); setIsCategoryModalVisible(false); setFieldErrors((current) => ({ ...current, category: undefined }));
                        }} style={[styles.categoryListItem, { borderColor: theme.border }]}><View style={styles.categoryCopy}><ThemedText type="bodyMd">{optionName}</ThemedText><ThemedText type="bodySm" themeColor="textSecondary">{isLeaf ? 'Select this category' : 'View subcategories'}</ThemedText></View><Ionicons name={isLeaf ? 'checkmark-circle-outline' : 'chevron-forward'} size={20} color={theme.primary} /></Pressable>;
                      })}
                    </ScrollView>
                  </SafeAreaView>
                </ThemedView>
              </Modal>
              {isEditMode && <AuthField
                label="Image URL"
                value={image}
                onChangeText={setImage}
                placeholder="https://…"
                keyboardType="url"
                error={fieldErrors.image}
              />}
              {platform === 'daraz' && selectedDarazCategoryId && <>
                <SectionHeading title="Category-specific attributes" subtitle="Required marketplace details are marked with an asterisk." />
                {isLoadingDarazAttributes && <ActivityIndicator color={theme.primary} />}
                {darazAttributesError && <ThemedText type="bodySm" themeColor="danger">{darazAttributesError}</ThemedText>}
                {!isLoadingDarazAttributes && !darazAttributesError && darazCategoryAttributes
                  .filter(isRenderableDarazAttribute)
                  .map((attribute) => {
                    const value = darazAttributeValues[attribute.name] ?? '';
                    const requiredLabel = attribute.label + (isDarazFlagEnabled(attribute.is_mandatory) ? ' *' : '');
                    const fieldLabel = requiredLabel + (aiGeneratedFields.includes(attribute.name) ? ' · AI generated' : '');
                    if (isDateAttribute(attribute)) {
                      const includesTime = isDateTimeAttribute(attribute);
                      const pickerVisible = activeDateAttribute === attribute.name;
                      const pickerMode = Platform.OS === 'ios' && includesTime ? 'datetime' : datePickerStage;
                      return (
                        <View key={String(attribute.id ?? attribute.name)} style={styles.dateFieldGroup}>
                          <ThemedText type="bodyMd" themeColor="textSecondary">{fieldLabel}</ThemedText>
                          <Pressable onPress={() => { setDatePickerStage('date'); setActiveDateAttribute(attribute.name); }} style={[styles.dateField, { backgroundColor: theme.surfaceContainerLowest, borderColor: pickerVisible ? theme.primary : theme.border }]} accessibilityRole="button" accessibilityLabel={`Select ${attribute.label}`}>
                            <Ionicons name={includesTime ? 'calendar-number-outline' : 'calendar-outline'} size={20} color={theme.primary} />
                            <ThemedText type="bodyLg" themeColor={value ? 'text' : 'textSecondary'} style={styles.dateValue}>{value || (includesTime ? 'Select date and time' : 'Select date')}</ThemedText>
                            {value ? <Pressable onPress={(event) => { event.stopPropagation(); setDarazAttributeValues((values) => ({ ...values, [attribute.name]: '' })); setActiveDateAttribute(null); }} hitSlop={8} accessibilityLabel={`Clear ${attribute.label}`}><Ionicons name="close-circle" size={20} color={theme.textSecondary} /></Pressable> : <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />}
                          </Pressable>
                          {pickerVisible && <DateTimePicker value={parseAttributeDate(value)} mode={pickerMode} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event, selected) => handleDateAttributeChange(attribute, event, selected)} />}
                        </View>
                      );
                    }
                    if (attribute.options.length > 0) {
                      return (
                        <View key={attribute.name}>
                          <ThemedText type="bodySm" themeColor="textSecondary">{fieldLabel}</ThemedText>
                          <View style={styles.categoryRow}>
                            {attribute.options.map((option, optionIndex) => (
                              <Pressable
                                key={`${attribute.id ?? attribute.name}:${option.name}:${optionIndex}`}
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
                        label={fieldLabel}
                        value={value}
                        onChangeText={(nextValue) => setDarazAttributeValues((current) => ({ ...current, [attribute.name]: nextValue }))}
                        placeholder={attribute.input_type === 'numeric' ? 'Enter a number' : 'Enter ' + attribute.label.toLowerCase()}
                        keyboardType={attribute.input_type === 'numeric' ? 'decimal-pad' : 'default'}
                      />
                    );
                  })}
                {hasLoadedDarazAttributes && darazCategoryAttributes.filter(isRenderableDarazAttribute).length === 0 && (
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
                required
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
                {isPublishing ? <View style={styles.buttonProgress}><ActivityIndicator color={theme.onPrimary} /><ThemedText type="bodyMd" themeColor="onPrimary">{progressDetail}</ThemedText></View> : <ThemedText type="bodyLg" themeColor="onPrimary" style={styles.ctaLabel}>{platform === 'shopify' ? 'Shopify Publishing Unavailable' : publishProgress === 'uploading_images' ? 'Uploading ' + selectedImageAssets.length + ' image(s)' : publishProgress === 'migrating_images' ? 'Migrating ' + selectedImageAssets.length + ' image(s)' : publishProgress === 'creating_product' ? 'Creating product' : publishProgress === 'completed' ? 'Product published' : 'Publish to Daraz'}</ThemedText>}
              </PressableScale>}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View style={styles.sectionHeading}><ThemedText type="headlineSm">{title}</ThemedText>{subtitle ? <ThemedText type="bodySm" themeColor="textSecondary">{subtitle}</ThemedText> : null}</View>;
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
  headerCopy: { flex: 1, minWidth: 0 },
  topRowSpacer: {
    width: 20,
  },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.four,
    paddingBottom: 120,
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
  buttonProgress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
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
  dateFieldGroup: { gap: Spacing.one },
  dateField: { minHeight: 52, borderWidth: 1, borderRadius: Radius.DEFAULT, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dateValue: { flex: 1 }, categoryRow: {
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
  sectionTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  mediaTile: { width: '31%', aspectRatio: 1, borderWidth: 1, borderRadius: Radius.md, overflow: 'hidden', position: 'relative' },
  mediaImage: { width: '100%', height: '100%' },
  addMediaTile: { width: '31%', aspectRatio: 1, borderWidth: 1, borderStyle: 'dashed', borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', gap: Spacing.one, padding: Spacing.one },
  primaryBadge: { position: 'absolute', left: 4, top: 4, borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  removeImageButton: { position: 'absolute', right: 4, top: 4, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center' },
  makePrimaryButton: { position: 'absolute', left: 4, right: 4, bottom: 4, minHeight: 28, borderRadius: Radius.sm, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.58)', alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  processingText: { color: '#fff' }, imageActions: {
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
  section: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.three },
  categoryCard: { minHeight: 72, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  categoryIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  categoryCopy: { flex: 1, minWidth: 0, gap: Spacing.one },
  modalScreen: { flex: 1 },
  modalHeader: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.three },
  modalAction: { width: 64, minHeight: 44, justifyContent: 'center' },
  modalContent: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  categoryListItem: { minHeight: 60, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, sectionHeading: { gap: Spacing.one, paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(127,127,127,0.35)' },
  secondaryCta: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.DEFAULT,
    paddingVertical: Spacing.three,
  },
});
