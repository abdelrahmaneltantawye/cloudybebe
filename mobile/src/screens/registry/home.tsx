import { useCallback, useState } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { Image } from 'expo-image';
import { Button, Copy, Title } from '@/components/ui';
import { useSession } from '@/state/session';
import { errorMessage, type Registry } from '@/lib/mobile-api';
import { Card, Feedback, Loading, Page, RouteButton } from '@/screens/account/shared';
import { theme as t } from '@/theme';

export default function RegistryHome() {
  const session = useSession();
  return <Page title="Baby Registry" tab subtitle="Thoughtful gifts for your new beginning."><Card><Title>A little wish list. A lot of love.</Title><Copy>Bring together the things you’ll love and use, then share your registry with family and friends.</Copy><Image source={require('../../../assets/images/site-gifts.jpg')} contentFit="cover" style={{ width: '100%', height: 170, borderRadius: 10 }} accessibilityLabel="Thoughtful gifts for a new baby" /><RouteButton label="Create your registry" path="/registry/create" /></Card><RouteButton label="Find a registry" path="/registry/find" secondary />{!session.ready ? <Loading label="Restoring your sign-in…" /> : session.token ? <OwnedRegistries /> : <Card tint><Copy>Already have a registry on our website? Sign in to manage the same list here.</Copy><RouteButton label="Sign in to your registry" path="/account/sign-in?returnTo=%2Fregistry" secondary /></Card>}<Copy style={{ fontSize: 13, color: t.colors.muted }}>Your full delivery address stays private. Guests only see the delivery summary provided for your registry.</Copy></Page>;
}
function OwnedRegistries() {
  const session = useSession();
  const request = session.request;
  const [registries, setRegistries] = useState<Registry[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    request<{ registries: Registry[] }>('registries', { signal: controller.signal }).then(value => { if (!controller.signal.aborted) setRegistries(value.registries); }).catch(failure => { if (!controller.signal.aborted) setError(errorMessage(failure)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  // Changing the revision deliberately reloads the same registry list.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, version]));
  return <><Title>Your registries</Title>{loading ? <Loading label="Loading your registries…" /> : null}<Feedback error={error} />{error ? <Button label="Try again" secondary onPress={() => setVersion(value => value + 1)} /> : null}{!loading && !error && registries?.length === 0 ? <Copy style={{ color: t.colors.muted }}>Your first registry is waiting to be created.</Copy> : null}{registries?.map(registry => <Card key={registry.id}><Title>{registry.title}</Title>{registry.event_date ? <Copy style={{ color: t.colors.muted }}>Celebrating {registry.event_date}</Copy> : null}<Copy>{registry.items.length} {registry.items.length === 1 ? 'gift' : 'gifts'} on your list</Copy><Button label="Manage registry" secondary onPress={() => router.push({ pathname: '/registry/[id]', params: { id: registry.id } })} /></Card>)}</>;
}
