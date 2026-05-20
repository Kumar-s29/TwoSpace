import React, { useContext, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

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
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>⚙️</Text>
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
    </RootStack.Navigator>
  );
}

function RootNavigator() {
  const { token, user, isLoading } = useContext(AuthContext);

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
