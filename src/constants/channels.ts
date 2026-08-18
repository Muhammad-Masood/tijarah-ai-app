export type ChannelId = 'shopify' | 'daraz' | 'amazon';

export const Channels: Record<ChannelId, { name: string; benefit: string; initial: string }> = {
  shopify: {
    name: 'Shopify',
    benefit: 'Sync products, orders, inventory and fees automatically',
    initial: 'S',
  },
  daraz: {
    name: 'Daraz',
    benefit: 'Sync listings, orders and inventory across your Daraz storefront',
    initial: 'D',
  },
  amazon: {
    name: 'Amazon',
    benefit: 'Sync catalog, orders, inventory and fees from Seller Central',
    initial: 'A',
  },
};

export const ChannelOrder: ChannelId[] = ['shopify', 'daraz', 'amazon'];

export function isChannelId(value: string | undefined): value is ChannelId {
  return value === 'shopify' || value === 'daraz' || value === 'amazon';
}
