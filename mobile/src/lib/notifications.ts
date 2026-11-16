import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const PUSH_TOKEN_STORAGE_KEY = '@cloudybebe_push_token';
const ALL_TOKENS_STORAGE_KEY = '@cloudybebe_registered_tokens';

// Configure foreground notification behavior
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Request notification permissions from iOS/Android and obtain push token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'ad694338-d8c7-45f3-9654-bb6993709dda',
    }).catch(() => null);

    const token = tokenData?.data ?? null;

    if (token) {
      await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
      await saveTokenLocally(token);
    }

    return token;
  } catch {
    return null;
  }
}

async function saveTokenLocally(token: string) {
  try {
    const raw = await AsyncStorage.getItem(ALL_TOKENS_STORAGE_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(token)) {
      list.push(token);
      await AsyncStorage.setItem(ALL_TOKENS_STORAGE_KEY, JSON.stringify(list));
    }
  } catch {}
}

export async function getSavedPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Schedule or send an instant local notification on the device
 */
export async function sendLocalNotification(params: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
}) {
  if (Platform.OS === 'web') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      data: params.data ?? {},
      sound: true,
      badge: params.badge,
    },
    trigger: null, // triggers immediately
  });
}

/**
 * Automated notification when an order is placed
 */
export async function notifyOrderConfirmed(orderNumber: string, total: string) {
  await sendLocalNotification({
    title: '🎉 Order Confirmed!',
    body: `Your CloudyBébé order #${orderNumber} (${total}) has been received and is being prepared.`,
    data: { route: '/orders' },
  });
}

/**
 * Automated notification for tracking updates
 */
export async function notifyTrackingUpdate(orderNumber: string, status: string, trackingNumber?: string) {
  const trackingText = trackingNumber ? ` Tracking: ${trackingNumber}` : '';
  await sendLocalNotification({
    title: `📦 Order #${orderNumber} Update`,
    body: `Status: ${status}.${trackingText} Tap to view your delivery progress.`,
    data: { route: `/orders` },
  });
}

/**
 * Dispatch push notification to a list of Expo push tokens via Expo Push API
 */
export async function sendPushNotificationToTokens(params: {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  const validTokens = params.tokens.filter(t => t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken'));
  if (validTokens.length === 0) return { success: false, message: 'No valid push tokens provided.' };

  const messages = validTokens.map(to => ({
    to,
    sound: 'default',
    title: params.title,
    body: params.body,
    data: params.data ?? {},
    badge: 1,
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    return { success: response.ok, data: result };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Push failed' };
  }
}

/**
 * Setup notification response listener to handle tapping on notifications
 */
export function setupNotificationListeners() {
  if (Platform.OS === 'web') return () => {};

  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as { route?: string } | undefined;
    if (data?.route) {
      try {
        router.push(data.route as any);
      } catch {}
    }
  });

  return () => {
    subscription.remove();
  };
}
