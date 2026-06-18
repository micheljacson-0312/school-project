// Student bottom-tab navigator. Five tabs: Home, Attendance, Assignments,
// Results, More (Notifications + Profile + Logout).
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { theme } from '../config/theme';
import StudentDashboardScreen from '../screens/student/StudentDashboardScreen';
import StudentAttendanceScreen from '../screens/student/StudentAttendanceScreen';
import StudentAssignmentsScreen from '../screens/student/StudentAssignmentsScreen';
import StudentResultsScreen from '../screens/student/StudentResultsScreen';
import StudentLiveClassesScreen from '../screens/student/StudentLiveClassesScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import { useSession } from '../auth/SessionContext';

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{
      fontSize: 11,
      color: focused ? theme.colors.brand : theme.colors.textSubtle,
      fontWeight: focused ? '700' : '400',
    }}>{label}</Text>
  );
}

export default function StudentTabBar() {
  const { user, logout } = useSession();
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.white },
        headerTitleStyle: { fontWeight: '600' },
        tabBarActiveTintColor: theme.colors.brand,
        tabBarInactiveTintColor: theme.colors.textSubtle,
        tabBarStyle: { backgroundColor: theme.colors.white, borderTopColor: theme.colors.border },
      }}
    >
      <Tab.Screen name="Home"        component={StudentDashboardScreen}
                  options={{ title: 'Home', tabBarIcon: ({ focused }) => <TabIcon label="🏠 Home" focused={focused} /> }} />
      <Tab.Screen name="Attendance"  component={StudentAttendanceScreen}
                  options={{ title: 'Attendance', tabBarIcon: ({ focused }) => <TabIcon label="📅 Attend." focused={focused} /> }} />
      <Tab.Screen name="Classes"     component={StudentLiveClassesScreen}
                  options={{ title: 'Classes', tabBarIcon: ({ focused }) => <TabIcon label="🎥 Classes" focused={focused} /> }} />
      <Tab.Screen name="Assignments" component={StudentAssignmentsScreen}
                  options={{ title: 'Work', tabBarIcon: ({ focused }) => <TabIcon label="📝 Work" focused={focused} /> }} />
      <Tab.Screen name="Results"     component={StudentResultsScreen}
                  options={{ title: 'Results', tabBarIcon: ({ focused }) => <TabIcon label="📊 Results" focused={focused} /> }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen}
                  options={{ title: 'Inbox', tabBarIcon: ({ focused }) => <TabIcon label="🔔 Inbox" focused={focused} /> }} />
      <Tab.Screen name="Profile"     component={ProfileScreen}
                  options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon label="👤 Me" focused={focused} /> }} />
    </Tab.Navigator>
  );
}
