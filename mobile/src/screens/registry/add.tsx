import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Button, Copy, Title } from '@/components/ui';
import { useSession } from '@/state/session';
import { useResource } from '@/hooks/use-resource';
import { errorMessage, type Registry } from '@/lib/mobile-api';
import { storeGet, type Product } from '@/lib/store';
import { AccountGate, Card, Choice, Feedback, Loading, Page, RouteButton } from '@/screens/account/shared';
import { QuantityField } from '@/screens/registry/shared';
import { registrySelectionError } from '@/screens/registry/selection';

export default function AddRegistryGiftScreen() {
  const params = useLocalSearchParams<{ productId: string; variationId?: string; quantity?: string }>();
  const returnTo = `/registry/add?${new URLSearchParams({ productId: params.productId ?? '', variationId: params.variationId ?? '', quantity: params.quantity ?? '1' })}`;
  return <AccountGate title="Add to registry" returnTo={returnTo}><AddGift key={`${params.productId}:${params.variationId ?? ''}`} productId={Number(params.productId)} variationId={Number(params.variationId) || 0} initialQuantity={Number(params.quantity) || 1} /></AccountGate>;
}
function AddGift({ productId, variationId, initialQuantity }: { productId: number; variationId: number; initialQuantity: number }) {
  const session = useSession();
  const result = useResource(async signal => {
    if (!Number.isInteger(productId) || productId <= 0) throw new Error('Choose a product from the shop to add it to your registry.');
    return Promise.all([session.request<{ registries: Registry[] }>('registries', { signal }), (async () => {
      const requested = await storeGet<Product>(`products/${productId}`, signal);
      const parent = requested.parent ? await storeGet<Product>(`products/${requested.parent}`, signal) : requested;
      const selectedId = variationId || (requested.parent ? requested.id : 0);
      const blocked = registrySelectionError(parent, selectedId);
      const chosen = selectedId && !blocked ? requested.id === selectedId ? requested : await storeGet<Product>(`products/${selectedId}`, signal) : parent;
      if (selectedId && !blocked && chosen.parent !== parent.id) throw new Error('This option does not belong to this product. Choose an option in the shop.');
      return { parent, chosen, variationId: selectedId, blocked };
    })()]);
  }, [session.token, productId, variationId]);
  const [selected, setSelected] = useState<number>();
  const [quantity, setQuantity] = useState(String(initialQuantity));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const registries = result.data?.[0].registries;
  const selection = result.data?.[1];
  const product = selection?.parent;
  const registryId = selected ?? (registries?.length === 1 ? registries[0].id : undefined);
  async function save() {
    if (pending || !registryId) return; setError('');
    if (!selection || selection.blocked) { setError(selection?.blocked || 'Choose a product from the shop.'); return; }
    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) { setError('Choose a quantity of at least 1.'); return; }
    setPending(true);
    try { const registry = await session.request<Registry>(`registries/${registryId}/items`, { method: 'POST', body: { product_id: selection.parent.id, ...(selection.variationId ? { variation_id: selection.variationId } : {}), quantity: Number(quantity) } }); router.replace({ pathname: '/registry/[id]', params: { id: registry.id } }); }
    catch (failure) { setError(errorMessage(failure)); } finally { setPending(false); }
  }
  return <Page title="Add to registry">{result.loading ? <Loading label="Loading your registries…" /> : null}<Feedback error={result.error || error || selection?.blocked} />{result.error ? <Button label="Try again" secondary onPress={result.retry} /> : null}{product ? <Card>{product.images[0] ? <Image source={{ uri: product.images[0].src }} contentFit="contain" style={{ width: '100%', height: 170 }} accessibilityLabel={product.name} /> : null}<Title>{product.name}</Title>{selection?.variationId && !selection.blocked ? <Copy>Your selected product option will be saved.</Copy> : null}{selection?.blocked ? <RouteButton label="Choose a different product" path="/shop" secondary /> : null}</Card> : null}{registries?.length === 0 ? <Card><Copy>Create your registry first, then add this gift from the shop.</Copy><RouteButton label="Create a registry" path="/registry/create" /></Card> : registries ? <><Title>Choose a registry</Title>{registries.map(registry => <Choice key={registry.id} label={registry.title} selected={registry.id === registryId} onPress={() => setSelected(registry.id)} />)}<QuantityField value={quantity} onChange={setQuantity} /><Button label={pending ? 'Adding gift…' : 'Add gift to registry'} disabled={pending || !registryId || !!selection?.blocked || !selection?.chosen.is_in_stock || !selection?.chosen.is_purchasable} onPress={() => void save()} /></> : null}</Page>;
}
