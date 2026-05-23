import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { createInvite, getMyRoom, joinRoom } from '../services/api';

export default function SetupScreen() {
  const { theme } = useTheme();
  const { logout, updateUser } = useContext(AuthContext);

  const [isCheckingRoom, setIsCheckingRoom] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorText, setErrorText] = useState('');

  const [httpsLink, setHttpsLink] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);

  const [copiedVisible, setCopiedVisible] = useState(false);

  const url = Linking.useURL();
  const hasProcessedLinkRef = useRef(false);
  const countdownTimerRef = useRef(null);
  const copiedTimerRef = useRef(null);

  const remaining = useMemo(() => {
    if (!expiresAt) return null;
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (!Number.isFinite(diffMs) || diffMs <= 0) return { hours: 0, minutes: 0 };
    const totalMinutes = Math.floor(diffMs / (60 * 1000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { hours, minutes };
  }, [expiresAt]);

  const extractTokenFromUrl = (u) => {
    if (!u || typeof u !== 'string') return null;

    const matchDeep = u.match(/^twospace:\/\/join\/([^/?#]+)/i);
    if (matchDeep && matchDeep[1]) return matchDeep[1];

    const matchHttps = u.match(/^https?:\/\/twospace\.app\/join\/([^/?#]+)/i);
    if (matchHttps && matchHttps[1]) return matchHttps[1];

    return null;
  };

  useEffect(() => {
    let isMounted = true;

    const check = async () => {
      setIsCheckingRoom(true);
      try {
        const res = await getMyRoom();
        if (!isMounted) return;
        if (res && res.room && res.room._id) {
          updateUser({ roomId: res.room._id });
        }
      } catch (err) {
        // NO_ROOM is normal; ignore
      } finally {
        if (isMounted) setIsCheckingRoom(false);
      }
    };

    check();

    return () => {
      isMounted = false;
    };
  }, [updateUser]);

  useEffect(() => {
    if (!expiresAt) return;

    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      // triggers recompute via state update
      setExpiresAt((prev) => prev);
    }, 60 * 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    };
  }, [expiresAt]);

  useEffect(() => {
    const token = extractTokenFromUrl(url);
    if (!token) return;
    if (hasProcessedLinkRef.current) return;
    hasProcessedLinkRef.current = true;

    const run = async () => {
      try {
        setErrorText('');
        const res = await joinRoom(token);
        if (res && res.room && res.room._id) {
          updateUser({ roomId: res.room._id });
        }
      } catch (err) {
        const msg =
          (err && typeof err.message === 'string' && err.message) ||
          'Something went wrong. Please try again.';
        setErrorText(msg);
      }
    };

    run();
  }, [url, updateUser]);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const onGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setErrorText('');

    try {
      const res = await createInvite();
      setHttpsLink(res.inviteLinkHttps || '');
      setDeepLink(res.inviteLinkDeep || '');
      setExpiresAt(res.expiresAt || null);
    } catch (err) {
      const code = err && typeof err.error === 'string' ? err.error : null;
      if (code === 'ALREADY_CONNECTED') {
        try {
          const r = await getMyRoom();
          if (r && r.room && r.room._id) updateUser({ roomId: r.room._id });
        } catch (e) {
          // ignore
        }
      } else if (code === 'INVITE_EXISTS') {
        setExpiresAt(err.expiresAt || null);
        setErrorText('An active invite already exists. Check if you already shared a link.');
      } else {
        const msg =
          (err && typeof err.message === 'string' && err.message) ||
          'Something went wrong. Please try again.';
        setErrorText(msg);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const onCopy = async () => {
    if (!httpsLink) return;
    await Clipboard.setStringAsync(httpsLink);
    setCopiedVisible(true);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopiedVisible(false), 2000);
  };

  const onShare = async () => {
    if (!httpsLink) return;
    await Share.share({
      message: `Join my TwoSpace 🔒\n${httpsLink}\n\nAlready have the app? ${deepLink}`,
    });
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.header }]}>
      <KeyboardAvoidingView
        style={[styles.screen, { backgroundColor: theme.header }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <View style={[styles.container, { backgroundColor: theme.header }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.headerText }]}>TwoSpace</Text>
          <Text style={[styles.subtitle, { color: theme.textInverse }]}>Connect with someone special</Text>
        </View>

        <View style={[styles.contentCard, { backgroundColor: theme.bgPrimary }]}>
          <View style={[styles.card, { backgroundColor: theme.bgSecondary }]}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Create your invite link</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              Generate a private link and share it with one person. Once they join, your space is sealed.
            </Text>

            {httpsLink ? (
              <>
                <View style={styles.linkRow}>
                  <View style={[styles.linkBox, { backgroundColor: theme.accentLight }]}>
                    <Text style={[styles.linkText, { color: theme.accent }]} numberOfLines={2}>
                      {httpsLink}
                    </Text>
                  </View>
                  <Pressable onPress={onCopy} style={[styles.outlineButton, { borderColor: theme.accent, backgroundColor: theme.bgPrimary }]}>
                    <Text style={[styles.outlineButtonText, { color: theme.accent }]}>Copy Link</Text>
                  </Pressable>
                </View>

                {copiedVisible ? <Text style={[styles.copied, { color: theme.accent }]}>Copied!</Text> : null}

                <Pressable onPress={onShare} style={[styles.outlineButton, styles.shareButton, { borderColor: theme.accent, backgroundColor: theme.bgPrimary }]}>
                  <Text style={[styles.outlineButtonText, { color: theme.accent }]}>Share Link</Text>
                </Pressable>

                {remaining ? (
                  <Text style={[styles.expiry, { color: theme.textSecondary }]}>
                    This link expires in {remaining.hours} hours {remaining.minutes} minutes
                  </Text>
                ) : null}

                <Text style={[styles.note, { color: theme.textSecondary }]}>Or share this deep link for app users:</Text>
                <View style={[styles.deepLinkBox, { backgroundColor: theme.accentLight }]}>
                  <Text style={[styles.deepLinkText, { color: theme.accent }]} numberOfLines={2}>
                    {deepLink}
                  </Text>
                </View>
              </>
            ) : (
              <Pressable
                onPress={onGenerate}
                disabled={isGenerating || isCheckingRoom}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.accent },
                  (isGenerating || isCheckingRoom) && styles.primaryButtonDisabled,
                  pressed && !(isGenerating || isCheckingRoom) ? styles.primaryButtonPressed : null,
                ]}
              >
                {isGenerating || isCheckingRoom ? (
                  <ActivityIndicator color={theme.accentText} />
                ) : (
                  <Text style={[styles.primaryButtonText, { color: theme.accentText }]}>Generate Link</Text>
                )}
              </Pressable>
            )}

            {errorText ? <Text style={[styles.error, { color: theme.error }]}>{errorText}</Text> : null}
          </View>

          <Pressable onPress={logout} style={styles.logout}>
            <Text style={[styles.logoutTextInner, { color: theme.textSecondary }]}>Log Out</Text>
          </Pressable>
        </View>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#4F46B8',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    justifyContent: 'space-between',
  },
  header: {
    paddingTop: 8,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  contentCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  cardDesc: {
    marginTop: 10,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 18,
    width: '100%',
    backgroundColor: '#4F46B8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  linkRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  linkBox: {
    flex: 1,
    backgroundColor: '#F0EFFC',
    borderRadius: 12,
    padding: 10,
  },
  linkText: {
    fontSize: 13,
    color: '#4F46B8',
    fontWeight: '700',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#4F46B8',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    color: '#4F46B8',
    fontWeight: '800',
    fontSize: 13,
  },
  shareButton: {
    marginTop: 12,
    width: '100%',
  },
  copied: {
    marginTop: 8,
    textAlign: 'center',
    color: '#4F46B8',
    fontWeight: '700',
  },
  expiry: {
    marginTop: 10,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  note: {
    marginTop: 14,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  deepLinkBox: {
    marginTop: 8,
    backgroundColor: '#F0EFFC',
    borderRadius: 12,
    padding: 10,
  },
  deepLinkText: {
    fontSize: 13,
    color: '#4F46B8',
    fontWeight: '700',
  },
  error: {
    marginTop: 12,
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
  },
  logout: {
    paddingTop: 18,
    paddingBottom: 6,
  },
  logoutText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  logoutTextInner: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
  },
});
