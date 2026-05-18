import React, { createContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMe } from '../services/api';

export const AuthContext = createContext({
  user: null,
  token: null,
  isLoading: true,
  login: async (token, user) => {},
  logout: async () => {},
  updateUser: (fields) => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('twospace_token');

        if (!storedToken) {
          if (!isMounted) return;
          setUser(null);
          setToken(null);
          return;
        }

        try {
          const me = await getMe();
          if (!isMounted) return;
          setToken(storedToken);
          setUser(me.user);
        } catch (err) {
          await AsyncStorage.removeItem('twospace_token');
          if (!isMounted) return;
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (newToken, newUser) => {
    await AsyncStorage.setItem('twospace_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('twospace_token');
    setUser(null);
    setToken(null);
  };

  const updateUser = (fields) => {
    setUser((prev) => (prev ? { ...prev, ...fields } : prev));
  };

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      login,
      logout,
      updateUser,
    }),
    [user, token, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

