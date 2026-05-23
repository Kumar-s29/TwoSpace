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

import { register as registerApi } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISPLAYNAME_REGEX = /^[A-Za-z0-9 -]+$/;

export default function RegisterScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { login } = useContext(AuthContext);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [touched, setTouched] = useState({
    displayName: false,
    email: false,
    password: false,
  });

  const [fieldErrors, setFieldErrors] = useState({
    displayName: '',
    email: '',
    password: '',
  });

  const [genericError, setGenericError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateDisplayName = (value) => {
    const v = String(value || '').trim();
    if (
      v.length < 2 ||
      v.length > 30 ||
      !DISPLAYNAME_REGEX.test(v)
    ) {
      return 'Name must be 2-30 characters (letters, numbers, spaces, hyphens only).';
    }
    return '';
  };

  const validateEmail = (value) => {
    const v = String(value || '').trim();
    if (!EMAIL_REGEX.test(v)) {
      return 'Please enter a valid email address.';
    }
    return '';
  };

  const validatePassword = (value) => {
    const v = String(value || '');
    if (v.length < 8 || !/[0-9]/.test(v)) {
      return 'Password must be at least 8 characters and include a number.';
    }
    return '';
  };

  const canSubmit = useMemo(() => {
    if (isSubmitting) return false;
    return (
      displayName.trim().length > 0 &&
      email.trim().length > 0 &&
      password.length > 0
    );
  }, [displayName, email, password, isSubmitting]);

  const onBlurDisplayName = () => {
    setTouched((prev) => ({ ...prev, displayName: true }));
    const err = validateDisplayName(displayName);
    setFieldErrors((prev) => ({ ...prev, displayName: err }));
  };

  const onBlurEmail = () => {
    setTouched((prev) => ({ ...prev, email: true }));
    const err = validateEmail(email);
    setFieldErrors((prev) => ({ ...prev, email: err }));
  };

  const onBlurPassword = () => {
    setTouched((prev) => ({ ...prev, password: true }));
    const err = validatePassword(password);
    setFieldErrors((prev) => ({ ...prev, password: err }));
  };

  const validateAll = () => {
    const displayNameErr = validateDisplayName(displayName);
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);

    setFieldErrors({
      displayName: displayNameErr,
      email: emailErr,
      password: passwordErr,
    });

    return !displayNameErr && !emailErr && !passwordErr;
  };

  const onSubmit = async () => {
    if (isSubmitting) return;

    setGenericError('');
    setTouched({ displayName: true, email: true, password: true });

    const ok = validateAll();
    if (!ok) return;

    setIsSubmitting(true);

    try {
      const res = await registerApi({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
      });
      await login(res.token, res.user);
    } catch (err) {
      const code = err && typeof err.error === 'string' ? err.error : null;
      if (code === 'EMAIL_EXISTS') {
        setFieldErrors((prev) => ({
          ...prev,
          email: 'This email is already registered.',
        }));
      } else if (code === 'VALIDATION_ERROR') {
        setGenericError('Please check your details and try again.');
      } else {
        setGenericError('Something went wrong. Please try again.');
      }
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
          <Text style={styles.title}>
            <Text style={{ color: theme.accent }}>Two</Text>
            <Text style={{ color: theme.pink }}>Space</Text>
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Create your account</Text>

          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            onBlur={onBlurDisplayName}
            placeholder="Display name"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="words"
            maxLength={30}
            autoCorrect={false}
            style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary }]}
            editable={!isSubmitting}
          />
          {touched.displayName && fieldErrors.displayName ? (
            <Text style={[styles.fieldError, { color: theme.error }]}>{fieldErrors.displayName}</Text>
          ) : null}

          <TextInput
            value={email}
            onChangeText={setEmail}
            onBlur={onBlurEmail}
            placeholder="Email"
            placeholderTextColor={theme.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary }]}
            editable={!isSubmitting}
          />
          {touched.email && fieldErrors.email ? (
            <Text style={[styles.fieldError, { color: theme.error }]}>{fieldErrors.email}</Text>
          ) : null}

          <TextInput
            value={password}
            onChangeText={setPassword}
            onBlur={onBlurPassword}
            placeholder="Password"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary }]}
            editable={!isSubmitting}
          />
          {touched.password && fieldErrors.password ? (
            <Text style={[styles.fieldError, { color: theme.error }]}>{fieldErrors.password}</Text>
          ) : null}

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
              <Text style={[styles.buttonText, { color: theme.accentText }]}>Create Account</Text>
            )}
          </Pressable>

          {genericError ? <Text style={[styles.genericError, { color: theme.error }]}>{genericError}</Text> : null}
        </View>

        <Pressable
          onPress={() => navigation.navigate('Login')}
          style={styles.footer}
          disabled={isSubmitting}
        >
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Already have an account? <Text style={[styles.footerLink, { color: theme.accent }]}>Log In</Text>
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
    marginBottom: 2,
  },
  fieldError: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
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
  genericError: {
    marginTop: 10,
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
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
