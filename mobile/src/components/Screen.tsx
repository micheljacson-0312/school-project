// Screen wrapper — handles safe-area + horizontal padding + ScrollView.
// All screens wrap their content in <Screen>.
import React from 'react';
import { ScrollView, StyleSheet, View, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../config/theme';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  bg?: string;
}

export default function Screen({ children, scroll = true, refreshing, onRefresh, bg }: Props) {
  const Container = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bg || theme.colors.bg }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <Container
        style={styles.flex}
        contentContainerStyle={scroll ? styles.scrollContent : undefined}
        refreshControl={
          scroll && onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand} />
          ) : undefined
        }
      >
        {children}
      </Container>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
});
