import { useEffect, useState } from 'react';
import { Button, Copy, Title } from '@/components/ui';
import { errorMessage } from '@/lib/mobile-api';
import { useSession } from '@/state/session';
import { useThemeContext } from '@/design-system';
import { AccountGate, Card, Choice, Field, Feedback, Page, RouteButton, websiteRoute } from '@/screens/account/shared';
import { biometrics, type BiometricStatus } from '@/lib/biometrics';

export default function SettingsScreen() {
  const [complete, setComplete] = useState('');
  if (complete)
    return (
      <Page title="Deletion request submitted">
        <Feedback message={complete} />
        <Copy>Check your email to confirm the request. You have been signed out.</Copy>
        <RouteButton label="Continue shopping" path="/" />
      </Page>
    );
  return (
    <AccountGate title="Account settings" returnTo="/account/settings">
      <SettingsForm onComplete={setComplete} />
    </AccountGate>
  );
}

function SettingsForm({ onComplete }: { onComplete: (message: string) => void }) {
  const session = useSession();
  const { themeMode, setThemeMode } = useThemeContext();
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [bioStatus, setBioStatus] = useState<BiometricStatus | null>(null);

  useEffect(() => {
    void biometrics.getStatus().then(setBioStatus);
  }, []);

  async function requestDeletion() {
    if (pending) return;
    if (confirmation !== 'DELETE' || !password) {
      setError('Enter your password and type DELETE to confirm.');
      return;
    }

    const bioAuth = await biometrics.authenticate('Confirm account deletion request');
    if (!bioAuth.success && !bioAuth.bypassed) {
      setError(bioAuth.error || 'Identity verification cancelled.');
      return;
    }

    setPending(true);
    setError('');
    try {
      const result = await session.request<{ requested: boolean; requires_email_confirmation: boolean; message: string }>(
        'me/deletion',
        { method: 'POST', body: { password, confirm: true } }
      );
      if (!result.requested) throw new Error('Your deletion request could not be submitted. Please try again.');
      setPassword('');
      onComplete(result.message);
      await session.signOut().catch(() => undefined);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setPending(false);
    }
  }

  return (
    <Page title="Account settings">
      <Card>
        <Title>Appearance</Title>
        <Copy>Choose whether CloudyBébé matches your device theme or stays in light or dark mode.</Copy>
        <Choice
          label="Match system"
          detail="Automatically switch between light and dark with your device"
          selected={themeMode === 'system'}
          onPress={() => setThemeMode('system')}
        />
        <Choice
          label="Light mode"
          detail="Classic airy cream palette with soft pastels and dark logo"
          selected={themeMode === 'light'}
          onPress={() => setThemeMode('light')}
        />
        <Choice
          label="Dark mode"
          detail="Deep midnight slate with high-contrast white logo"
          selected={themeMode === 'dark'}
          onPress={() => setThemeMode('dark')}
        />
      </Card>
      <Card>
        <Title>Password & privacy</Title>
        <Copy>Request a secure email link to change your password.</Copy>
        <RouteButton label="Reset password" path="/account/reset-password" secondary />
        <RouteButton label="Privacy policy" path={websiteRoute('/privacy-policy/', 'Privacy policy')} secondary />
      </Card>
      {bioStatus?.hasHardware && bioStatus.isEnrolled ? (
        <Card>
          <Title>Device security</Title>
          <Copy>
            {bioStatus.biometricType || 'Biometrics'} is active on this device. Sensitive actions like account deletion
            are protected by hardware verification.
          </Copy>
        </Card>
      ) : null}
      <Card>
        <Title>Delete your account</Title>
        <Copy>
          Submit a request to erase your account and personal data. You’ll receive an email to confirm the request. Order
          information that must be retained by law may be kept.
        </Copy>
        <Copy>You’ll be signed out after the request is submitted. This affects the same account you use on the website.</Copy>
        {!confirming ? (
          <Button label="Request account deletion" secondary onPress={() => setConfirming(true)} />
        ) : (
          <>
            <Field
              label="Current password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
            />
            <Field
              label="Type DELETE to confirm"
              value={confirmation}
              onChangeText={setConfirmation}
              autoCapitalize="characters"
            />
            <Button
              label={pending ? 'Submitting request…' : 'Submit deletion request'}
              disabled={pending || confirmation !== 'DELETE' || !password}
              onPress={() => void requestDeletion()}
            />
            <Button
              label="Cancel"
              secondary
              disabled={pending}
              onPress={() => {
                setConfirming(false);
                setPassword('');
                setConfirmation('');
                setError('');
              }}
            />
          </>
        )}
        <Feedback error={error} />
      </Card>
    </Page>
  );
}
