import React, { useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme, useThemeContext } from '@/design-system';
import { Copy } from '@/components/ui';

export function PrivacyShield({ children }: { children: ReactNode }) {
  const t = useTheme();
  const { colorScheme } = useThemeContext();
  const isDark = colorScheme === 'dark';
  const [isProtected, setIsProtected] = useState(false);

  const logoSource = isDark
    ? require('../../assets/images/cloudybebe-wordmark-white.png')
    : require('../../assets/images/cloudybebe-wordmark.png');

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', nextState => {
      setIsProtected(nextState !== 'active');
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      {children}
      {isProtected ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: t.colors.background,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999999,
              gap: t.space.md,
            },
          ]}
        >
          <Image
            source={logoSource}
            style={{ width: 180, height: 46 }}
            contentFit="contain"
          />
          <Copy style={{ color: t.colors.muted, fontSize: t.type.small }}>CloudyBébé · Secure Session</Copy>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
