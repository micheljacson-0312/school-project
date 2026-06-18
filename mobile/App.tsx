// App entry — wraps everything in the required providers:
//   - SafeAreaProvider (for SafeAreaView in screens)
//   - QueryClientProvider (TanStack Query for caching + retries)
//   - SessionProvider (SecureStore-backed auth state)
//   - RootNavigator (login vs role-based tabs)
// On mount, we ask for push notification permissions and register the
// Expo push token with the backend.
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import { SessionProvider } from './src/auth/SessionContext';
import { registerForPushNotifications } from './src/push/notifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  useEffect(() => {
    // Best-effort push registration. Silent if permission denied or
    // running in a simulator without a real device.
    registerForPushNotifications().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <StatusBar style="auto" />
            <RootNavigator />
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
