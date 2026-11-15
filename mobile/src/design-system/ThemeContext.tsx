import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme as defaultLightTheme, darkTheme as defaultDarkTheme, type Theme } from '@/theme';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ActiveColorScheme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  colorScheme: ActiveColorScheme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = 'cloudybebe_theme_mode_v1';
const emptySubscribe = () => () => {};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then(saved => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemeModeState(saved);
      }
    }).catch(() => {});
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
  }, []);

  const colorScheme: ActiveColorScheme = useMemo(() => {
    if (themeMode === 'system') {
      // Prevents SSR hydration mismatch: server snapshot is always 'light'
      if (!isClient) return 'light';
      return systemScheme === 'dark' ? 'dark' : 'light';
    }
    return themeMode;
  }, [themeMode, systemScheme, isClient]);

  const activeTheme: Theme = useMemo(() => {
    return colorScheme === 'dark' ? defaultDarkTheme : defaultLightTheme;
  }, [colorScheme]);

  const toggleTheme = useCallback(() => {
    setThemeModeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      theme: activeTheme,
      colorScheme,
      themeMode,
      setThemeMode,
      toggleTheme,
    }),
    [activeTheme, colorScheme, themeMode, setThemeMode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: defaultLightTheme,
      colorScheme: 'light',
      themeMode: 'system',
      setThemeMode: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}

export function useTheme(): Theme {
  return useThemeContext().theme;
}
