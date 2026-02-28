import * as LocalAuthentication from 'expo-local-authentication';
import { BIOMETRIC_PROMPT_MESSAGE } from '@utils/constants';
import { Platform } from 'react-native';

export class BiometricService {
  /**
   * Check if device supports biometric authentication
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Web doesn't support biometric auth
      if (Platform.OS === 'web') {
        return false;
      }
      
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return compatible && enrolled;
    } catch {
      return false;
    }
  }

  /**
   * Get supported biometric types
   */
  async getSupportedTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
    // Web doesn't support biometric auth
    if (Platform.OS === 'web') {
      return [];
    }
    
    return LocalAuthentication.supportedAuthenticationTypesAsync();
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticate(promptMessage?: string): Promise<boolean> {
    try {
      // Web doesn't support biometric auth - always return true for demo
      if (Platform.OS === 'web') {
        return true;
      }
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || BIOMETRIC_PROMPT_MESSAGE,
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }

  /**
   * Authenticate before transaction signing
   */
  async authenticateForTransaction(): Promise<boolean> {
    const available = await this.isAvailable();
    
    if (!available) {
      // If biometrics not available, allow transaction
      // In production, you might want to require PIN
      return true;
    }

    return this.authenticate('Authenticate to sign transaction');
  }
}

export const biometricService = new BiometricService();
