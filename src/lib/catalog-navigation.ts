import { router } from 'expo-router';
import { Linking } from 'react-native';

import type { CatalogProductItem } from '@/lib/api';
import { normalizeExternalUrl } from '@/lib/api';

export function navigateToCatalogProduct(product: CatalogProductItem) {
  router.push({
    pathname: '/catalog-product-detail',
    params: { data: JSON.stringify(product) },
  });
}

export async function openCatalogProductUrl(url: string | null | undefined) {
  const normalized = normalizeExternalUrl(url);
  if (!normalized) return;
  await Linking.openURL(normalized);
}

export function parseCatalogProductParam(data: string | string[] | undefined): CatalogProductItem | null {
  const raw = Array.isArray(data) ? data[0] : data;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CatalogProductItem;
    if (!parsed || typeof parsed !== 'object' || !parsed.item_id) return null;
    return {
      ...parsed,
      item_url: normalizeExternalUrl(parsed.item_url),
    };
  } catch {
    return null;
  }
}
