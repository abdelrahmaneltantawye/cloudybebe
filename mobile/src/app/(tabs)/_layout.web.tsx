import { Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/design-system';
import { useShop } from '@/state/shop';
import { haptics } from '@/lib/haptics';

const TABS = [
  { name: 'index', title: 'Shop', activeIcon: 'storefront', inactiveIcon: 'storefront-outline' },
  { name: 'wishlist', title: 'Wishlist', activeIcon: 'heart', inactiveIcon: 'heart-outline' },
  { name: 'bag', title: 'Cart', activeIcon: 'bag-handle', inactiveIcon: 'bag-handle-outline' },
  { name: 'account', title: 'My account', activeIcon: 'person', inactiveIcon: 'person-outline' },
] as const;

export default function WebTabs() {
  const { count, saved } = useShop();
  const savedCount = saved.length;
  const { theme: t, colorScheme } = useThemeContext();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: false,
        animation: 'none',
        sceneStyle: { backgroundColor: t.colors.background },
        tabBarActiveTintColor: t.colors.primary,
        tabBarInactiveTintColor: isDark ? '#A0A5A2' : t.colors.navSlate,
        tabBarStyle: {
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          maxWidth: 460,
          marginHorizontal: 'auto',
          height: 64,
          borderRadius: 32,
          backgroundColor: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.97)',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(47, 58, 50, 0.08)',
          paddingTop: 6,
          paddingBottom: 6,
          paddingHorizontal: 8,
          ...({
            boxShadow: '0 16px 36px rgba(47, 58, 50, 0.14)',
            backdropFilter: 'blur(16px)',
          } as object),
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
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 4,
                  borderRadius: 16,
                  backgroundColor: focused ? t.colors.primarySoft : 'transparent',
                }}
              >
                <Ionicons
                  name={focused ? tab.activeIcon : tab.inactiveIcon}
                  color={focused ? t.colors.primary : isDark ? '#A0A5A2' : t.colors.navSlate}
                  size={21}
                />
              </View>
            ),
            tabBarLabel: ({ focused, children }) => (
              <Text
                style={{
                  fontFamily: focused ? t.font.strong : t.font.body,
                  fontSize: 10.5,
                  fontWeight: focused ? '700' : '600',
                  color: focused ? t.colors.primary : t.colors.muted,
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
