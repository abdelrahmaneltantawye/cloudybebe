import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Cabin_400Regular } from '@expo-google-fonts/cabin/400Regular';
import { Cabin_600SemiBold } from '@expo-google-fonts/cabin/600SemiBold';
import { Lexend_500Medium } from '@expo-google-fonts/lexend/500Medium';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ShopProvider } from '@/state/shop';
import { SessionProvider } from '@/state/session';
import { ThemeProvider, useThemeContext } from '@/design-system';
import { PrivacyShield } from '@/components/privacy-shield';
import { registerForPushNotificationsAsync, setupNotificationListeners } from '@/lib/notifications';

export { ErrorBoundary } from 'expo-router';
void SplashScreen.preventAutoHideAsync();

function AppNavigation() {
  const { theme: t, colorScheme } = useThemeContext();

  return (
    <View
      style={{
        flex: 1,
        width: '100%',
        maxWidth: Platform.OS === 'web' ? 480 : undefined,
        alignSelf: 'center',
        backgroundColor: t.colors.background,
      }}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.ink,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: t.colors.background },
          headerTitleStyle: { fontFamily: t.font.strong },
          headerBackTitle: 'Back',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="shop" options={{ headerShown: false }} />
        <Stack.Screen name="registry/index" options={{ title: 'Baby Registry', headerBackTitle: 'Back' }} />
        <Stack.Screen name="product/[id]" options={{ title: 'Product details', headerBackTitle: 'Back' }} />
        <Stack.Screen name="saved" options={{ title: 'Wishlist', headerBackTitle: 'Back' }} />
        <Stack.Screen name="checkout" options={{ title: 'Secure checkout', presentation: 'modal' }} />
        <Stack.Screen name="website" options={{ title: 'CloudyBebe', presentation: 'modal' }} />
        <Stack.Screen name="account/notifications" options={{ title: 'Push Notifications', headerBackTitle: 'Back' }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Cabin: Cabin_400Regular,
    CabinBold: Cabin_600SemiBold,
    Lexend: Lexend_500Medium,
    ...Ionicons.font,
  });

  useEffect(() => {
    if (loaded || error) {
      void SplashScreen.hideAsync();
      void registerForPushNotificationsAsync();
    }
    const cleanup = setupNotificationListeners();
    return () => {
      cleanup();
    };
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SessionProvider>
          <ShopProvider>
            <PrivacyShield>
              <AppNavigation />
            </PrivacyShield>
          </ShopProvider>
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
