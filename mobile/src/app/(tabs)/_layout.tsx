import { Platform, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '@/design-system';
import { useShop } from '@/state/shop';
import { haptics } from '@/lib/haptics';

const TABS = [
  { name: 'index', title: 'Shop', activeIcon: 'storefront', inactiveIcon: 'storefront-outline' },
  { name: 'wishlist', title: 'Wishlist', activeIcon: 'heart', inactiveIcon: 'heart-outline' },
  { name: 'bag', title: 'Cart', activeIcon: 'cart', inactiveIcon: 'cart-outline' },
  { name: 'account', title: 'My account', activeIcon: 'person', inactiveIcon: 'person-outline' },
] as const;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { count, saved } = useShop();
  const savedCount = saved.length;
  const { theme: t, colorScheme } = useThemeContext();
  const isDark = colorScheme === 'dark';

  const bottomInset = Platform.OS === 'ios' ? Math.max(insets.bottom, 14) : 8;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: false,
        animation: 'none',
        sceneStyle: { backgroundColor: t.colors.background },
        tabBarActiveTintColor: t.colors.primary,
        tabBarInactiveTintColor: isDark ? '#8E8E93' : '#8E8E93',
        tabBarStyle: {
          backgroundColor: isDark ? '#141416' : '#FFFFFF',
          borderTopWidth: 0.5,
          borderTopColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          height: 52 + bottomInset,
          paddingTop: 6,
          paddingBottom: bottomInset,
          elevation: 8,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: isDark ? 0.3 : 0.06,
          shadowRadius: 6,
        },
      }}
    >
      {TABS.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          listeners={{
            tabPress: () => {
              haptics.selection();
            },
          }}
          options={{
            title: tab.title,
            tabBarBadge:
              tab.name === 'bag' && count > 0
                ? count
                : tab.name === 'wishlist' && savedCount > 0
                  ? savedCount
                  : undefined,
            tabBarBadgeStyle: {
              backgroundColor: t.colors.primary,
              color: t.colors.white,
              fontSize: 10,
              fontFamily: t.font.strong,
              fontWeight: '700',
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              lineHeight: 16,
            },
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? tab.activeIcon : tab.inactiveIcon}
                color={focused ? t.colors.primary : isDark ? '#8E8E93' : '#8E8E93'}
                size={23}
              />
            ),
            tabBarLabel: ({ focused, children }) => (
              <Text
                style={{
                  fontFamily: focused ? t.font.strong : t.font.body,
                  fontSize: 10,
                  fontWeight: focused ? '700' : '500',
                  color: focused ? t.colors.primary : isDark ? '#8E8E93' : '#8E8E93',
                  marginTop: 2,
                }}
              >
                {children}
              </Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
