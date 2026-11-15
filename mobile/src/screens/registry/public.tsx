import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Button, Copy, Title } from '@/components/ui';
import { mobileRequest, MobileApiError, errorMessage, type Registry, type RegistryItem } from '@/lib/mobile-api';
import { storeGet, type Product } from '@/lib/store';
import { useResource } from '@/hooks/use-resource';
import { useShop } from '@/state/shop';
import { Card, Field, Feedback, Loading, Page, RouteButton } from '@/screens/account/shared';
import { GiftInfo, QuantityField, RegistrySummary } from '@/screens/registry/shared';
import { theme as t } from '@/theme';

type PublicResult = { registry?: Registry; passwordRequired?: boolean; error?: string };
export default function PublicRegistryScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  return <GuestRegistry key={token} token={token} />;
}
function GuestRegistry({ token }: { token: string }) {
  const [draftPassword, setDraftPassword] = useState('');
  const [access, setAccess] = useState({ password: '', attempt: 0 });
  const [added, setAdded] = useState(false);
  const result = useResource<PublicResult>(async signal => {
    if (!/^[a-f\d]{48}$/i.test(token)) throw new Error('This registry link is not valid. Ask the owner for a new sharing link.');
    try { return { registry: await mobileRequest<Registry>(`registries/public/${token}`, { method: 'POST', body: access.password ? { password: access.password } : {}, signal }) }; }
    catch (failure) { if (failure instanceof MobileApiError && failure.code === 'cbr_password') return { passwordRequired: true, error: failure.message }; throw failure; }
  }, [token, access]);
  const registry = result.data?.registry;
  function unlock() { setAccess(old => ({ password: draftPassword, attempt: old.attempt + 1 })); }
  return <Page title={registry?.title ?? 'A little wish list'} subtitle={registry?.display_name ? `A registry for ${registry.display_name}` : 'Thoughtful gifts for someone you love.'}>
    {result.loading ? <Loading label="Opening the registry…" /> : null}<Feedback error={result.error} />{result.error ? <Button label="Try again" secondary onPress={result.retry} /> : null}
    {result.data?.passwordRequired ? <Card><Title>This registry is protected</Title><Copy>Enter the password shared with you by the registry owner.</Copy><Field label="Registry password" value={draftPassword} onChangeText={setDraftPassword} secureTextEntry autoCapitalize="none" onSubmitEditing={unlock} /><Feedback error={access.attempt > 0 ? result.data.error : undefined} /><Button label="Open registry" disabled={!draftPassword || result.loading} onPress={unlock} /></Card> : null}
    {registry ? <>{registry.description ? <Copy>{registry.description}</Copy> : null}{registry.event_date ? <Copy style={{ color: t.colors.muted }}>Celebrating {registry.event_date}</Copy> : null}<RegistrySummary registry={registry} />{registry.has_shipping ? <Card tint><Title>Gift delivery</Title><Copy>{registry.delivery_summary || 'Delivery details are handled privately during checkout.'}</Copy></Card> : null}{added ? <RouteButton label="View gift bag" path="/bag" /> : null}<Title>Choose a gift</Title>{registry.items.length === 0 ? <Copy>The owner hasn’t added any gifts yet. Check back soon.</Copy> : registry.items.map(item => <GuestGift key={item.id} item={item} registry={registry} token={token} password={access.password} onAdded={() => setAdded(true)} />)}<Copy style={{ fontSize: 13, color: t.colors.muted }}>Gifts are confirmed against this registry through CloudyBebe’s secure website checkout.</Copy><Button label="Refresh availability" secondary onPress={result.retry} /></> : null}
  </Page>;
}
function GuestGift({ item, registry, token, password, onAdded }: { item: RegistryItem; registry: Registry; token: string; password: string; onAdded: () => void }) {
  const shop = useShop();
  const [quantity, setQuantity] = useState('1');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const available = item.available && item.needed > 0 && !registry.paused;
  async function addGift() {
    if (pending || !available || !shop.ready) return; setError(''); setMessage('');
    const count = Number(quantity);
    if (!Number.isInteger(count) || count < 1 || count > item.needed) { setError(`Choose a quantity between 1 and ${item.needed}.`); return; }
    setPending(true);
    try {
      const product = await storeGet<Product>(`products/${item.variation_id || item.product_id}`);
      if (item.variation_id ? product.id !== item.variation_id || product.parent !== item.product_id : product.id !== item.product_id) throw new Error('This gift’s product option has changed. Refresh the registry and try again.');
      const maximum = Math.min(item.needed, product.add_to_cart.maximum || 9999);
      const minimum = product.add_to_cart.minimum || 1;
      const step = product.add_to_cart.multiple_of || 1;
      if (maximum < minimum) throw new Error('The remaining registry quantity is below the store’s minimum purchase quantity. Please contact CloudyBebe for help.');
      if (count < minimum || count > maximum || (count - minimum) % step !== 0) throw new Error(`Choose a quantity from ${minimum} to ${maximum}, in steps of ${step}.`);
      const alreadyInBag = shop.bag.find(row => row.product.id === product.id)?.quantity ?? 0;
      if (alreadyInBag + count > maximum) throw new Error(alreadyInBag >= maximum ? 'The available quantity for this gift is already in your bag.' : `You can add ${maximum - alreadyInBag} more of this gift. Update the quantity and try again.`);
      const limited = { ...product, add_to_cart: { ...product.add_to_cart, maximum } };
      const failure = shop.add(limited, count, { registry_id: registry.id, registry_item_id: item.id, registry_token: token, ...(password ? { registry_password: password } : {}), registry_title: registry.title });
      if (failure) throw new Error(failure);
      setMessage('Added to your gift bag.'); onAdded();
    } catch (failure) { setError(errorMessage(failure)); } finally { setPending(false); }
  }
  return <Card><GiftInfo item={item} />{available ? <QuantityField label="Gift quantity" value={quantity} onChange={setQuantity} max={item.needed} /> : <Copy>{item.needed <= 0 ? 'This gift has been fully purchased.' : registry.paused ? 'This registry is currently paused.' : 'This gift is currently unavailable.'}</Copy>}<Feedback error={error} message={message} /><Button label={pending ? 'Adding gift…' : 'Add gift to bag'} disabled={!available || pending || !shop.ready} onPress={() => void addGift()} /></Card>;
}
