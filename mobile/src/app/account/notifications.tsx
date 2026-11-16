import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Copy, Title } from '@/components/ui';
import { useTheme } from '@/design-system';
import { Page, Card } from '@/screens/account/shared';
import {
  getSavedPushToken,
  registerForPushNotificationsAsync,
  sendLocalNotification,
  sendPushNotificationToTokens,
} from '@/lib/notifications';
import { haptic } from '@/lib/haptics';

export default function NotificationsAdminScreen() {
  const t = useTheme();
  const [token, setToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(true);

  // Form states
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [route, setRoute] = useState('/shop');
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');

  useEffect(() => {
    void loadToken();
  }, []);

  async function loadToken() {
    setLoadingToken(true);
    let current = await getSavedPushToken();
    if (!current) {
      current = await registerForPushNotificationsAsync();
    }
    setToken(current);
    setLoadingToken(false);
  }

  async function handleSendTest() {
    if (!title.trim() && !body.trim()) {
      setStatusType('error');
      setStatusMessage('Please enter a notification title or message.');
      return;
    }

    haptic.success();
    await sendLocalNotification({
      title: title.trim() || 'CloudyBébé',
      body: body.trim() || 'A thoughtful update from CloudyBébé.',
      data: { route: route.trim() || '/shop' },
    });

    setStatusType('success');
    setStatusMessage('Instant notification sent to this device! Check your notification center.');
  }

  async function handleBroadcast() {
    if (!title.trim() || !body.trim()) {
      setStatusType('error');
      setStatusMessage('Please enter both title and body to broadcast.');
      return;
    }

    if (!token) {
      setStatusType('error');
      setStatusMessage('Push notifications permission not granted on this device.');
      return;
    }

    setSending(true);
    setStatusMessage('');

    const res = await sendPushNotificationToTokens({
      tokens: [token],
      title: title.trim(),
      body: body.trim(),
      data: { route: route.trim() || '/shop' },
    });

    setSending(false);

    if (res.success) {
      haptic.success();
      setStatusType('success');
      setStatusMessage('Push notification delivered successfully via Expo Cloud!');
    } else {
      haptic.medium();
      setStatusType('error');
      setStatusMessage(res.message || 'Failed to send notification.');
    }
  }

  return (
    <Page title="Push Notifications" subtitle="Compose and send instant alerts to customer devices.">
      {/* Device Token Status */}
      <Card tint>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons
            name={token ? 'radio-button-on' : 'alert-circle'}
            size={20}
            color={token ? t.colors.success : t.colors.error}
          />
          <View style={{ flex: 1 }}>
            <Copy style={{ fontFamily: t.font.strong, fontSize: 15 }}>
              {token ? 'Push Service Active' : 'Push Service Inactive'}
            </Copy>
            <Copy style={{ fontSize: 12, color: t.colors.muted }}>
              {loadingToken
                ? 'Registering device token…'
                : token
                ? 'Device is registered to receive alerts.'
                : 'Permissions not granted. Tap below to enable.'}
            </Copy>
          </View>
        </View>
        {!token && (
          <Button label="Enable Push Notifications" secondary onPress={() => void loadToken()} />
        )}
      </Card>

      {/* Compose Notification Card */}
      <Card>
        <Title style={{ fontSize: 18 }}>Compose Notification</Title>

        {/* Title input */}
        <View style={{ gap: 6 }}>
          <Copy style={{ fontFamily: t.font.strong, fontSize: 14 }}>Notification Title</Copy>
          <TextInput
            placeholder="e.g. 🧸 New Arrival or Special Offer"
            placeholderTextColor={t.colors.muted}
            value={title}
            onChangeText={setTitle}
            style={{
              padding: 12,
              borderRadius: t.radius.sm,
              borderWidth: 1,
              borderColor: t.colors.border,
              backgroundColor: t.colors.surface,
              color: t.colors.ink,
              fontFamily: t.font.body,
              fontSize: 15,
            }}
          />
        </View>

        {/* Body input */}
        <View style={{ gap: 6 }}>
          <Copy style={{ fontFamily: t.font.strong, fontSize: 14 }}>Message Body</Copy>
          <TextInput
            placeholder="e.g. Discover our new organic bamboo blankets today."
            placeholderTextColor={t.colors.muted}
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={3}
            style={{
              padding: 12,
              borderRadius: t.radius.sm,
              borderWidth: 1,
              borderColor: t.colors.border,
              backgroundColor: t.colors.surface,
              color: t.colors.ink,
              fontFamily: t.font.body,
              fontSize: 15,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />
        </View>

        {/* Target route input */}
        <View style={{ gap: 6 }}>
          <Copy style={{ fontFamily: t.font.strong, fontSize: 14 }}>Destination Screen</Copy>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'Shop', path: '/shop' },
              { label: 'Orders', path: '/orders' },
              { label: 'Registry', path: '/registry' },
            ].map(item => (
              <Pressable
                key={item.path}
                onPress={() => setRoute(item.path)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  backgroundColor: route === item.path ? t.colors.primarySoft : t.colors.surface,
                  borderWidth: 1,
                  borderColor: route === item.path ? t.colors.primary : t.colors.border,
                }}
              >
                <Copy style={{ fontSize: 13, color: route === item.path ? t.colors.primary : t.colors.ink }}>
                  {item.label}
                </Copy>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Status Feedback */}
        {statusMessage ? (
          <View
            style={{
              padding: 10,
              borderRadius: 8,
              backgroundColor: statusType === 'success' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(235, 87, 87, 0.1)',
            }}
          >
            <Copy
              style={{
                color: statusType === 'success' ? t.colors.success : t.colors.error,
                fontSize: 13,
                fontFamily: t.font.strong,
              }}
            >
              {statusMessage}
            </Copy>
          </View>
        ) : null}

        {/* Actions */}
        <View style={{ gap: 10, paddingTop: 8 }}>
          <Button
            label="Send Test to This Device"
            secondary
            onPress={() => void handleSendTest()}
          />
          <Button
            label={sending ? 'Sending Push…' : '🚀 Broadcast Push Notification'}
            disabled={sending}
            onPress={() => void handleBroadcast()}
          />
        </View>
      </Card>
    </Page>
  );
}
