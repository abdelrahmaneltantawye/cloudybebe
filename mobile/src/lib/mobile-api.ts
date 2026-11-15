import { Platform } from 'react-native';
import { STORE_URL } from '@/lib/store';

export type Customer = { id: number; email: string; first_name: string; last_name: string; display_name: string };
export type AuthResult = { token: string; expires_at: string; user: Customer };
export type StoredSession = Pick<AuthResult, 'token' | 'expires_at'>;
export type Address = { first_name: string; last_name: string; company?: string; address_1: string; address_2: string; city: string; state: string; postcode: string; country: string; email?: string; phone?: string };
export type Addresses = { billing: Address; shipping: Address };
export type OrderItem = { id: number; product_id: number; variation_id: number; name: string; quantity: number; total: string; image: string | null };
export type Order = { id: number; number: string; status: string; status_label: string; date_created: string; currency: string; total: string; item_count: number; items: OrderItem[]; billing: Address; shipping: Address; tracking: { label?: string; provider?: string; number?: string; url?: string }[] };
export type OrderPage = { orders: Order[]; page: number; total_pages: number; total: number };
export type RegistryVisibility = 'unlisted' | 'password' | 'private' | 'searchable';
export type RegistryItem = { id: number; product_id: number; variation_id: number; name: string; url: string; image: string; price_html: string; quantity: number; purchased: number; reserved: number; needed: number; priority: boolean; available: boolean };
export type Registry = { id: number; title: string; display_name: string; description: string; event_date: string; share_url: string; has_shipping: boolean; delivery_summary: string; cover: string; paused: boolean; items: RegistryItem[]; is_owner: boolean; shipping?: Partial<Address>; visibility?: RegistryVisibility; notifications?: boolean; token: string };
export type RegistryResult = { title: string; name: string; url: string; token: string };
export type Country = { code: string; name: string; states: { code: string; name: string }[] };
export type MobileConfig = { currency: string; currency_symbol: string; price_decimals: number; countries: Country[]; shipping_countries: Country[]; password_min_length: number; checkout_mode: 'website'; registry_enabled: boolean; registration_enabled: boolean };
export type ApiOptions = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; token?: string | null; checkoutToken?: string; body?: unknown; signal?: AbortSignal };

export class MobileApiError extends Error {
  constructor(message: string, public status: number, public code = '') { super(message); this.name = 'MobileApiError'; }
}

export function readStoredSession(raw: string, now = Date.now()): StoredSession | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const saved = value as Partial<StoredSession>;
    if (typeof saved.token !== 'string' || !saved.token || typeof saved.expires_at !== 'string' || !Number.isFinite(Date.parse(saved.expires_at)) || Date.parse(saved.expires_at) <= now) return null;
    return { token: saved.token, expires_at: saved.expires_at };
  } catch { return null; }
}

export async function mobileRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort);
  if (options.signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 25000);
  const url = Platform.OS === 'web' ? `/api/mobile?path=${encodeURIComponent(path)}` : `${STORE_URL}/wp-json/cloudybebe-mobile/v1/${path}`;
  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET', signal: controller.signal, credentials: 'omit',
      headers: { Accept: 'application/json', ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...(options.checkoutToken ? { 'X-Checkout-Token': options.checkoutToken } : {}) },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = response.status===404&&data?.code==='rest_no_route' ? 'This service is not available yet. Please try again later.' : typeof data?.message === 'string' ? data.message.replace(/<[^>]+>/g, '') : response.status === 404 ? 'This service is not available yet. Please try again later.' : 'We couldn’t complete that request. Please try again.';
      throw new MobileApiError(message, response.status, data?.code ?? '');
    }
    if (data === null) throw new MobileApiError('The store returned an unreadable response. Please try again.', response.status);
    return data as T;
  } catch (error) {
    if (error instanceof MobileApiError) throw error;
    if (options.signal?.aborted) throw error;
    if (controller.signal.aborted) throw new Error('The request took too long. Please try again.');
    throw new Error('We couldn’t reach CloudyBebe. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}

export function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
export function formatAmount(amount: string, currency: string) {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount)); }
  catch { return `${currency} ${amount}`; }
}
