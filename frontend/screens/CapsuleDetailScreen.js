import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { io } from 'socket.io-client';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthContext } from '../context/AuthContext';
import { addToCapsule, confirmCapsule, getCapsule, getMyRoom } from '../services/api';
import MoodPicker from '../components/MoodPicker';

dayjs.extend(relativeTime);

export default function CapsuleDetailScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const roomId = user?.roomId || null;
  const capsuleId = route?.params?.capsuleId;

  const [capsule, setCapsule] = useState(null);
  const [posts, setPosts] = useState([]);
  const [partnerName, setPartnerName] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorText, setErrorText] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [memoryText, setMemoryText] = useState('');
  const [moodTag, setMoodTag] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const socketRef = useRef(null);
  const countdownTimerRef = useRef(null);

  const load = async () => {
    if (!capsuleId) return;
    setErrorText('');
    try {
      const [capsuleRes, roomRes] = await Promise.allSettled([
        getCapsule(capsuleId),
        getMyRoom(),
      ]);

      if (roomRes.status === 'fulfilled') {
        const p = roomRes.value?.room?.partner?.displayName || '';
        setPartnerName(p);
      }

      if (capsuleRes.status === 'fulfilled') {
        setCapsule(capsuleRes.value?.capsule || null);
        setPosts(Array.isArray(capsuleRes.value?.posts) ? capsuleRes.value.posts : []);
      } else {
        setErrorText('Could not load capsule.');
      }
    } catch (err) {
      setErrorText('Could not load capsule.');
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      await load();
      if (mounted) setIsLoading(false);
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capsuleId]);

  useEffect(() => {
    if (!roomId) return;
    const base = (process.env.EXPO_PUBLIC_API_URL || '').replace('/api', '');
    const socket = io(base, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('capsule_opened', (payload) => {
      try {
        if (!payload || payload.roomId !== roomId) return;
        if (payload.capsuleId !== capsuleId) return;
        Toast.show({ type: 'success', text1: '🎉 Your capsule just opened!' });
        load();
      } catch (e) {}
    });

    return () => {
      try {
        socket.disconnect();
      } catch (e) {}
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, capsuleId]);

  useEffect(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (capsule?.status !== 'sealed') return;
    countdownTimerRef.current = setInterval(() => {
      // tick to re-render countdown
      setCapsule((prev) => (prev ? { ...prev } : prev));
    }, 60 * 1000);
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    };
  }, [capsule?.status]);

  const isConfirmedByMe = useMemo(() => {
    const list = capsule?.confirmedBy || [];
    return Array.isArray(list) && user?._id
      ? list.some((id) => id.toString() === user._id.toString())
      : false;
  }, [capsule?.confirmedBy, user?._id]);

  const statusMeta = (status) => {
    if (status === 'collecting')
      return { bg: '#DBEAFE', fg: '#1E40AF', text: 'Adding memories' };
    if (status === 'sealed') return { bg: '#F0EFFC', fg: '#4F46B8', text: 'Sealed 🔒' };
    if (status === 'opened') return { bg: '#D1FAE5', fg: '#065F46', text: 'Opened 🎉' };
    return { bg: '#E5E7EB', fg: '#111827', text: status || 'Unknown' };
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const onConfirmSeal = () => {
    Alert.alert('Seal this capsule?', 'This will confirm sealing the capsule.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: 'destructive',
        onPress: async () => {
          try {
            await confirmCapsule(capsuleId);
            await load();
          } catch (err) {
            Alert.alert('Could not seal capsule.');
          }
        },
      },
    ]);
  };

  const openCountdownText = () => {
    const opensAt = capsule?.opensAt ? new Date(capsule.opensAt) : null;
    if (!opensAt) return '';
    const diffMs = opensAt.getTime() - Date.now();
    if (diffMs <= 0) return 'Opening soon...';
    const totalHours = Math.floor(diffMs / (60 * 60 * 1000));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return `Opens in ${days} days ${hours} hours`;
  };

  const resetAddModal = () => {
    setMemoryText('');
    setMoodTag(null);
  };

  const submitAdd = async () => {
    const trimmed = memoryText.trim();
    if (!trimmed || trimmed.length === 0) return;
    if (trimmed.length > 2000) return;
    if (isAdding) return;
    setIsAdding(true);
    try {
      await addToCapsule(capsuleId, { content: trimmed, moodTag });
      setShowAddModal(false);
      resetAddModal();
      await load();
    } catch (err) {
      Alert.alert('Could not add memory.');
    } finally {
      setIsAdding(false);
    }
  };

  const renderPost = ({ item }) => {
    const sealed = capsule?.isSealed === true;
    const isOwn =
      item?.authorId && user?._id ? item.authorId.toString() === user._id.toString() : false;
    const initial =
      typeof item?.authorName === 'string' && item.authorName.trim().length > 0
        ? item.authorName.trim()[0].toUpperCase()
        : '?';

    const content = sealed ? 'A memory is waiting...' : item?.content;
    const meta = item?.moodTag;
    const moodMeta =
      meta === 'good'
        ? { bg: '#D1FAE5', fg: '#065F46', text: '🌤 Good' }
        : meta === 'okay'
          ? { bg: '#FEF3C7', fg: '#92400E', text: '⛅ Okay' }
          : meta === 'low'
            ? { bg: '#DBEAFE', fg: '#1E40AF', text: '🌧 Low' }
            : null;

    return (
      <View style={[styles.postRow, sealed && styles.postRowSealed]}>
        <View style={[styles.initialCircle, isOwn ? styles.initialOwn : styles.initialPartner]}>
          <Text style={styles.initialText}>{initial}</Text>
        </View>
        <View style={styles.postBody}>
          <Text style={[styles.postContent, sealed && styles.postContentSealed]}>{content}</Text>
          {moodMeta ? (
            <View style={[styles.moodBadge, { backgroundColor: moodMeta.bg }]}>
              <Text style={[styles.moodText, { color: moodMeta.fg }]}>{moodMeta.text}</Text>
            </View>
          ) : null}
          <Text style={styles.postTime}>
            {item?.createdAt ? dayjs(item.createdAt).fromNow() : ''}
          </Text>
        </View>
      </View>
    );
  };

  const meta = statusMeta(capsule?.status);
  const confirmedCount = Array.isArray(capsule?.confirmedBy) ? capsule.confirmedBy.length : 0;

  const CollectingActions = () => (
    <View style={styles.actions}>
      <Pressable style={styles.primaryBtn} onPress={() => setShowAddModal(true)}>
        <Text style={styles.primaryBtnText}>Add a Memory</Text>
      </Pressable>

      {!isConfirmedByMe ? (
        <Pressable style={styles.sealBtn} onPress={onConfirmSeal}>
          <Text style={styles.sealBtnText}>Seal Capsule</Text>
        </Pressable>
      ) : null}

      {isConfirmedByMe && confirmedCount < 2 ? (
        <Text style={styles.waitingText}>Waiting for {partnerName || 'partner'} to confirm</Text>
      ) : null}
      {confirmedCount === 2 ? (
        <Text style={styles.waitingText}>Both confirmed — capsule is sealing!</Text>
      ) : null}
    </View>
  );

  const SealedInfo = () => (
    <View style={styles.actions}>
      <Text style={styles.countdown}>{openCountdownText()}</Text>
      <Text style={styles.muted}>Adding memories is closed</Text>
    </View>
  );

  const OpenedInfo = () => (
    <View style={styles.actions}>
      <Text style={styles.openedHeader}>🎉 Your capsule is open!</Text>
    </View>
  );

  const ListHeader = (
    <>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow} numberOfLines={1}>
            ‹ Back
          </Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          {capsule?.title || 'Capsule'}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={[styles.statusBar, { backgroundColor: meta.bg }]}>
        <Text style={[styles.statusBarText, { color: meta.fg }]}>{meta.text}</Text>
      </View>

      {capsule?.status === 'collecting' ? <CollectingActions /> : null}
      {capsule?.status === 'sealed' ? <SealedInfo /> : null}
      {capsule?.status === 'opened' ? <OpenedInfo /> : null}
    </>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (errorText) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backArrow} numberOfLines={1}>
              ‹ Back
            </Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
            {capsule?.title || 'Capsule'}
          </Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>{errorText}</Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={renderPost}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      />

      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (isAdding) return;
          setShowAddModal(false);
          resetAddModal();
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add a Memory</Text>
            <TextInput
              placeholder="Write a memory..."
              value={memoryText}
              onChangeText={setMemoryText}
              multiline
              maxLength={2000}
              editable={!isAdding}
              style={styles.modalInput}
            />
            <MoodPicker value={moodTag} onChange={setMoodTag} />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => {
                  if (isAdding) return;
                  setShowAddModal(false);
                  resetAddModal();
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalBtn,
                  styles.modalAddBtn,
                  (memoryText.trim().length === 0 || isAdding) && styles.modalAddDisabled,
                ]}
                disabled={memoryText.trim().length === 0 || isAdding}
                onPress={submitAdd}
              >
                {isAdding ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalAddText}>Add Memory</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  errorText: { textAlign: 'center', color: '#6B7280', fontSize: 16, marginBottom: 14 },
  retryButton: {
    borderWidth: 1,
    borderColor: '#4F46B8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: '#4F46B8', fontWeight: '800' },
  header: {
    height: 52,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { width: 72, height: 32, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: '#4F46B8', fontSize: 16, fontWeight: '700' },
  headerTitle: { flex: 2, textAlign: 'center', color: '#111827', fontSize: 17, fontWeight: '800' },
  statusBar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  statusBarText: { fontWeight: '900' },
  actions: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 10 },
  primaryBtn: {
    backgroundColor: '#4F46B8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '900' },
  sealBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C2185B',
    backgroundColor: '#FFFFFF',
  },
  sealBtnText: { color: '#C2185B', fontWeight: '900' },
  waitingText: { color: '#6B7280', fontWeight: '700' },
  countdown: { color: '#4F46B8', fontWeight: '900' },
  muted: { color: '#6B7280' },
  openedHeader: { color: '#065F46', fontWeight: '900' },
  listContent: { paddingBottom: 18 },
  postRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  postRowSealed: {
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  initialCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  initialOwn: { backgroundColor: '#4F46B8' },
  initialPartner: { backgroundColor: '#F9A8D4' },
  initialText: { color: '#FFFFFF', fontWeight: '900' },
  postBody: { flex: 1 },
  postContent: { color: '#111827', fontSize: 15, lineHeight: 20 },
  postContentSealed: { color: '#6B7280', fontStyle: 'italic' },
  moodBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  moodText: { fontSize: 11, fontWeight: '900' },
  postTime: { marginTop: 8, color: '#9CA3AF', fontSize: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24 },
  modalTitle: { color: '#111827', fontSize: 16, fontWeight: '900' },
  modalInput: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  modalButtons: { marginTop: 16, flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalCancelBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  modalCancelText: { color: '#6B7280', fontWeight: '900' },
  modalAddBtn: { backgroundColor: '#4F46B8' },
  modalAddDisabled: { backgroundColor: '#C7D2FE' },
  modalAddText: { color: '#FFFFFF', fontWeight: '900' },
});
