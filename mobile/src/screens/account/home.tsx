import { useState } from 'react';
import { router, type Href } from 'expo-router';
import { Button, Copy, Title } from '@/components/ui';
import { useSession } from '@/state/session';
import { errorMessage } from '@/lib/mobile-api';
import { useTheme } from '@/design-system';
import { AccountGate, Card, Feedback, Page, Row } from '@/screens/account/shared';

export default function AccountHome() { return <AccountGate title="Your account" returnTo="/account" tab><AccountDetails /></AccountGate>; }
function AccountDetails() {
  const t = useTheme();
  const session = useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function signOut() { if (pending) return; setPending(true); try { await session.signOut(); } catch (failure) { setError(errorMessage(failure)); } finally { setPending(false); } }
  return <Page title="Your account" tab subtitle="Everything for your little one, in one place.">
    <Card tint><Title>{session.user ? `Hello, ${session.user.first_name || session.user.display_name || 'there'}` : 'Your CloudyBebe account'}</Title><Copy selectable style={{ color: t.colors.muted }}>{session.user?.email}</Copy>{!session.user ? <Button label="Load account details" secondary onPress={() => { void session.refresh().catch(failure => setError(errorMessage(failure))); }} /> : null}</Card>
    <Feedback error={error || session.error} />
    <Row label="My orders" detail="Order details and delivery updates" icon="bag-handle-outline" onPress={() => router.push('/orders' as Href)} />
    <Row label="Baby Registry" detail="A thoughtful list for your new arrival" icon="gift-outline" onPress={() => router.push('/registry')} />
    <Row label="Personal details" detail="Name and email address" icon="person-outline" onPress={() => router.push('/account/profile')} />
    <Row label="My addresses" detail="Delivery and billing details" icon="location-outline" onPress={() => router.push('/account/addresses')} />
    <Row label="Account settings" detail="Password, privacy and account deletion" icon="settings-outline" onPress={() => router.push('/account/settings')} />
    <Row label="Help & contact" icon="chatbubble-ellipses-outline" onPress={() => router.push('/account/help' as Href)} />
    <Button label={pending ? 'Signing out…' : 'Sign out'} secondary disabled={pending} onPress={() => void signOut()} />
  </Page>;
}
