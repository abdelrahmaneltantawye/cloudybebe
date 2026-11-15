import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricType = 'FaceID' | 'Fingerprint' | 'Iris' | 'Biometrics';

export interface BiometricStatus {
  hasHardware: boolean;
  isEnrolled: boolean;
  biometricType: BiometricType | null;
}

export interface BiometricAuthResult {
  success: boolean;
  bypassed?: boolean;
  error?: string;
}

export const biometrics = {
  async getStatus(): Promise<BiometricStatus> {
    if (Platform.OS === 'web') {
      return {
        hasHardware: false,
        isEnrolled: false,
        biometricType: null,
      };
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

      let biometricType: BiometricType | null = null;
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'FaceID';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = 'Fingerprint';
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        biometricType = 'Iris';
      } else if (hasHardware && isEnrolled) {
        biometricType = 'Biometrics';
      }

      return {
        hasHardware,
        isEnrolled,
        biometricType,
      };
    } catch {
      return {
        hasHardware: false,
        isEnrolled: false,
        biometricType: null,
      };
    }
  },

  async authenticate(promptMessage = 'Verify your identity'): Promise<BiometricAuthResult> {
    if (Platform.OS === 'web') {
      return { success: true, bypassed: true };
    }

    try {
      const { hasHardware, isEnrolled } = await biometrics.getStatus();
      if (!hasHardware || !isEnrolled) {
        // Device lacks enrolled biometrics, allow system or passcode fallback
        return { success: true, bypassed: true };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      }

      return {
        success: false,
        error: result.error === 'user_cancel' ? 'Authentication cancelled' : 'Verification failed',
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Biometric error occurred',
      };
    }
  },
};
