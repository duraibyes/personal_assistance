import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const FALLBACK_KEY = 'wealthguard_device_id';

let cached: string | null = null;

/**
 * An id that stays the same when the app is reinstalled on this phone.
 * Android's ANDROID_ID is stable per device + signing key (other apps can't read the same value);
 * iOS vendor id is the closest equivalent. Falls back to a random id kept in SecureStore.
 */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  let id: string | null = null;
  try {
    id = Platform.OS === 'android' ? Application.getAndroidId() : await Application.getIosIdForVendorAsync();
  } catch {
    id = null;
  }
  if (!id) {
    id = await SecureStore.getItemAsync(FALLBACK_KEY);
    if (!id) {
      id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
      await SecureStore.setItemAsync(FALLBACK_KEY, id);
    }
  }
  cached = id;
  return id;
}

export function getDeviceName() {
  return Constants.deviceName || `${Platform.OS === 'android' ? 'Android' : 'iOS'} phone`;
}

export async function deviceInfo() {
  return { deviceId: await getDeviceId(), deviceName: getDeviceName() };
}

/**
 * Asks for the phone's fingerprint / face / PIN before a password-less sign-in.
 * Phones with no screen lock set up can't be verified, so they are let through.
 */
export async function confirmPhoneOwner(promptMessage: string): Promise<boolean> {
  try {
    const [hasHardware, enrolled, level] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.getEnrolledLevelAsync(),
    ]);
    if (level === LocalAuthentication.SecurityLevel.NONE && !(hasHardware && enrolled)) return true;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}
