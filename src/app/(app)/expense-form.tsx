import { Image } from 'expo-image';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthField } from '@/components/auth-kit';
import { ProductRow } from '@/components/product-kit';
import { SearchableSelect } from '@/components/searchable-select';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useDarazProducts } from '@/hooks/use-daraz-products';
import { useExpenses } from '@/hooks/use-expenses';
import { useShopifyProducts } from '@/hooks/use-shopify-products';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, type Product } from '@/lib/api';

const EXPENSE_CATEGORIES = [
  'Product Cost',
  'Fuel',
  'Packaging',
  'Shipping',
  'Storage',
  'Marketing',
  'Commission',
  'Returns',
  'Other',
];

type FieldErrors = Partial<Record<'product' | 'category' | 'amount', string>>;

export default function ExpenseFormScreen() {
  const theme = useTheme();
  const { id, sku_id, platform } = useLocalSearchParams<{
    id?: string;
    sku_id?: string;
    platform?: string;
  }>();
  const isEditMode = Boolean(id);

  // Fetch products from both marketplace connections
  const daraz = useDarazProducts();
  const shopify = useShopifyProducts();

  const { expenses, addExpense, editExpense } = useExpenses();

  // Form state — platform is selected first so the product picker can filter
  const [selectedPlatform, setSelectedPlatform] = useState(platform ?? '');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSkuId, setSelectedSkuId] = useState(sku_id ?? '');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Product picker modal state
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Products for the currently selected platform
  const platformProducts = useMemo(() => {
    if (selectedPlatform === 'daraz') return daraz.products;
    if (selectedPlatform === 'shopify') return shopify.products;
    // No platform selected yet — combine both
    return [...daraz.products, ...shopify.products];
  }, [selectedPlatform, daraz.products, shopify.products]);

  const isPlatformLoading =
    (selectedPlatform === 'daraz' && daraz.isLoading) ||
    (selectedPlatform === 'shopify' && shopify.isLoading);

  // Filtered + searched products for the picker modal
  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return platformProducts;
    return platformProducts.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query),
    );
  }, [platformProducts, productSearch]);

  // Load existing expense data in edit mode (one-time init per expense id)
  const existingExpense = useMemo(
    () => (id ? expenses.find((e) => e.id === id) : null),
    [id, expenses],
  );

  const [initializedForId, setInitializedForId] = useState<string | null>(null);
  if (existingExpense && initializedForId !== existingExpense.id) {
    setSelectedSkuId(existingExpense.sku_id);
    setSelectedPlatform(existingExpense.platform);
    setCategory(existingExpense.category);
    setAmount(String(existingExpense.amount));
    setDescription(existingExpense.description ?? '');
    // Reconstruct the product object for the picker display
    const matchDaraz = daraz.products.find((p) => p.id === existingExpense.sku_id);
    const matchShopify = shopify.products.find((p) => p.id === existingExpense.sku_id);
    setSelectedProduct(matchDaraz ?? matchShopify ?? null);
    setInitializedForId(existingExpense.id);
  }

  const platformOptions = useMemo(
    () => [
      { label: 'Daraz', value: 'daraz' },
      { label: 'Shopify', value: 'shopify' },
    ],
    [],
  );

  const categoryOptions = useMemo(
    () => EXPENSE_CATEGORIES.map((c) => ({ label: c, value: c })),
    [],
  );

  function handlePlatformChange(value: string) {
    setSelectedPlatform(value);
    // Clear product selection when platform changes — products are platform-specific
    setSelectedProduct(null);
    setSelectedSkuId('');
  }

  function handleSelectProduct(product: Product) {
    setSelectedProduct(product);
    setSelectedSkuId(product.id ?? '');
    setFieldErrors((prev) => ({ ...prev, product: undefined }));
    setIsProductPickerOpen(false);
    setProductSearch('');
  }

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!selectedSkuId.trim()) errors.product = 'Select a product.';
    if (!category.trim()) errors.category = 'Select a category.';
    const parsedAmount = parseFloat(amount);
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      errors.amount = 'Enter a valid amount greater than 0.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setIsSaving(true);
    setSaveError(null);

    const payload = {
      sku_id: selectedSkuId.trim(),
      platform: selectedPlatform.trim() || 'daraz',
      category: category.trim(),
      amount: parseFloat(amount),
      description: description.trim() || null,
    };

    try {
      if (isEditMode && id) {
        await editExpense(id, payload);
      } else {
        await addExpense(payload);
      }
      router.back();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Could not save expense.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go back">
              <MaterialCommunityIcons name="arrow-left" size={24} color={theme.onSurface} />
            </Pressable>
            <ThemedText type="headlineMd">
              {isEditMode ? 'Edit Expense' : 'Add Expense'}
            </ThemedText>
            <View style={{ width: 32 }} />
          </View>

          {/* Platform — selected first so product picker filters accordingly */}
          <SearchableSelect
            label="Platform"
            value={selectedPlatform}
            options={platformOptions}
            onChange={handlePlatformChange}
            placeholder="Select platform"
          />

          {/* Product picker — shows ProductRow-style cards */}
          <View style={styles.fieldGroup}>
            <ThemedText type="bodyMd" themeColor="textSecondary">
              Product
            </ThemedText>
            {selectedProduct ? (
              <View style={styles.selectedProductCard}>
                <Pressable
                  onPress={() => {
                    setProductSearch('');
                    setIsProductPickerOpen(true);
                  }}
                  style={[styles.selectedProductInner, { borderColor: theme.border }]}
                  accessibilityRole="button"
                  accessibilityLabel="Change selected product">
                  <View style={[styles.selectedThumb, { backgroundColor: theme.backgroundElement }]}>
                    {selectedProduct.image ? (
                      <Image
                        source={{ uri: selectedProduct.image }}
                        style={styles.selectedThumbImage}
                        contentFit="cover"
                      />
                    ) : (
                      <MaterialCommunityIcons name="image-outline" size={20} color={theme.textSecondary} />
                    )}
                  </View>
                  <View style={styles.selectedProductInfo}>
                    <ThemedText type="bodyMd" numberOfLines={1}>
                      {selectedProduct.title}
                    </ThemedText>
                    <ThemedText type="bodySm" themeColor="textSecondary">
                      SKU: {selectedProduct.id ?? '—'}
                    </ThemedText>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={() => {
                    setSelectedProduct(null);
                    setSelectedSkuId('');
                  }}
                  hitSlop={8}
                  style={styles.clearProductButton}
                  accessibilityLabel="Clear product selection">
                  <MaterialCommunityIcons name="close-circle" size={18} color={theme.textSecondary} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  if (!selectedPlatform) return;
                  setProductSearch('');
                  setIsProductPickerOpen(true);
                }}
                style={[
                  styles.productTrigger,
                  {
                    borderColor: fieldErrors.product ? theme.danger : theme.border,
                    backgroundColor: theme.surfaceContainerLowest,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Choose a product">
                <MaterialCommunityIcons name="package-variant" size={20} color={theme.textSecondary} />
                <ThemedText
                  type="bodyLg"
                  themeColor={selectedPlatform ? 'textSecondary' : 'textSecondary'}
                  style={styles.productTriggerText}>
                  {selectedPlatform ? 'Tap to choose a product' : 'Select a platform first'}
                </ThemedText>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textSecondary} />
              </Pressable>
            )}
            {fieldErrors.product ? (
              <ThemedText type="bodySm" style={{ color: theme.danger }}>
                {fieldErrors.product}
              </ThemedText>
            ) : null}
          </View>

          {/* Category */}
          <SearchableSelect
            label="Category"
            value={category}
            options={categoryOptions}
            onChange={(value) => {
              setCategory(value);
              setFieldErrors((prev) => ({ ...prev, category: undefined }));
            }}
            placeholder="e.g. Product Cost, Fuel, Packaging"
          />
          {fieldErrors.category ? (
            <ThemedText type="bodySm" style={{ color: theme.danger }}>
              {fieldErrors.category}
            </ThemedText>
          ) : null}

          {/* Amount */}
          <AuthField
            label="Amount"
            value={amount}
            onChangeText={(text) => {
              setAmount(text.replace(/[^0-9.]/g, ''));
              setFieldErrors((prev) => ({ ...prev, amount: undefined }));
            }}
            placeholder="0.00"
            keyboardType="decimal-pad"
            error={fieldErrors.amount}
            required
          />

          {/* Description */}
          <AuthField
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Add a note about this expense"
            multiline
            numberOfLines={3}
          />

          {/* Save error */}
          {saveError ? (
            <View style={[styles.errorBanner, { backgroundColor: theme.errorContainer }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={theme.error} />
              <ThemedText type="bodySm" style={{ color: theme.onErrorContainer }}>
                {saveError}
              </ThemedText>
            </View>
          ) : null}

          {/* Save button */}
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            style={[styles.saveButton, { backgroundColor: theme.primary, opacity: isSaving ? 0.6 : 1 }]}>
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.onPrimary} />
            ) : (
              <ThemedText type="labelMd" style={{ color: theme.onPrimary }}>
                {isEditMode ? 'Update Expense' : 'Save Expense'}
              </ThemedText>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      {/* Product picker modal — shows ProductRow-style cards filtered by platform */}
      <Modal
        visible={isProductPickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setIsProductPickerOpen(false);
          setProductSearch('');
        }}>
        <ThemedView style={styles.modalScreen}>
          <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Pressable
                onPress={() => {
                  setIsProductPickerOpen(false);
                  setProductSearch('');
                }}
                style={styles.modalClose}>
                <ThemedText type="bodyMd" themeColor="primary">
                  Close
                </ThemedText>
              </Pressable>
              <ThemedText type="headlineSm" style={styles.modalTitle} numberOfLines={1}>
                {selectedPlatform ? `${selectedPlatform.charAt(0).toUpperCase()}${selectedPlatform.slice(1)} Products` : 'Products'}
              </ThemedText>
              <View style={{ width: 64 }} />
            </View>

            {/* Search bar */}
            <View style={[styles.modalSearchRow, { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest }]}>
              <MaterialCommunityIcons name="magnify" size={20} color={theme.textSecondary} />
              <TextInput
                value={productSearch}
                onChangeText={setProductSearch}
                placeholder="Search products"
                placeholderTextColor={theme.textSecondary}
                autoCorrect={false}
                autoCapitalize="none"
                style={[styles.modalSearchInput, { color: theme.text }]}
              />
              {productSearch ? (
                <Pressable onPress={() => setProductSearch('')} hitSlop={8} accessibilityLabel="Clear search">
                  <MaterialCommunityIcons name="close-circle" size={18} color={theme.textSecondary} />
                </Pressable>
              ) : null}
            </View>

            {/* Product list */}
            {isPlatformLoading ? (
              <View style={styles.modalEmptyState}>
                <ActivityIndicator size="small" color={theme.primary} />
                <ThemedText type="bodySm" themeColor="textSecondary">
                  Loading products...
                </ThemedText>
              </View>
            ) : filteredProducts.length === 0 ? (
              <ScrollView contentContainerStyle={styles.modalEmptyState}>
                <MaterialCommunityIcons name="package-variant" size={40} color={theme.textSecondary} />
                <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.centerText}>
                  {selectedPlatform
                    ? `No ${selectedPlatform} products found.`
                    : 'No products available.'}
                </ThemedText>
              </ScrollView>
            ) : (
              <ScrollView contentContainerStyle={styles.modalList} keyboardShouldPersistTaps="handled">
                <ThemedText type="labelMd" themeColor="textSecondary">
                  {filteredProducts.length} PRODUCT{filteredProducts.length === 1 ? '' : 'S'}
                </ThemedText>
                {filteredProducts.map((product, index) => (
                  <ProductRow
                    key={`${product.id ?? index}`}
                    product={product}
                    onPress={() => handleSelectProduct(product)}
                  />
                ))}
              </ScrollView>
            )}
          </SafeAreaView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldGroup: {
    gap: Spacing.one,
  },
  // Product trigger (unselected state)
  productTrigger: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Radius.DEFAULT,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  productTriggerText: {
    flex: 1,
  },
  // Selected product card
  selectedProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  selectedProductInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.DEFAULT,
  },
  selectedThumb: {
    width: 44,
    height: 44,
    borderRadius: Radius.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  selectedThumbImage: {
    width: '100%',
    height: '100%',
  },
  selectedProductInfo: {
    flex: 1,
    gap: 2,
  },
  clearProductButton: {
    padding: Spacing.one,
  },
  // Error / save
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.DEFAULT,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three + 2,
    borderRadius: Radius.DEFAULT,
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  // Modal
  modalScreen: {
    flex: 1,
  },
  modalHeader: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
  },
  modalClose: {
    width: 64,
    minHeight: 44,
    justifyContent: 'center',
  },
  modalTitle: {
    flex: 1,
    textAlign: 'center',
  },
  modalSearchRow: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.three,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radius.DEFAULT,
    paddingHorizontal: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.two,
  },
  modalList: {
    padding: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.five,
  },
  modalEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
  },
  centerText: {
    textAlign: 'center',
  },
});
