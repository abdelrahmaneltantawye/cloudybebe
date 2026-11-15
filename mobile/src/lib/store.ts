import { Platform } from 'react-native';
import { resourceCache } from '@/lib/cache';

export const STORE_URL = 'https://cloudybebe.com';
export type Prices = { price: string; regular_price: string; currency_code: string; currency_minor_unit: number };
export type ProductAttribute = { id: number; name: string; taxonomy: string | null; has_variations: boolean; terms: { id: number; name: string; slug: string }[] };
export type Product = {
  id: number;
  name: string;
  permalink: string;
  type: string;
  description: string;
  short_description: string;
  prices: Prices;
  images: { src: string; thumbnail: string; alt: string }[];
  is_in_stock: boolean;
  is_purchasable: boolean;
  has_options: boolean;
  on_sale: boolean;
  categories: { id: number; name: string; slug: string }[];
  add_to_cart: { minimum: number; maximum: number; multiple_of: number };
  parent?: number;
  variation?: string;
  attributes?: ProductAttribute[];
  variations?: { id: number; attributes: { name: string; value: string }[] }[];
  brands?: { id: number; name: string; slug: string }[];
  formatted_dimensions?: string;
  formatted_weight?: string;
  is_on_backorder?: boolean;
  selected_attributes?: Record<string, string>;
};
export type Category = { id: number; name: string; slug: string; count: number; image: { src: string } | null };

export function plainText(html: string = '') {
  return html
    .replace(/<\/(p|li|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, n: string) => {
      const code = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n);
      return code <= 0x10ffff ? String.fromCodePoint(code) : '';
    })
    .replace(
      /&(amp|quot|apos|lt|gt|nbsp|ndash|mdash|rsquo|lsquo|rdquo|ldquo);/g,
      (_, key: string) =>
        ({
          amp: '&',
          quot: '"',
          apos: "'",
          lt: '<',
          gt: '>',
          nbsp: ' ',
          ndash: '–',
          mdash: '—',
          rsquo: '’',
          lsquo: '‘',
          rdquo: '”',
          ldquo: '“',
        }[key] ?? '')
    )
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function money(prices: Prices, amount = prices.price) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: prices.currency_code }).format(
    Number(amount) / 10 ** prices.currency_minor_unit
  );
}

export async function storeGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel);
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(cancel, 20000);
  try {
    const url = Platform.OS === 'web' ? `/api/catalog?path=${encodeURIComponent(path)}` : `${STORE_URL}/wp-json/wc/store/v1/${path}`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error('We couldn’t reach the store. Please try again.');
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

export const getProducts = (params: Record<string, string>, signal?: AbortSignal) =>
  storeGet<Product[]>(
    `products?${new URLSearchParams({ per_page: '20', stock_status: 'instock', catalog_visibility: 'visible', ...params })}`,
    signal
  );

export function prefetchProduct(id: number | string): void {
  const path = `products/${encodeURIComponent(id)}`;
  void resourceCache.prefetch(JSON.stringify([String(id)]), signal => storeGet<Product>(path, signal));
}
