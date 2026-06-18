// Root navigator — switches between the login flow and the role-based
// tab navigator based on the session.
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useSession, dashboardPathFor } from '../auth/SessionContext';
import LoginScreen from '../screens/auth/LoginScreen';
import StudentTabBar from './StudentTabBar';
import ParentTabBar from './ParentTabBar';
import TeacherTabBar from './TeacherTabBar';
import { theme } from '../config/theme';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, loading } = useSession();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.bg }}>
        <ActivityIndicator color={theme.colors.brand} size="large" />
      </View>
    );
  }

  // Not signed in → Login screen
  if (!user) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Signed in → role-based tab navigator.
  //   Phase A: Student   ✓
  //   Phase B: Parent    ✓
  //   Phase C: Teacher   ✓
  //   Phase D+: Admin / Coordinator / Accountant / Operator / Alumni → placeholder
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user.role.key === 'student' && (
          <Stack.Screen name="Student" component={StudentTabBar} />
        )}
        {user.role.key === 'parent' && (
          <Stack.Screen name="Parent" component={ParentTabBar} />
        )}
        {user.role.key === 'teacher' && (
          <Stack.Screen name="Teacher" component={TeacherTabBar} />
        )}
        {!['student', 'parent', 'teacher'].includes(user.role.key) && (
          <Stack.Screen name="OtherRole" component={OtherRoleScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function OtherRoleScreen() {
  // Phase D+ will add real tabs for admin / coordinator / accountant /
  // operator / alumni.
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: theme.colors.bg }}>
      <ActivityIndicator color={theme.colors.brand} size="large" />
    </View>
  );
}
