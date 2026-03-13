import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { LoadingScreen } from '../components/ui';
import { ForceResetPasswordScreen, LoginScreen } from '../screens/AuthScreens';
import {
  AdminAttendanceScreen,
  AdminEventsScreen,
  AdminMessagesScreen,
  AdminMoreScreen,
  AdminTodayScreen,
} from '../screens/AdminScreens';
import {
  EducatorAttendanceScreen,
  EducatorCareScreen,
  EducatorHomeScreen,
  EducatorMessagesScreen,
  EducatorScheduleScreen,
} from '../screens/EducatorScreens';
import {
  ParentBillingScreen,
  ParentChildScreen,
  ParentEventsScreen,
  ParentHomeScreen,
  ParentMessagesScreen,
} from '../screens/ParentScreens';
import { SettingsScreen } from '../screens/SettingsScreen';
import { fonts, getRolePalette } from '../theme/tokens';
import { UserRole } from '../types/domain';
import { adminTabs, educatorTabs, parentTabs } from './roleConfig';

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function RoleTabs() {
  const { session } = useAuth();
  const role = session?.user.role || 'ADMIN';
  const palette = getRolePalette(role);

  const commonOptions = {
    headerShown: false,
    tabBarActiveTintColor: palette.primaryDark,
    tabBarInactiveTintColor: palette.muted,
    tabBarHideOnKeyboard: true,
    tabBarStyle: {
      backgroundColor: palette.surface,
      borderRadius: 30,
      borderTopWidth: 0,
      bottom: 16,
      elevation: 10,
      height: 72,
      left: 16,
      position: 'absolute' as const,
      right: 16,
    },
    tabBarLabelStyle: {
      fontFamily: fonts.bodyStrong,
      fontSize: 11,
      marginBottom: 6,
    },
  };

  if (role === 'ADMIN') {
    return (
      <Tab.Navigator screenOptions={({ route }) => ({
        ...commonOptions,
        tabBarIcon: ({ color, size }) => {
          const tab = adminTabs.find((entry) => entry.name === route.name);
          const Icon = tab?.icon;
          return Icon ? <Icon color={color} size={size} /> : null;
        },
        tabBarLabel: ({ color }) => {
          const tab = adminTabs.find((entry) => entry.name === route.name);
          return <Text style={{ color, fontFamily: fonts.bodyStrong, fontSize: 11 }}>{tab?.title}</Text>;
        },
      })}>
        <Tab.Screen name="AdminToday" component={AdminTodayScreen} />
        <Tab.Screen name="AdminAttendance" component={AdminAttendanceScreen} />
        <Tab.Screen name="AdminMessages" component={AdminMessagesScreen} />
        <Tab.Screen name="AdminEvents" component={AdminEventsScreen} />
        <Tab.Screen name="AdminMore" component={AdminMoreScreen} />
      </Tab.Navigator>
    );
  }

  if (role === 'EDUCATOR') {
    return (
      <Tab.Navigator screenOptions={({ route }) => ({
        ...commonOptions,
        tabBarIcon: ({ color, size }) => {
          const tab = educatorTabs.find((entry) => entry.name === route.name);
          const Icon = tab?.icon;
          return Icon ? <Icon color={color} size={size} /> : null;
        },
        tabBarLabel: ({ color }) => {
          const tab = educatorTabs.find((entry) => entry.name === route.name);
          return <Text style={{ color, fontFamily: fonts.bodyStrong, fontSize: 11 }}>{tab?.title}</Text>;
        },
      })}>
        <Tab.Screen name="EducatorHome" component={EducatorHomeScreen} />
        <Tab.Screen name="EducatorAttendance" component={EducatorAttendanceScreen} />
        <Tab.Screen name="EducatorCare" component={EducatorCareScreen} />
        <Tab.Screen name="EducatorMessages" component={EducatorMessagesScreen} />
        <Tab.Screen name="EducatorSchedule" component={EducatorScheduleScreen} />
      </Tab.Navigator>
    );
  }

  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      ...commonOptions,
      tabBarIcon: ({ color, size }) => {
        const tab = parentTabs.find((entry) => entry.name === route.name);
        const Icon = tab?.icon;
        return Icon ? <Icon color={color} size={size} /> : null;
      },
      tabBarLabel: ({ color }) => {
        const tab = parentTabs.find((entry) => entry.name === route.name);
        return <Text style={{ color, fontFamily: fonts.bodyStrong, fontSize: 11 }}>{tab?.title}</Text>;
      },
    })}>
      <Tab.Screen name="ParentHome" component={ParentHomeScreen} />
      <Tab.Screen name="ParentChild" component={ParentChildScreen} />
      <Tab.Screen name="ParentMessages" component={ParentMessagesScreen} />
      <Tab.Screen name="ParentBilling" component={ParentBillingScreen} />
      <Tab.Screen name="ParentEvents" component={ParentEventsScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { isBootstrapping, session } = useAuth();

  if (isBootstrapping) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <RootStack.Screen name="Login" component={LoginScreen} />
        ) : session.user.must_reset_password ? (
          <RootStack.Screen name="ForceReset" component={ForceResetPasswordScreen} />
        ) : (
          <>
            <RootStack.Screen name="RoleTabs" component={RoleTabs} />
            <RootStack.Screen name="Settings" component={SettingsScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
