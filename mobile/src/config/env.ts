// Centralized env access. EXPO_PUBLIC_* vars are inlined at build time
// by Expo's bundler, so this works in dev, preview, and production.
import Constants from 'expo-constants';

function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  // Expo extra config (set in app.json) overrides at build time.
  const fromExtra = (Constants.expoConfig?.extra as any)?.apiUrl;
  if (fromExtra) return String(fromExtra).replace(/\/$/, '');
  // Convenience defaults for common dev environments.
  // Android emulator: 10.0.2.2 maps to host machine's localhost.
  // iOS simulator: localhost works directly.
  return 'http://localhost:4000';
}

export const env = {
  apiUrl: resolveApiUrl(),
  appVersion: (Constants.expoConfig?.version as string) || '0.1.0',
};
