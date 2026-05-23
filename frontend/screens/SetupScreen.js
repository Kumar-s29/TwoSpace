import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
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

  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'join'
  const [inviteInput, setInviteInput] = useState('');
  const [isCheckingRoom, setIsCheckingRoom] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [errorText, setErrorText] = useState('');

  const [httpsLink, setHttpsLink] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);

  const [copiedVisible, setCopiedVisible] = useState(false);
  const [tick, setTick] = useState(0);

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
  }, [expiresAt, tick]);

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
      setTick((t) => t + 1);
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

  const onJoinManual = async () => {
    if (isJoining || !inviteInput.trim()) return;
    setIsJoining(true);
    setErrorText('');
    try {
      const token = extractTokenFromUrl(inviteInput.trim()) || inviteInput.trim();
      const res = await joinRoom(token);
      if (res && res.room && res.room._id) {
        updateUser({ roomId: res.room._id });
      }
    } catch (err) {
      const msg =
        (err && typeof err.message === 'string' && err.message) ||
        'Failed to join the space. Please check the link or code.';
      setErrorText(msg);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.header }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            <Text style={{ color: theme.headerText }}>Two</Text>
            <Text style={{ color: '#F9A8D4' }}>Space</Text>
          </Text>
          <Text style={[styles.subtitle, { color: theme.textInverse }]}>Connect with someone special</Text>
        </View>

        <View style={[styles.contentCard, { backgroundColor: theme.bgPrimary }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
              {/* Tab Switcher */}
              <View style={[styles.tabBar, { backgroundColor: theme.bgInput }]}>
                <Pressable
                  onPress={() => {
                    setActiveTab('create');
                    setErrorText('');
                  }}
                  style={[
                    styles.tabButton,
                    activeTab === 'create' && [styles.tabButtonActive, { backgroundColor: theme.bgPrimary, shadowColor: theme.shadow }]
                  ]}
                >
                  <Text style={[
                    styles.tabButtonText,
                    { color: activeTab === 'create' ? theme.textPrimary : theme.textSecondary }
                  ]}>
                    Invite Partner
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setActiveTab('join');
                    setErrorText('');
                  }}
                  style={[
                    styles.tabButton,
                    activeTab === 'join' && [styles.tabButtonActive, { backgroundColor: theme.bgPrimary, shadowColor: theme.shadow }]
                  ]}
                >
                  <Text style={[
                    styles.tabButtonText,
                    { color: activeTab === 'join' ? theme.textPrimary : theme.textSecondary }
                  ]}>
                    Join Space
                  </Text>
                </Pressable>
              </View>

              {activeTab === 'create' ? (
                /* Tab 1: Create Invite */
                <View style={styles.tabContent}>
                  <View style={[styles.emojiCircle, { backgroundColor: theme.accentLight }]}>
                    <Text style={styles.emojiText}>{httpsLink ? '🎉' : '💌'}</Text>
                  </View>
                  
                  <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                    {httpsLink ? 'Your Invite is Ready!' : 'Create your invite link'}
                  </Text>
                  <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
                    {httpsLink 
                      ? 'Share this link with your partner. Once they open it on their device, your space will be sealed.' 
                      : 'Generate a private link and share it with one person. Once they join, your space is sealed.'
                    }
                  </Text>

                  {httpsLink ? (
                    <View style={styles.generatedContainer}>
                      <View style={[
                        styles.linkRow, 
                        { 
                          backgroundColor: copiedVisible ? theme.successLight : theme.bgInput,
                          borderColor: copiedVisible ? theme.success : theme.border
                        }
                      ]}>
                        <Text style={[
                          styles.linkText, 
                          { color: copiedVisible ? theme.successText : theme.textPrimary }
                        ]} numberOfLines={1}>
                          {httpsLink}
                        </Text>
                        <Pressable 
                          onPress={onCopy} 
                          style={[
                            styles.copyButton, 
                            { backgroundColor: copiedVisible ? theme.success : theme.accent }
                          ]}
                        >
                          <Text style={[styles.copyButtonText, { color: theme.accentText }]}>
                            {copiedVisible ? 'Copied' : 'Copy'}
                          </Text>
                        </Pressable>
                      </View>

                      <Pressable 
                        onPress={onShare} 
                        style={({ pressed }) => [
                          styles.primaryButton,
                          { backgroundColor: theme.accent, marginTop: 16 },
                          pressed && styles.primaryButtonPressed
                        ]}
                      >
                        <Text style={[styles.primaryButtonText, { color: theme.accentText }]}>Share Link</Text>
                      </Pressable>

                      {remaining ? (
                        <Text style={[styles.expiry, { color: theme.textSecondary }]}>
                          🕒 Expires in {remaining.hours}h {remaining.minutes}m
                        </Text>
                      ) : null}

                      {/* Collapsible/Clean Deep Link Box */}
                      <View style={[styles.deepLinkSection, { borderTopColor: theme.border }]}>
                        <Text style={[styles.deepLinkLabel, { color: theme.textSecondary }]}>
                          Trouble with the link? Tap below to copy raw deep link:
                        </Text>
                        <Pressable 
                          onPress={async () => {
                            await Clipboard.setStringAsync(deepLink);
                            setCopiedVisible(true);
                            if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
                            copiedTimerRef.current = setTimeout(() => setCopiedVisible(false), 2000);
                          }}
                          style={[styles.deepLinkBox, { backgroundColor: theme.bgInput, borderColor: theme.border }]}
                        >
                          <Text style={[styles.deepLinkText, { color: theme.textMuted }]} numberOfLines={1}>
                            {deepLink}
                          </Text>
                          <Text style={[styles.deepLinkCopyText, { color: theme.accent }]}>Copy</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      onPress={onGenerate}
                      disabled={isGenerating || isCheckingRoom}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        { backgroundColor: theme.accent, marginTop: 24 },
                        (isGenerating || isCheckingRoom) && styles.primaryButtonDisabled,
                        pressed && !(isGenerating || isCheckingRoom) && styles.primaryButtonPressed,
                      ]}
                    >
                      {isGenerating || isCheckingRoom ? (
                        <ActivityIndicator color={theme.accentText} />
                      ) : (
                        <Text style={[styles.primaryButtonText, { color: theme.accentText }]}>Generate Link</Text>
                      )}
                    </Pressable>
                  )}
                </View>
              ) : (
                /* Tab 2: Join Space */
                <View style={styles.tabContent}>
                  <View style={[styles.emojiCircle, { backgroundColor: theme.accentLight }]}>
                    <Text style={styles.emojiText}>🔑</Text>
                  </View>

                  <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                    Join Your Partner&apos;s Space
                  </Text>
                  <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
                    Enter the invite link or code shared by your partner to connect your devices.
                  </Text>

                  <TextInput
                    value={inviteInput}
                    onChangeText={setInviteInput}
                    placeholder="Paste invite link or code..."
                    placeholderTextColor={theme.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[
                      styles.input,
                      { 
                        backgroundColor: theme.bgInput, 
                        borderColor: theme.border, 
                        color: theme.textPrimary 
                      }
                    ]}
                    editable={!isJoining}
                  />

                  <Pressable
                    onPress={onJoinManual}
                    disabled={isJoining || !inviteInput.trim()}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      { backgroundColor: theme.accent, marginTop: 20 },
                      (isJoining || !inviteInput.trim()) && styles.primaryButtonDisabled,
                      pressed && !isJoining && inviteInput.trim() && styles.primaryButtonPressed,
                    ]}
                  >
                    {isJoining ? (
                      <ActivityIndicator color={theme.accentText} />
                    ) : (
                      <Text style={[styles.primaryButtonText, { color: theme.accentText }]}>Join Space</Text>
                    )}
                  </Pressable>
                </View>
              )}

              {errorText ? (
                <View style={[styles.errorContainer, { backgroundColor: theme.errorLight, borderColor: theme.error }]}>
                  <Text style={[styles.errorText, { color: theme.error }]}>{errorText}</Text>
                </View>
              ) : null}
            </View>

            <Pressable onPress={logout} style={[styles.logoutButton, { borderColor: theme.border }]}>
              <Text style={[styles.logoutButtonText, { color: theme.textSecondary }]}>Log Out of Account</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 12 : 24,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.9,
  },
  contentCard: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 10,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
    justifyContent: 'space-between',
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    width: '100%',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  tabContent: {
    alignItems: 'center',
    width: '100%',
  },
  emojiCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emojiText: {
    fontSize: 30,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  generatedContainer: {
    width: '100%',
    alignItems: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    marginTop: 20,
    width: '100%',
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 10,
  },
  copyButton: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  primaryButton: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  expiry: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  deepLinkSection: {
    width: '100%',
    borderTopWidth: 1,
    marginTop: 24,
    paddingTop: 16,
  },
  deepLinkLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  deepLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 12,
    paddingVertical: 10,
    width: '100%',
  },
  deepLinkText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  deepLinkCopyText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginTop: 20,
    fontWeight: '500',
  },
  errorContainer: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  logoutButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    backgroundColor: 'transparent',
    width: '100%',
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
