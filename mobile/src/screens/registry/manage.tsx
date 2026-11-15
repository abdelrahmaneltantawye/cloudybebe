import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Copy, Title } from '@/components/ui';
import { useSession } from '@/state/session';
import { errorMessage, type Registry, type RegistryItem } from '@/lib/mobile-api';
import { AccountGate, Card, Choice, Feedback, Loading, Page } from '@/screens/account/shared';
import { GiftInfo, QuantityField, RegistrySummary, useOwnerRegistry } from '@/screens/registry/shared';
import { theme as t } from '@/theme';

export default function RegistryManageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AccountGate title="Your registry" returnTo={`/registry/${id}`}><RegistryManage id={id} /></AccountGate>;
}
function RegistryManage({ id }: { id: string }) {
  const source = useOwnerRegistry(id);
  const registry = source.registry;
  return <Page title={registry?.title ?? 'Your registry'} subtitle={registry?.description || 'A list made with love, ready for your growing family.'}>{source.loading && !registry ? <Loading label="Loading your registry…" /> : null}<Feedback error={source.error} />{source.error ? <Button label="Try again" onPress={source.retry} secondary /> : null}{registry ? <>{registry.event_date ? <Copy style={{ color: t.colors.muted }}>Celebrating {registry.event_date}</Copy> : null}{registry.paused ? <Card tint><Copy>This registry is paused. Guests can’t purchase gifts at the moment.</Copy></Card> : null}<RegistrySummary registry={registry} /><View style={{ gap: 10 }}><Button label="Add gifts from the shop" onPress={() => router.push('/shop')} /><Button label="Privacy & sharing" secondary onPress={() => router.push({ pathname: '/registry/share', params: { id } })} /><Button label="Edit registry details" secondary onPress={() => router.push({ pathname: '/registry/edit', params: { id } })} /></View><Title>Your gifts</Title>{registry.items.length === 0 ? <Card><Copy>Your list is ready for its first little wish. Open a product in the shop and choose Add to registry.</Copy></Card> : registry.items.map(item => <ManageGift key={`${item.id}-${item.quantity}-${item.priority}`} item={item} onSaved={source.setRegistry} />)}{registry.has_shipping ? <Card><Title>Gift delivery</Title><Copy>{registry.delivery_summary || 'A private delivery address has been saved.'}</Copy><Copy style={{ fontSize: 13, color: t.colors.muted }}>Your street address is visible to you and the store, and hidden from guests.</Copy></Card> : <Card><Copy>Add a delivery address in registry details before inviting people to buy gifts.</Copy></Card>}<Button label="Refresh registry" secondary onPress={source.retry} /></> : null}</Page>;
}
function ManageGift({ item, onSaved }: { item: RegistryItem; onSaved: (registry: Registry) => void }) {
  const session = useSession();
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [priority, setPriority] = useState(item.priority);
  const [removing, setRemoving] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function save(remove = false) {
    if (pending) return; setError('');
    if (!remove && (!Number.isInteger(Number(quantity)) || Number(quantity) < 1)) { setError('Choose a requested quantity of at least 1.'); return; }
    setPending(true);
    try { const registry = await session.request<Registry>(`registry-items/${item.id}`, { method: remove ? 'DELETE' : 'PATCH', ...(remove ? {} : { body: { quantity: Number(quantity), priority } }) }); onSaved(registry); }
    catch (failure) { setError(errorMessage(failure)); } finally { setPending(false); }
  }
  return <Card><GiftInfo item={item} /><QuantityField value={quantity} onChange={setQuantity} /><Choice checkbox label="Most wanted" selected={priority} onPress={() => setPriority(!priority)} /><Feedback error={error} /><Button label={pending ? 'Saving…' : 'Save gift changes'} secondary disabled={pending || (Number(quantity) === item.quantity && priority === item.priority)} onPress={() => void save()} />{removing ? <View style={{ gap: 10 }}><Copy>Remove this gift from your registry?</Copy><Button label="Remove gift" disabled={pending} onPress={() => void save(true)} /><Button label="Keep gift" secondary disabled={pending} onPress={() => setRemoving(false)} /></View> : <Button label="Remove from registry" secondary disabled={pending} onPress={() => setRemoving(true)} />}</Card>;
}
