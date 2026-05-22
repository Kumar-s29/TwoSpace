import React, { useContext, useState, useEffect } from 'react';
import { ActivityIndicator, Text, View, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Notifications from 'expo-notifications';
import { saveExpoPushToken } from './services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

import { AuthContext, AuthProvider } from './context/AuthContext';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import SplashScreen from './screens/SplashScreen';
import SetupScreen from './screens/SetupScreen';
import TimelineScreen from './screens/TimelineScreen';
import NewPostScreen from './screens/NewPostScreen';
import WishScreen from './screens/WishScreen';
import WishesScreen from './screens/WishesScreen';
import SettingsScreen from './screens/SettingsScreen';
import CapsuleScreen from './screens/CapsuleScreen';
import CapsuleDetailScreen from './screens/CapsuleDetailScreen';
import JournalScreen from './screens/JournalScreen';
import MoreScreen from './screens/MoreScreen';
import BucketListScreen from './screens/BucketListScreen';
import MilestonesScreen from './screens/MilestonesScreen';

const AuthStack = createNativeStackNavigator();
const SetupStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStackNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function SetupStackNavigator() {
  return (
    <SetupStack.Navigator screenOptions={{ headerShown: false }}>
      <SetupStack.Screen name="Setup" component={SetupScreen} />
    </SetupStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0.5,
          borderTopColor: '#E5E7EB',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarActiveTintColor: '#4F46B8',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Timeline"
        component={TimelineScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Wishes"
        component={WishesScreen}
        options={{
          tabBarLabel: 'Wishes',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>⏰</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Journal"
        component={JournalScreen}
        options={{
          tabBarLabel: 'Journal',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>📖</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Capsules"
        component={CapsuleScreen}
        options={{
          tabBarLabel: 'Capsules',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>📦</Text>
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>📋</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Main" component={MainTabs} />
      <RootStack.Screen
        name="NewPost"
        component={NewPostScreen}
        options={{ presentation: 'modal' }}
      />
      <RootStack.Screen
        name="Wish"
        component={WishScreen}
        options={{ presentation: 'modal' }}
      />
      <RootStack.Screen
        name="CapsuleDetail"
        component={CapsuleDetailScreen}
      />
      <RootStack.Screen
        name="BucketList"
        component={BucketListScreen}
      />
      <RootStack.Screen
        name="Milestones"
        component={MilestonesScreen}
      />
      <RootStack.Screen
        name="Settings"
        component={SettingsScreen}
      />
    </RootStack.Navigator>
  );
}

function RootNavigator() {
  const { token, user, isLoading } = useContext(AuthContext);

  useEffect(() => {
    async function registerForPushNotifications() {
      if (!token) return;
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.log('Failed to get push token for push notifications!');
          return;
        }

        const pushToken = (await Notifications.getExpoPushTokenAsync({
          projectId: 'c67db40f-a887-403f-a51b-775b2099343e',
        })).data;
        console.log('Expo Push Token received:', pushToken);

        await saveExpoPushToken(pushToken);
        console.log('Push token successfully registered with backend');
      } catch (error) {
        console.warn('Error during push token registration:', error.message || error);
      }

      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        } catch (error) {
          console.warn('Error setting Android notification channel:', error);
        }
      }
    }

    registerForPushNotifications();
  }, [token]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#4F46B8' }}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  if (token === null) return <AuthStackNavigator />;
  if (token && user && user.roomId === null) return <SetupStackNavigator />;
  if (token && user && user.roomId !== null) return <AppNavigator />;

  return <AuthStackNavigator />;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      {showSplash ? (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      ) : null}
    </AuthProvider>
  );
}
