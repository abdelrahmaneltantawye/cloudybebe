import type { Product } from '@/lib/store';

export function registrySelectionError(product: Pick<Product, 'has_options' | 'variations'>, variationId: number) {
  if (!Number.isSafeInteger(variationId) || variationId < 0) return 'Choose an available product option in the shop.';
  if (product.has_options && !variationId) return 'Choose the product options in the shop before adding it to your registry.';
  if (!variationId) return '';
  const variation = product.variations?.find(option => option.id === variationId);
  if (!variation) return 'This product option is unavailable. Choose an available option in the shop.';
  if (!variation.attributes.length || variation.attributes.some(attribute => !attribute.value.trim())) return 'This option can’t be saved to a registry yet. Choose a product with fixed options.';
  return '';
}
