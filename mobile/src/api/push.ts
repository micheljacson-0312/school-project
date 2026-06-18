// Native push registration — Expo push token storage.
import { Platform } from 'react-native';
import { api } from './client';

export async function registerDeviceForPush(expoPushToken: string, deviceName?: string, appVersion?: string) {
  return (await api.post('/api/push/register-device', {
    expo_push_token: expoPushToken,
    platform: Platform.OS,
    device_name: deviceName || undefined,
    app_version: appVersion || undefined,
  })).data;
}

export async function unregisterDeviceForPush(expoPushToken: string) {
  return (await api.delete('/api/push/register-device', {
    data: { expo_push_token: expoPushToken },
  })).data;
}

export async function listMyDevices() {
  return (await api.get('/api/push/devices')).data as { devices: any[] };
}
