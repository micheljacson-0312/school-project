// Parent bottom-tab navigator. Six tabs:
//   Home, Attendance, Results, Fees, Inbox, Profile.
//
// Home shows the children list with a per-child summary card.
// Attendance / Results / Fees each have a ChildPicker at the top so
// the parent can switch between kids with one tap.
import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { theme } from '../config/theme';
import ParentDashboardScreen from '../screens/parent/ParentDashboardScreen';
import ParentAttendanceScreen from '../screens/parent/ParentAttendanceScreen';
import ParentResultsScreen from '../screens/parent/ParentResultsScreen';
import ParentFeesScreen from '../screens/parent/ParentFeesScreen';
import ParentEvaluationsScreen from '../screens/parent/ParentEvaluationsScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{
      fontSize: 11,
      color: focused ? theme.colors.emerald : theme.colors.textSubtle,
      fontWeight: focused ? '700' : '400',
    }}>{label}</Text>
  );
}

export default function ParentTabBar() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.white },
        headerTitleStyle: { fontWeight: '600' },
        tabBarActiveTintColor: theme.colors.emerald,
        tabBarInactiveTintColor: theme.colors.textSubtle,
        tabBarStyle: { backgroundColor: theme.colors.white, borderTopColor: theme.colors.border },
      }}
    >
      <Tab.Screen name="Home"        component={ParentDashboardScreen}
                  options={{ title: 'Home', tabBarIcon: ({ focused }) => <TabIcon label="🏠 Home" focused={focused} /> }} />
      <Tab.Screen name="Attendance"  component={ParentAttendanceScreen}
                  options={{ title: 'Attendance', tabBarIcon: ({ focused }) => <TabIcon label="📅 Attend." focused={focused} /> }} />
      <Tab.Screen name="Results"     component={ParentResultsScreen}
                  options={{ title: 'Results', tabBarIcon: ({ focused }) => <TabIcon label="📊 Results" focused={focused} /> }} />
      <Tab.Screen name="Fees"        component={ParentFeesScreen}
                  options={{ title: 'Fees', tabBarIcon: ({ focused }) => <TabIcon label="💳 Fees" focused={focused} /> }} />
      <Tab.Screen name="Feedback"    component={ParentEvaluationsScreen}
                  options={{ title: 'Feedback', tabBarIcon: ({ focused }) => <TabIcon label="💬 Feedback" focused={focused} /> }} />
      <Tab.Screen name="Inbox"       component={NotificationsScreen}
                  options={{ title: 'Inbox', tabBarIcon: ({ focused }) => <TabIcon label="🔔 Inbox" focused={focused} /> }} />
      <Tab.Screen name="Profile"     component={ProfileScreen}
                  options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon label="👤 Me" focused={focused} /> }} />
    </Tab.Navigator>
  );
}
