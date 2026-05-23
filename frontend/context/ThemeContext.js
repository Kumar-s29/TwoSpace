import React, { 
  createContext, 
  useContext,
  useEffect, 
  useState 
} from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from 
  '@react-native-async-storage/async-storage';
import { light, dark } from '../constants/themes';

export const ThemeContext = createContext({
  theme: light,
  mode: 'light',
  preference: 'system',
  setPreference: (pref) => {},
});

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = 
    useState('system');
  const [systemScheme, setSystemScheme] = 
    useState(
      Appearance.getColorScheme() || 'light'
    );

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem('twospace_theme')
      .then(saved => {
        if (saved === 'light' || 
            saved === 'dark' || 
            saved === 'system') {
          setPreferenceState(saved);
        }
      })
      .catch(() => {});
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const sub = Appearance.addChangeListener(
      ({ colorScheme }) => {
        setSystemScheme(colorScheme || 'light');
      }
    );
    return () => sub.remove();
  }, []);

  const setPreference = async (pref) => {
    setPreferenceState(pref);
    try {
      await AsyncStorage.setItem(
        'twospace_theme', pref
      );
    } catch (err) {}
  };

  // Resolve actual mode
  const mode = preference === 'system'
    ? systemScheme
    : preference;

  const theme = mode === 'dark' ? dark : light;

  return (
    <ThemeContext.Provider value={{ 
      theme, mode, preference, setPreference 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => 
  useContext(ThemeContext);
