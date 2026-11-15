import { useState } from 'react';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Button, Copy } from '@/components/ui';
import { mobileRequest, errorMessage, type MobileConfig } from '@/lib/mobile-api';
import { useResource } from '@/hooks/use-resource';
import { useSession } from '@/state/session';
import { theme as t } from '@/theme';
import { Page, Field, Feedback, RouteButton, Card, Loading, websiteRoute } from '@/screens/account/shared';

export default function AuthScreen({ mode }: { mode: 'sign-in' | 'register' | 'reset' }) {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const session = useSession();
  const config = useResource(signal => mode === 'register' ? mobileRequest<MobileConfig>('config', { signal }) : Promise.resolve(undefined), [mode]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const title = mode === 'register' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Welcome back';
  const destination = typeof returnTo==='string' && /^\/(?:account|orders|registry|shop|bag|saved)(?:[/?#]|$)/.test(returnTo) && !/[\\\r\n]/.test(returnTo) ? returnTo : '/account';
  async function submit() {
    if (pending) return;
    setError(''); setMessage('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError('Enter a valid email address.'); return; }
    if (mode !== 'reset' && !password) { setError('Enter your password.'); return; }
    if (mode === 'register' && (!config.data || !config.data.registration_enabled)) { setError('Account registration is currently unavailable. Please try again later.'); return; }
    if (mode === 'register' && password.length < (config.data?.password_min_length ?? 12)) { setError(`Choose a password with at least ${config.data?.password_min_length ?? 12} characters.`); return; }
    setPending(true);
    try {
      if (mode === 'reset') {
        const result = await mobileRequest<{ message: string }>('auth/reset', { method: 'POST', body: { email: email.trim() } });
        setMessage(result.message || 'If an account matches this email, password reset instructions have been sent.');
      } else {
        await session.signIn({ email: email.trim(), password, ...(mode === 'register' ? { first_name: firstName.trim(), last_name: lastName.trim() } : {}) }, mode === 'register');
        setPassword(''); router.replace(destination as Href);
      }
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setPending(false); }
  }
  return <Page title={title} subtitle={mode === 'reset' ? 'Enter your account email and we’ll send you a secure reset link.' : 'Your CloudyBebe website account works here, too.'}>
    {mode === 'register' && config.loading ? <Loading label="Checking account registration…" /> : null}
    {mode === 'register' && config.error ? <><Feedback error={config.error} /><Button label="Try again" secondary onPress={config.retry} /></> : null}
    {mode === 'register' && config.data && !config.data.registration_enabled ? <Feedback error="Account registration is currently unavailable. You can still sign in with an existing account." /> : null}
    {mode === 'register' ? <><Field label="First name" value={firstName} onChangeText={setFirstName} autoComplete="given-name" textContentType="givenName" /><Field label="Last name" value={lastName} onChangeText={setLastName} autoComplete="family-name" textContentType="familyName" /></> : null}
    <Field label="Email address" value={email} onChangeText={setEmail} autoComplete="email" textContentType="emailAddress" autoCapitalize="none" keyboardType="email-address" />
    {mode !== 'reset' ? <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'register' ? 'new-password' : 'current-password'} textContentType={mode === 'register' ? 'newPassword' : 'password'} autoCapitalize="none" help={mode === 'register' ? `Use at least ${config.data?.password_min_length ?? 12} characters. A mix of words, numbers and symbols helps keep your account secure.` : undefined} onSubmitEditing={() => void submit()} /> : null}
    <Feedback error={error} message={message} />
    <Button label={pending ? 'Please wait…' : mode === 'register' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'} disabled={pending || (mode === 'register' && !config.data?.registration_enabled)} onPress={() => void submit()} />
    {mode === 'sign-in' ? <><RouteButton label="Forgot your password?" path="/account/reset-password" secondary /><Copy style={{ textAlign: 'center', color: t.colors.muted }}>New to CloudyBebe?</Copy><RouteButton label="Create an account" path={`/account/register?returnTo=${encodeURIComponent(destination)}`} secondary /></> : <RouteButton label="Back to sign in" path={`/account/sign-in?returnTo=${encodeURIComponent(destination)}`} secondary />}
    {mode === 'register' ? <Card><Copy style={{ fontSize: 13, color: t.colors.muted }}>Your account gives you access to your orders and Baby Registry. Read our privacy policy to learn how your information is used.</Copy><RouteButton label="Privacy policy" path={websiteRoute('/privacy-policy/', 'Privacy policy')} secondary /></Card> : null}
  </Page>;
}
