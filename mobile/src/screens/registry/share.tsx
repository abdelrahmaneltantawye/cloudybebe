import { useState } from 'react';
import { Share } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Button, Copy, Title } from '@/components/ui';
import { useSession } from '@/state/session';
import { errorMessage, type Registry, type RegistryVisibility } from '@/lib/mobile-api';
import { AccountGate, Card, Choice, Field, Feedback, Loading, Page } from '@/screens/account/shared';
import { privacyChoices, useOwnerRegistry } from '@/screens/registry/shared';

export default function RegistryShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AccountGate title="Privacy & sharing" returnTo={`/registry/share?id=${id}`}><ShareLoader id={id} /></AccountGate>;
}
function ShareLoader({ id }: { id: string }) {
  const source = useOwnerRegistry(id);
  return <Page title="Privacy & sharing" subtitle="Choose who can discover your list and how you invite them.">{source.loading && !source.registry ? <Loading /> : null}<Feedback error={source.error} />{source.error ? <Button label="Try again" secondary onPress={source.retry} /> : null}{source.registry ? <PrivacyEditor initial={source.registry} /> : null}</Page>;
}
function PrivacyEditor({ initial }: { initial: Registry }) {
  const session = useSession();
  const [registry, setRegistry] = useState(initial);
  const [visibility, setVisibility] = useState<RegistryVisibility>(initial.visibility ?? 'unlisted');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const changed = visibility !== registry.visibility || !!password;
  const canShare = registry.visibility !== 'private' && !!registry.share_url && !changed;
  async function save() {
    if (pending) return; setError(''); setMessage('');
    if (visibility === 'password' && registry.visibility !== 'password' && !password.trim()) { setError('Choose a registry password.'); return; }
    setPending(true);
    try { const result = await session.request<Registry>(`registries/${registry.id}`, { method: 'PATCH', body: { visibility, ...(visibility === 'password' && password ? { password } : {}) } }); setRegistry(result); setPassword(''); setMessage('Your privacy settings have been saved.'); }
    catch (failure) { setError(errorMessage(failure)); } finally { setPending(false); }
  }
  async function share(copy = false) {
    setError(''); setMessage('');
    try {
      if (copy) { const success = await Clipboard.setStringAsync(registry.share_url); if (!success) throw new Error('The link couldn’t be copied. You can select and copy the address below.'); setMessage('Registry link copied.'); }
      else await Share.share({ title: registry.title, message: `A little wish list for a new beginning: ${registry.title}\n${registry.share_url}` });
    } catch (failure) { setError(errorMessage(failure)); }
  }
  return <><Title>Registry visibility</Title>{privacyChoices.map(choice => <Choice key={choice.value} label={choice.label} detail={choice.detail} selected={visibility === choice.value} onPress={() => setVisibility(choice.value)} />)}{visibility === 'password' ? <Field label={registry.visibility === 'password' ? 'New password (optional)' : 'Registry password'} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" help={registry.visibility === 'password' ? 'Leave empty to keep your current password. Share the password separately with your guests.' : 'Share this separately with the people you invite.'} /> : null}<Button label={pending ? 'Saving…' : 'Save privacy settings'} disabled={pending || !changed} onPress={() => void save()} /><Feedback error={error} message={message} /><Card><Title>Invite family & friends</Title>{registry.visibility === 'private' ? <Copy>Your registry is private. Choose another visibility setting and save it to invite guests.</Copy> : <><Copy selectable>{registry.share_url || 'The store hasn’t provided a sharing link yet.'}</Copy><Button label="Share registry" disabled={!canShare} onPress={() => void share()} /><Button label="Copy link" secondary disabled={!canShare} onPress={() => void share(true)} /></>}{changed ? <Copy>Save your changes before sharing your registry.</Copy> : null}</Card><Copy>Guests will never see your full street address on the public registry.</Copy></>;
}
