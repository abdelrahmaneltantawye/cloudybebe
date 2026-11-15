import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Copy, Title } from '@/components/ui';
import { useSession } from '@/state/session';
import { useResource } from '@/hooks/use-resource';
import { errorMessage, mobileRequest, type Address, type MobileConfig, type Registry, type RegistryVisibility } from '@/lib/mobile-api';
import { AccountGate, Card, Choice, Field, Feedback, Loading, Page } from '@/screens/account/shared';
import { AddressFields } from '@/screens/account/addresses';
import { privacyChoices, useOwnerRegistry } from '@/screens/registry/shared';

export default function RegistryFormScreen({ edit = false }: { edit?: boolean }) {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <AccountGate title={edit ? 'Edit registry' : 'Create your registry'} returnTo={edit ? `/registry/edit?id=${id}` : '/registry/create'}>{edit && id ? <EditLoader id={id} /> : <FormLoader />}</AccountGate>;
}
function EditLoader({ id }: { id: string }) {
  const source = useOwnerRegistry(id);
  return source.registry ? <FormLoader key={source.registry.id} initial={source.registry} /> : <Page title="Edit registry">{source.loading ? <Loading /> : null}<Feedback error={source.error} />{source.error ? <Button label="Try again" onPress={source.retry} secondary /> : null}</Page>;
}
function FormLoader({ initial }: { initial?: Registry }) {
  const result = useResource(signal => mobileRequest<MobileConfig>('config', { signal }), []);
  return <Page title={initial ? 'Edit registry' : 'Create your registry'} subtitle="A thoughtful little list for the people you love.">{result.loading ? <Loading /> : null}<Feedback error={result.error} />{result.error ? <Button label="Try again" secondary onPress={result.retry} /> : null}{result.data ? result.data.registry_enabled ? <RegistryForm initial={initial} config={result.data} /> : <Copy>Baby Registry is currently unavailable. Please try again later.</Copy> : null}</Page>;
}
function RegistryForm({ initial, config }: { initial?: Registry; config: MobileConfig }) {
  const session = useSession();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [name, setName] = useState(initial?.display_name ?? session.user?.first_name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date, setDate] = useState(initial?.event_date ?? '');
  const [visibility, setVisibility] = useState<RegistryVisibility>(initial?.visibility ?? 'unlisted');
  const [password, setPassword] = useState('');
  const [shipping, setShipping] = useState<Partial<Address>>(initial?.shipping ?? {});
  const [delivery, setDelivery] = useState(!!initial?.has_shipping);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    if (pending) return; setError('');
    if (!title.trim()) { setError('Give your registry a title.'); return; }
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date)) { setError('Enter a valid celebration date in YYYY-MM-DD format, or leave it empty.'); return; }
    if (!initial && visibility === 'password' && !password.trim()) { setError('Choose a password for your registry.'); return; }
    setPending(true);
    try {
      const body = { title: title.trim(), display_name: name.trim(), description: description.trim(), event_date: date, ...(delivery ? { shipping } : initial?.has_shipping ? { shipping: {} } : {}), ...(!initial ? { visibility, ...(visibility === 'password' ? { password } : {}) } : {}) };
      const registry = await session.request<Registry>(initial ? `registries/${initial.id}` : 'registries', { method: initial ? 'PATCH' : 'POST', body });
      setPassword(''); router.replace({ pathname: '/registry/[id]', params: { id: registry.id } });
    } catch (failure) { setError(errorMessage(failure)); } finally { setPending(false); }
  }
  return <><Field label="Registry title" value={title} onChangeText={setTitle} placeholder="e.g. A little welcome for Baby Taylor" maxLength={160} help="Searchable registries can be found by this title." /><Field label="Display name" value={name} onChangeText={setName} help="The name your guests will see." /><Field label="Celebration date (optional)" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" maxLength={10} autoCapitalize="none" /><Field label="A note for your guests (optional)" value={description} onChangeText={setDescription} multiline numberOfLines={4} maxLength={2000} style={{ minHeight: 100, textAlignVertical: 'top' }} />
    {!initial ? <><Title>Who can see your registry?</Title>{privacyChoices.map(choice => <Choice key={choice.value} label={choice.label} detail={choice.detail} selected={visibility === choice.value} onPress={() => setVisibility(choice.value)} />)}{visibility === 'password' ? <Field label="Registry password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" help="Share this separately with the people you invite." /> : null}</> : null}
    <Title>Gift delivery</Title><Choice checkbox label="Add a delivery address" detail="Guests see a delivery summary. Your street address stays private." selected={delivery} onPress={() => setDelivery(!delivery)} />{delivery ? <Card><AddressFields value={shipping} onChange={setShipping} countries={config.shipping_countries} /></Card> : <Copy>You can add delivery details later before you share your registry.</Copy>}
    <Feedback error={error} /><Button label={pending ? 'Saving…' : initial ? 'Save registry' : 'Create registry'} disabled={pending} onPress={() => void save()} /><View style={{ height: 10 }} />
  </>;
}
