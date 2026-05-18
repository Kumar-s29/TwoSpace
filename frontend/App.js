import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthContext, AuthProvider } from './context/AuthContext';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import SetupScreen from './screens/SetupScreen';
import TimelineScreen from './screens/TimelineScreen';
import NewPostScreen from './screens/NewPostScreen';
import WishScreen from './screens/WishScreen';
import SettingsScreen from './screens/SettingsScreen';

const AuthStack = createNativeStackNavigator();
const SetupStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();

function AuthStackNavigator() {
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function SetupStackNavigator() {
  return (
    <SetupStack.Navigator>
      <SetupStack.Screen name="Setup" component={SetupScreen} />
    </SetupStack.Navigator>
  );
}

function AppStackNavigator() {
  return (
    <AppStack.Navigator>
      <AppStack.Screen name="Timeline" component={TimelineScreen} />
      <AppStack.Screen name="Settings" component={SettingsScreen} />
      <AppStack.Screen
        name="NewPost"
        component={NewPostScreen}
        options={{ presentation: 'modal' }}
      />
      <AppStack.Screen
        name="Wish"
        component={WishScreen}
        options={{ presentation: 'modal' }}
      />
    </AppStack.Navigator>
  );
}

function RootNavigator() {
  const { token, user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (token === null) return <AuthStackNavigator />;
  if (token && user && user.roomId === null) return <SetupStackNavigator />;
  if (token && user && user.roomId !== null) return <AppStackNavigator />;

  return <AuthStackNavigator />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

