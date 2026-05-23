import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { archiveRoom, closeRoom, getMyRoom } from '../services/api';

export default function SettingsScreen({ navigation }) {
  const { user, logout, updateUser } = useContext(AuthContext);
  const { theme, preference, setPreference } = useTheme();

  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [roomError, setRoomError] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [connectedSince, setConnectedSince] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingSpace, setIsDeletingSpace] = useState(false);

  const loadRoom = async () => {
    setIsLoadingRoom(true);
    setRoomError('');
    try {
      const res = await getMyRoom();
      const room = res?.room;
      setPartnerName(room?.partner?.displayName || '');
      setConnectedSince(
        room?.createdAt ? dayjs(room.createdAt).format('MMMM D, YYYY') : ''
      );
    } catch (err) {
      setRoomError('Could not load space info.');
    } finally {
      setIsLoadingRoom(false);
    }
  };

  useEffect(() => {
    loadRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profileName = useMemo(() => user?.displayName || '', [user]);
  const profileEmail = useMemo(() => user?.email || '', [user]);

  const onArchive = () => {
    Alert.alert(
      'Archive this space?',
      'Both of you will lose access but all your memories are preserved safely.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await archiveRoom();
              updateUser({ roomId: null });
            } catch (err) {
              Alert.alert('Could not archive space.');
            }
          },
        },
      ]
    );
  };

  const onDeletePermanent = () => {
    Alert.alert(
      'Are you absolutely sure?',
      'This will permanently delete your space and ALL memories. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Alert.prompt(
                'Type DELETE MY SPACE to confirm',
                undefined,
                async (text) => {
                  if (text !== 'DELETE MY SPACE') return;
                  try {
                    await closeRoom({ confirmText: 'DELETE MY SPACE' });
                    updateUser({ roomId: null });
                  } catch (err) {
                    Alert.alert('Could not delete space.');
                  }
                }
              );
            } else {
              setShowDeleteModal(true);
            }
          },
        },
      ]
    );
  };

  const onLogout = () => {
    Alert.alert('Log out?', "You'll need to log in again.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.header }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={{
          flex: 1,
          backgroundColor: theme.bgPrimary,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Your Profile</Text>
          <Text style={[styles.profileName, { color: theme.textPrimary }]}>{profileName}</Text>
          <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{profileEmail}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Your Space</Text>

          {isLoadingRoom ? (
            <View style={styles.roomLoading}>
              <ActivityIndicator color={theme.accent} />
            </View>
          ) : roomError ? (
            <View style={styles.roomErrorBox}>
              <Text style={[styles.roomErrorText, { color: theme.textSecondary }]}>{roomError}</Text>
              <Pressable onPress={loadRoom} style={[styles.retryButton, { borderColor: theme.accent }]}>
                <Text style={[styles.retryText, { color: theme.accent }]}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.partnerRow}>
                <Text style={[styles.partnerName, { color: theme.textPrimary }]}>{partnerName}</Text>
              </View>
              <Text style={[styles.connectedSince, { color: theme.textSecondary }]}>Connected since {connectedSince}</Text>
              <View style={styles.statusRow}>
                <Text style={[styles.greenDot, { color: theme.success }]}>●</Text>
                <Text style={[styles.statusText, { color: theme.textPrimary }]}>Space is active</Text>
              </View>
            </>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: theme.bgPrimary }]}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
            Appearance
          </Text>

          {['light', 'dark', 'system'].map(pref => (
            <Pressable
              key={pref}
              onPress={() => setPreference(pref)}
              style={[
                styles.themeOption,
                { borderColor: theme.border },
                preference === pref && {
                  borderColor: theme.accent,
                  backgroundColor: theme.accentLight,
                }
              ]}
            >
              <Text style={styles.themeOptionEmoji}>
                {pref === 'light' ? '☀️' 
                  : pref === 'dark' ? '🌙' 
                  : '⚙️'}
              </Text>
              <Text style={[
                styles.themeOptionText,
                { color: theme.textPrimary },
                preference === pref && { 
                  color: theme.accent,
                  fontWeight: '800'
                }
              ]}>
                {pref === 'light' ? 'Light' 
                  : pref === 'dark' ? 'Dark' 
                  : 'System default'}
              </Text>
              {preference === pref ? (
                <Text style={[
                  styles.themeCheck,
                  { color: theme.accent }
                ]}>✓</Text>
              ) : null}
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Danger Zone</Text>

          <Pressable onPress={onArchive} style={[styles.dangerBtn, styles.archiveBtn, { backgroundColor: theme.bgPrimary }]}>
            <Text style={[styles.dangerText, styles.archiveText]}>Archive Space</Text>
          </Pressable>

          <Pressable onPress={onDeletePermanent} style={[styles.dangerBtn, styles.deleteBtn, { backgroundColor: theme.bgPrimary }]}>
            <Text style={[styles.dangerText, styles.deleteText]}>Delete Space Permanently</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Account</Text>
          <Pressable onPress={onLogout}>
            <Text style={[styles.logoutText, { color: theme.textSecondary }]}>Log Out</Text>
          </Pressable>
        </View>
      </ScrollView>

      {Platform.OS === 'android' ? (
        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (isDeletingSpace) return;
            setShowDeleteModal(false);
            setDeleteConfirmText('');
          }}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: theme.bgCard }]}>
              <Text style={styles.modalTitle}>Delete Space Permanently</Text>
              <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
                Type DELETE MY SPACE below to confirm. This cannot be undone.
              </Text>

              <TextInput
                placeholder="Type DELETE MY SPACE"
                placeholderTextColor={theme.textMuted}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                autoCapitalize="characters"
                editable={!isDeletingSpace}
                style={[styles.modalInput, { borderColor: theme.border, color: theme.textPrimary }]}
              />

              <View style={styles.modalButtons}>
                <Pressable
                  onPress={() => {
                    if (isDeletingSpace) return;
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                  }}
                  style={[styles.modalBtn, styles.modalCancelBtn, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                >
                  <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </Pressable>

                <Pressable
                  disabled={deleteConfirmText !== 'DELETE MY SPACE' || isDeletingSpace}
                  onPress={async () => {
                    if (deleteConfirmText !== 'DELETE MY SPACE') return;
                    if (isDeletingSpace) return;
                    setIsDeletingSpace(true);
                    try {
                      await closeRoom({ confirmText: 'DELETE MY SPACE' });
                      updateUser({ roomId: null });
                      setShowDeleteModal(false);
                    } catch (err) {
                      Alert.alert('Could not delete space.');
                    } finally {
                      setIsDeletingSpace(false);
                      setDeleteConfirmText('');
                    }
                  }}
                  style={[
                    styles.modalBtn,
                    styles.modalDeleteBtn,
                    (deleteConfirmText !== 'DELETE MY SPACE' || isDeletingSpace) &&
                      styles.modalDeleteBtnDisabled,
                  ]}
                >
                  {isDeletingSpace ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalDeleteText}>Delete</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#4F46B8',
  },
  header: {
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4F46B8',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  connectedSince: {
    marginTop: 6,
    fontSize: 13,
    color: '#6B7280',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  greenDot: {
    color: '#22C55E',
    fontSize: 10,
  },
  statusText: {
    color: '#111827',
    fontWeight: '700',
  },
  roomLoading: {
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  roomErrorBox: {
    paddingVertical: 6,
  },
  roomErrorText: {
    color: '#6B7280',
    marginBottom: 10,
  },
  retryButton: {
    borderWidth: 1,
    borderColor: '#4F46B8',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  retryText: {
    color: '#4F46B8',
    fontWeight: '800',
  },
  dangerBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  archiveBtn: {
    borderColor: '#F59E0B',
  },
  deleteBtn: {
    borderColor: '#DC2626',
  },
  dangerText: {
    fontWeight: '800',
    textAlign: 'center',
  },
  archiveText: {
    color: '#F59E0B',
  },
  deleteText: {
    color: '#DC2626',
  },
  logoutText: {
    color: '#6B7280',
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '900',
  },
  modalDesc: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 18,
  },
  modalInput: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    color: '#111827',
  },
  modalButtons: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalCancelText: {
    color: '#6B7280',
    fontWeight: '900',
  },
  modalDeleteBtn: {
    backgroundColor: '#DC2626',
  },
  modalDeleteBtnDisabled: {
    backgroundColor: '#FCA5A5',
  },
  modalDeleteText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  themeOptionEmoji: {
    fontSize: 18,
  },
  themeOptionText: {
    flex: 1,
    fontSize: 15,
  },
  themeCheck: {
    fontSize: 16,
    fontWeight: '800',
  },
});
