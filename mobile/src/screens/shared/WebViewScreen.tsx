// WebView screen — for Jitsi live classes and any other embed.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../config/theme';

export default function WebViewScreen({ route }: { route: any }) {
  const { title, url } = route.params || {};
  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <WebView
        source={{ uri: url }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        originWhitelist={['*']}
        // Jitsi requires camera + mic permissions. WebView handles
        // permission requests automatically on Android; on iOS the
        // Info.plist entries (declared in app.json) grant them.
        mixedContentMode="always"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  web: { flex: 1 },
});
