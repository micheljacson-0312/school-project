// Push notification setup — Expo notifications + registration with
// the backend. Called from App.tsx after SessionProvider is mounted.
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { registerDeviceForPush } from '../api/push';

// How should notifications appear when the app is in the foreground?
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    // Simulator/emulator: skip (Expo gives a non-real token).
    return null;
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId: (Constants.expoConfig?.extra as any)?.eas?.projectId,
  });

  // Register with our backend (best-effort).
  try {
    await registerDeviceForPush(token, Device.modelName || undefined, (Constants.expoConfig?.version as string) || undefined);
  } catch {
    /* network blip — retry next launch */
  }
  return token;
}

// Add a listener so taps deep-link to the relevant screen.
export function addNotificationTapListener(handler: (data: any) => void) {
  const sub = Notifications.addNotificationResponseReceivedListener(resp => {
    handler(resp.notification.request.content.data);
  });
  return () => sub.remove();
}
