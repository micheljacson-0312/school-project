// Teacher bottom-tab navigator. Seven tabs:
//   Home, Attendance, Classes, Results, Remarks, Inbox, Profile.
//
// "Attendance" is the daily-driver — quick bulk-mark for a class.
// "Classes" surfaces live class management + Jitsi join.
// "Results" opens the bulk marks upload (mobile-friendly numeric input).
import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { theme } from '../config/theme';
import TeacherDashboardScreen from '../screens/teacher/TeacherDashboardScreen';
import TeacherAttendanceScreen from '../screens/teacher/TeacherAttendanceScreen';
import TeacherLiveClassesScreen from '../screens/teacher/TeacherLiveClassesScreen';
import TeacherResultsScreen from '../screens/teacher/TeacherResultsScreen';
import TeacherRemarksScreen from '../screens/teacher/TeacherRemarksScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{
      fontSize: 11,
      color: focused ? theme.colors.amber : theme.colors.textSubtle,
      fontWeight: focused ? '700' : '400',
    }}>{label}</Text>
  );
}

export default function TeacherTabBar() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.white },
        headerTitleStyle: { fontWeight: '600' },
        tabBarActiveTintColor: theme.colors.amber,
        tabBarInactiveTintColor: theme.colors.textSubtle,
        tabBarStyle: { backgroundColor: theme.colors.white, borderTopColor: theme.colors.border },
      }}
    >
      <Tab.Screen name="Home"        component={TeacherDashboardScreen}
                  options={{ title: 'Home', tabBarIcon: ({ focused }) => <TabIcon label="🏠 Home" focused={focused} /> }} />
      <Tab.Screen name="Attendance"  component={TeacherAttendanceScreen}
                  options={{ title: 'Attendance', tabBarIcon: ({ focused }) => <TabIcon label="📅 Attend." focused={focused} /> }} />
      <Tab.Screen name="Classes"     component={TeacherLiveClassesScreen}
                  options={{ title: 'Classes', tabBarIcon: ({ focused }) => <TabIcon label="🎥 Classes" focused={focused} /> }} />
      <Tab.Screen name="Results"     component={TeacherResultsScreen}
                  options={{ title: 'Results', tabBarIcon: ({ focused }) => <TabIcon label="📊 Results" focused={focused} /> }} />
      <Tab.Screen name="Remarks"     component={TeacherRemarksScreen}
                  options={{ title: 'Remarks', tabBarIcon: ({ focused }) => <TabIcon label="💬 Remarks" focused={focused} /> }} />
      <Tab.Screen name="Inbox"       component={NotificationsScreen}
                  options={{ title: 'Inbox', tabBarIcon: ({ focused }) => <TabIcon label="🔔 Inbox" focused={focused} /> }} />
      <Tab.Screen name="Profile"     component={ProfileScreen}
                  options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon label="👤 Me" focused={focused} /> }} />
    </Tab.Navigator>
  );
}
