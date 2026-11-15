import { useState } from 'react';
import { View } from 'react-native';
import { Button, Copy } from '@/components/ui';
import { errorMessage, mobileRequest, type Address, type Addresses, type MobileConfig, type Country } from '@/lib/mobile-api';
import { useSession } from '@/state/session';
import { useResource } from '@/hooks/use-resource';
import { AccountGate, Choice, CountryField, Field, Feedback, Loading, Page } from '@/screens/account/shared';

export function AddressFields({ value, onChange, countries, billing = false }: { value: Partial<Address>; onChange: (address: Partial<Address>) => void; countries: Country[]; billing?: boolean }) {
  const update = (key: keyof Address, text: string) => onChange({ ...value, [key]: text });
  const states = countries.find(country => country.code === value.country)?.states ?? [];
  return <View style={{ gap: 17 }}><Field label="First name" value={value.first_name ?? ''} onChangeText={text => update('first_name', text)} autoComplete="given-name" /><Field label="Last name" value={value.last_name ?? ''} onChangeText={text => update('last_name', text)} autoComplete="family-name" /><Field label="Company (optional)" value={value.company ?? ''} onChangeText={text => update('company', text)} /><CountryField label="Country / region" value={value.country ?? ''} countries={countries} onChange={country => onChange({ ...value, country, state: '' })} /><Field label="Street address" value={value.address_1 ?? ''} onChangeText={text => update('address_1', text)} autoComplete="street-address" /><Field label="Apartment, suite, etc. (optional)" value={value.address_2 ?? ''} onChangeText={text => update('address_2', text)} /><Field label="Town / city" value={value.city ?? ''} onChangeText={text => update('city', text)} />{states.length ? <CountryField label="State / province" value={value.state ?? ''} countries={states.map(state => ({ ...state, states: [] }))} onChange={state => update('state', state)} /> : <Field label="State / province" value={value.state ?? ''} onChangeText={text => update('state', text)} />}<Field label="Postal code" value={value.postcode ?? ''} onChangeText={text => update('postcode', text)} autoComplete="postal-code" autoCapitalize="characters" /><Field label="Phone number" value={value.phone ?? ''} onChangeText={text => update('phone', text)} keyboardType="phone-pad" autoComplete="tel" />{billing ? <Field label="Billing email" value={value.email ?? ''} onChangeText={text => update('email', text)} keyboardType="email-address" autoCapitalize="none" autoComplete="email" /> : null}</View>;
}
export default function AddressesScreen() { return <AccountGate title="My addresses" returnTo="/account/addresses"><AddressForm /></AccountGate>; }
function AddressForm() {
  const session = useSession();
  const resource = useResource(signal => Promise.all([session.request<Addresses>('me/addresses', { signal }), mobileRequest<MobileConfig>('config', { signal })]), [session.token]);
  return <Page title="My addresses" subtitle="Save the details you use for your orders.">{resource.loading ? <Loading /> : null}<Feedback error={resource.error} />{resource.error ? <Button label="Try again" onPress={resource.retry} secondary /> : null}{resource.data ? <AddressEditor initial={resource.data[0]} config={resource.data[1]} /> : null}</Page>;
}
function AddressEditor({ initial, config }: { initial: Addresses; config: MobileConfig }) {
  const session = useSession();
  const [draft, setDraft] = useState<Addresses>(initial);
  const [kind, setKind] = useState<'shipping' | 'billing'>('shipping');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function save() {
    if (!draft || pending) return; setPending(true); setError(''); setMessage('');
    try { const result = await session.request<Addresses>('me/addresses', { method: 'PUT', body: { [kind]: draft[kind] } }); setDraft(old => ({ ...old, [kind]: result[kind] })); setMessage(`Your ${kind === 'shipping' ? 'delivery' : 'billing'} address has been saved.`); }
    catch (failure) { setError(errorMessage(failure)); } finally { setPending(false); }
  }
  return <><View style={{ gap: 8 }}><Choice label="Delivery address" selected={kind === 'shipping'} onPress={() => { if (!pending) { setKind('shipping'); setMessage(''); setError(''); } }} /><Choice label="Billing address" selected={kind === 'billing'} onPress={() => { if (!pending) { setKind('billing'); setMessage(''); setError(''); } }} /></View><AddressFields value={draft[kind]} countries={kind === 'shipping' ? config.shipping_countries : config.countries} billing={kind === 'billing'} onChange={address => setDraft({ ...draft, [kind]: address })} /><Copy>Required address fields are checked using the store’s delivery rules when you save.</Copy><Feedback error={error} message={message} /><Button label={pending ? 'Saving…' : `Save ${kind === 'shipping' ? 'delivery' : 'billing'} address`} disabled={pending} onPress={() => void save()} /></>;
}
