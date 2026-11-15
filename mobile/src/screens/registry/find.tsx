import { useState } from 'react';
import { router } from 'expo-router';
import { Button, Copy, Title } from '@/components/ui';
import { mobileRequest, type RegistryResult } from '@/lib/mobile-api';
import { useResource } from '@/hooks/use-resource';
import { Card, Field, Feedback, Loading, Page } from '@/screens/account/shared';
import { theme as t } from '@/theme';

export default function FindRegistryScreen() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState<{ value: string; key: number }>();
  const [error, setError] = useState('');
  const result = useResource(signal => query ? mobileRequest<{ registries: RegistryResult[] }>(`registries/find?search=${encodeURIComponent(query.value)}`, { signal }) : Promise.resolve({ registries: [] }), [query]);
  function submit() { if (search.trim().length < 2) { setError('Enter at least 2 characters from the registry title.'); return; } setError(''); setQuery(old => ({ value: search.trim(), key: (old?.key ?? 0) + 1 })); }
  return <Page title="Find a registry" subtitle="Find a little wish list for someone you love."><Field label="Registry title" value={search} onChangeText={setSearch} placeholder="Enter the registry title" returnKeyType="search" onSubmitEditing={submit} /><Button label="Find registry" disabled={!!query && result.loading} onPress={submit} /><Copy style={{ color: t.colors.muted, fontSize: 14 }}>Search uses registry titles. Only registries marked Searchable appear here.</Copy><Feedback error={error || result.error} />{query && result.loading ? <Loading label="Looking for registries…" /> : null}{result.error ? <Button label="Try again" onPress={result.retry} secondary /> : null}{query && !result.loading && !result.error && result.data?.registries.length === 0 ? <Card><Title>No registries found</Title><Copy>Try another part of the title. For a link-only or password protected registry, ask the owner for their sharing link.</Copy></Card> : null}{result.data?.registries.map((registry, index) => <Card key={registry.token || index}><Title>{registry.title}</Title><Copy style={{ color: t.colors.muted }}>{registry.name}</Copy><Button label="View registry" secondary onPress={() => router.push({ pathname: '/registry/public/[token]', params: { token: registry.token } })} /></Card>)}</Page>;
}
