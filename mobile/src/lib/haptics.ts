import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export const haptic = {
  light() {
    if (Platform.OS === 'web') {
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(10);
        }
      } catch {}
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },

  medium() {
    if (Platform.OS === 'web') {
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(20);
        }
      } catch {}
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },

  success() {
    if (Platform.OS === 'web') {
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([15, 50, 15]);
        }
      } catch {}
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },

  selection() {
    if (Platform.OS === 'web') return;
    void Haptics.selectionAsync().catch(() => {});
  },
};

export const haptics = haptic;

