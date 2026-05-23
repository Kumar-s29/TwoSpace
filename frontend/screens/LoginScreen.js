import React, { useContext, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { login as loginApi } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { login } = useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState('');

  const canSubmit = useMemo(
    () => !isSubmitting && email.trim().length > 0 && password.length > 0,
    [email, password, isSubmitting]
  );

  const mapErrorToMessage = (err) => {
    if (err && typeof err.message === 'string' && err.message.trim().length > 0) {
      return err.message;
    }

    const code = err && typeof err.error === 'string' ? err.error : null;
    if (code === 'INVALID_CREDENTIALS') return 'Wrong email or password.';
    if (code === 'VALIDATION_ERROR') return 'Please fill in all fields.';
    return 'Something went wrong. Please try again.';
  };

  const onSubmit = async () => {
    if (isSubmitting) return;

    if (email.trim().length === 0 || password.length === 0) {
      setErrorText('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorText('');

    try {
      const res = await loginApi({ email: email.trim(), password });
      await login(res.token, res.user);
      // Navigation happens automatically via App.js stack switching
    } catch (err) {
      setErrorText(mapErrorToMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.accent }]}>TwoSpace</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Your private space</Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={theme.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary }]}
            editable={!isSubmitting}
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary }]}
            editable={!isSubmitting}
          />

          {errorText ? <Text style={[styles.error, { color: theme.error }]}>{errorText}</Text> : null}

          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.accent },
              (!canSubmit || isSubmitting) && styles.buttonDisabled,
              pressed && canSubmit && !isSubmitting ? styles.buttonPressed : null,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.accentText} />
            ) : (
              <Text style={[styles.buttonText, { color: theme.accentText }]}>Log In</Text>
            )}
          </Pressable>
        </View>

        <Pressable
          onPress={() => navigation.navigate('Register')}
          style={styles.footer}
          disabled={isSubmitting}
        >
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Don&apos;t have an account? <Text style={[styles.footerLink, { color: theme.accent }]}>Register</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#4F46B8',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 28,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  button: {
    marginTop: 10,
    width: '100%',
    backgroundColor: '#4F46B8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  error: {
    marginTop: 2,
    marginBottom: 2,
    color: '#DC2626',
    fontSize: 13,
  },
  footer: {
    paddingTop: 18,
    paddingBottom: 6,
  },
  footerText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
  },
  footerLink: {
    color: '#4F46B8',
    fontWeight: '700',
  },
});
