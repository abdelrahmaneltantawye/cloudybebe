import { useState } from 'react';
import { Button } from '@/components/ui';
import { errorMessage, type Customer } from '@/lib/mobile-api';
import { useSession } from '@/state/session';
import { useResource } from '@/hooks/use-resource';
import { AccountGate, Field, Feedback, Loading, Page } from '@/screens/account/shared';

export default function ProfileScreen() { return <AccountGate title="Personal details" returnTo="/account/profile"><ProfileLoader /></AccountGate>; }
function ProfileLoader() {
  const session = useSession();
  const result = useResource(signal => session.request<Customer>('me', { signal }), [session.token]);
  return result.data ? <ProfileForm initial={result.data} /> : <Page title="Personal details">{result.loading ? <Loading /> : null}<Feedback error={result.error} />{result.error ? <Button label="Try again" secondary onPress={result.retry} /> : null}</Page>;
}
function ProfileForm({ initial }: { initial: Customer }) {
  const session = useSession();
  const [firstName, setFirstName] = useState(initial.first_name);
  const [lastName, setLastName] = useState(initial.last_name);
  const [displayName, setDisplayName] = useState(initial.display_name);
  const [email, setEmail] = useState(initial.email);
  const [savedEmail, setSavedEmail] = useState(initial.email);
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const emailChanged = email.trim() !== savedEmail;
  async function save() {
    if (pending) return; setError(''); setMessage('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError('Enter a valid email address.'); return; }
    if (emailChanged && !password) { setError('Enter your current password to change your email address.'); return; }
    setPending(true);
    try { const user = await session.request<Customer>('me', { method: 'PATCH', body: { first_name: firstName.trim(), last_name: lastName.trim(), display_name: displayName.trim(), email: email.trim(), ...(emailChanged ? { current_password: password } : {}) } }); session.setUser(user); setSavedEmail(user.email); setEmail(user.email); setFirstName(user.first_name); setLastName(user.last_name); setDisplayName(user.display_name); setPassword(''); setMessage('Your details have been saved.'); }
    catch (failure) { setError(errorMessage(failure)); } finally { setPending(false); }
  }
  return <Page title="Personal details" subtitle="These details are shared with your CloudyBebe website account."><Field label="First name" value={firstName} onChangeText={setFirstName} autoComplete="given-name" /><Field label="Last name" value={lastName} onChangeText={setLastName} autoComplete="family-name" /><Field label="Display name" value={displayName} onChangeText={setDisplayName} /><Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />{emailChanged ? <Field label="Current password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" /> : null}<Feedback error={error} message={message} /><Button label={pending ? 'Saving…' : 'Save changes'} disabled={pending} onPress={() => void save()} /></Page>;
}
