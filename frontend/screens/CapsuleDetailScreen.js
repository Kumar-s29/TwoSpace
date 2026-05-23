import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
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
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';

import { AuthContext } from '../context/AuthContext';
import { addToCapsule, confirmCapsule, getCapsule, getMyRoom, uploadImage, uploadAudio } from '../services/api';
import MoodPicker from '../components/MoodPicker';
import { useTheme } from '../context/ThemeContext';

dayjs.extend(relativeTime);

export default function CapsuleDetailScreen({ navigation, route }) {
  const { theme } = useTheme();
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

  // Photo state
  const [imageUri, setImageUri] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Voice note state
  const [recording, setRecording] = useState(null);
  const [recordingUri, setRecordingUri] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const socketRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const durationTimerRef = useRef(null);

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
      // Cleanup recording timer & recording on unmount
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, capsuleId]);

  useEffect(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (capsule?.status !== 'sealed') return;
    countdownTimerRef.current = setInterval(() => {
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
      return { bg: theme.moodLowBg, fg: theme.moodLowText, text: 'Adding memories' };
    if (status === 'sealed') return { bg: theme.accentLight, fg: theme.accent, text: 'Sealed 🔒' };
    if (status === 'opened') return { bg: theme.successLight, fg: theme.successText, text: 'Opened 🎉' };
    return { bg: theme.bgSecondary, fg: theme.textPrimary, text: status || 'Unknown' };
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

  // ─── Photo functions ────────────────────────────────────────────────────────
  const onPickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setImageUri(result.assets[0].uri);
        setImageUrl(null);
        // Clear voice note if photo picked
        discardRecording();
      }
    } catch (err) {}
  };

  // ─── Voice recording functions ───────────────────────────────────────────
  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(rec);
      setIsRecording(true);
      setRecordingDuration(0);
      setImageUri(null); // clear photo if recording
      setImageUrl(null);

      durationTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => {
          if (d >= 59) {
            stopRecordingInner(rec);
            return 60;
          }
          return d + 1;
        });
      }, 1000);
    } catch (err) {
      Alert.alert('Could not start recording.', 'Please allow microphone access.');
    }
  };

  const stopRecordingInner = async (rec) => {
    try {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      setIsRecording(false);
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      setRecording(null);
      setRecordingUri(uri);
    } catch (err) {}
  };

  const stopRecording = async () => {
    if (!recording) return;
    await stopRecordingInner(recording);
  };

  const playRecording = async () => {
    if (!recordingUri) return;
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: recordingUri });
      await sound.playAsync();
    } catch (err) {
      Alert.alert('Could not play recording.');
    }
  };

  const discardRecording = () => {
    setRecordingUri(null);
    setAudioUrl(null);
    setRecordingDuration(0);
    if (recording) {
      recording.stopAndUnloadAsync().catch(() => {});
      setRecording(null);
    }
    setIsRecording(false);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
  };

  // ─── Submit ──────────────────────────────────────────────────────────────
  const resetAddModal = () => {
    setMemoryText('');
    setMoodTag(null);
    setImageUri(null);
    setImageUrl(null);
    setRecordingUri(null);
    setAudioUrl(null);
    setRecordingDuration(0);
    if (recording) {
      recording.stopAndUnloadAsync().catch(() => {});
      setRecording(null);
    }
    setIsRecording(false);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
  };

  const submitAdd = async () => {
    const trimmed = memoryText.trim();
    if (!trimmed && !imageUri && !recordingUri) return;
    if (trimmed.length > 2000) return;
    if (isAdding) return;

    setIsAdding(true);
    try {
      let finalImageUrl = imageUrl;
      let finalAudioUrl = audioUrl;

      // Upload image if selected and not yet uploaded
      if (imageUri && !finalImageUrl) {
        setIsUploadingImage(true);
        try {
          const res = await uploadImage(imageUri);
          finalImageUrl = res?.mediaUrl || null;
          setImageUrl(finalImageUrl);
        } catch (err) {
          setIsUploadingImage(false);
          setIsAdding(false);
          Alert.alert('Could not upload photo.', 'Please try again.');
          return;
        } finally {
          setIsUploadingImage(false);
        }
      }

      // Upload audio if recorded and not yet uploaded
      if (recordingUri && !finalAudioUrl) {
        setIsUploadingAudio(true);
        try {
          const res = await uploadAudio(recordingUri);
          finalAudioUrl = res?.audioUrl || null;
          setAudioUrl(finalAudioUrl);
        } catch (err) {
          setIsUploadingAudio(false);
          setIsAdding(false);
          Alert.alert('Could not upload voice note.', 'Please try again.');
          return;
        } finally {
          setIsUploadingAudio(false);
        }
      }

      await addToCapsule(capsuleId, {
        content: trimmed || null,
        moodTag,
        ...(finalImageUrl ? { mediaUrl: finalImageUrl } : {}),
        ...(finalAudioUrl ? { audioUrl: finalAudioUrl } : {}),
      });

      setShowAddModal(false);
      resetAddModal();
      await load();
    } catch (err) {
      Alert.alert('Could not add memory.');
    } finally {
      setIsAdding(false);
    }
  };

  // ─── Render post ─────────────────────────────────────────────────────────
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
        ? { bg: theme.moodGoodBg, fg: theme.moodGoodText, text: '🌤 Good' }
        : meta === 'okay'
          ? { bg: theme.moodOkayBg, fg: theme.moodOkayText, text: '⛅ Okay' }
          : meta === 'low'
            ? { bg: theme.moodLowBg, fg: theme.moodLowText, text: '🌧 Low' }
            : null;

    return (
      <View style={[styles.postRow, sealed && [styles.postRowSealed, { backgroundColor: theme.bgSecondary, borderTopColor: theme.border }]]}>
        <View style={[styles.initialCircle, isOwn ? { backgroundColor: theme.accent } : { backgroundColor: theme.pink }]}>
          <Text style={[styles.initialText, { color: theme.textInverse }]}>{initial}</Text>
        </View>
        <View style={styles.postBody}>
          {content ? (
            <Text style={[styles.postContent, { color: theme.textPrimary }, sealed && [styles.postContentSealed, { color: theme.textSecondary }]]}>{content}</Text>
          ) : null}
          {moodMeta ? (
            <View style={[styles.moodBadge, { backgroundColor: moodMeta.bg }]}>
              <Text style={[styles.moodText, { color: moodMeta.fg }]}>{moodMeta.text}</Text>
            </View>
          ) : null}

          {/* Photo — only shown when capsule is open */}
          {!sealed && item?.mediaUrl ? (
            <Image
              source={{ uri: item.mediaUrl }}
              style={styles.postImage}
              resizeMode="cover"
            />
          ) : null}

          {/* Voice note — only shown when capsule is open */}
          {!sealed && item?.audioUrl ? (
            <Pressable
              onPress={async () => {
                try {
                  const { sound } = await Audio.Sound.createAsync({ uri: item.audioUrl });
                  await sound.playAsync();
                } catch (err) {
                  Alert.alert('Could not play audio.');
                }
              }}
              style={[styles.audioPlayBtn, { backgroundColor: theme.accentLight }]}
            >
              <Text style={{ fontSize: 18 }}>▶️</Text>
              <Text style={[styles.audioPlayText, { color: theme.accent }]}>Play voice note</Text>
            </Pressable>
          ) : null}

          <Text style={[styles.postTime, { color: theme.textMuted }]}>
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
      <Pressable style={[styles.primaryBtn, { backgroundColor: theme.accent }]} onPress={() => setShowAddModal(true)}>
        <Text style={[styles.primaryBtnText, { color: theme.accentText }]}>Add a Memory</Text>
      </Pressable>

      {!isConfirmedByMe ? (
        <Pressable style={[styles.sealBtn, { borderColor: theme.pink, backgroundColor: theme.bgCard }]} onPress={onConfirmSeal}>
          <Text style={[styles.sealBtnText, { color: theme.pink }]}>Seal Capsule</Text>
        </Pressable>
      ) : null}

      {isConfirmedByMe && confirmedCount < 2 ? (
        <Text style={[styles.waitingText, { color: theme.textSecondary }]}>Waiting for {partnerName || 'partner'} to confirm</Text>
      ) : null}
      {confirmedCount === 2 ? (
        <Text style={[styles.waitingText, { color: theme.textSecondary }]}>Both confirmed — capsule is sealing!</Text>
      ) : null}
    </View>
  );

  const SealedInfo = () => (
    <View style={styles.actions}>
      <Text style={[styles.countdown, { color: theme.accent }]}>{openCountdownText()}</Text>
      <Text style={[styles.muted, { color: theme.textSecondary }]}>Adding memories is closed</Text>
    </View>
  );

  const OpenedInfo = () => (
    <View style={styles.actions}>
      <Text style={[styles.openedHeader, { color: theme.success }]}>🎉 Your capsule is open!</Text>
    </View>
  );

  const ListHeader = (
    <>
      <View style={[styles.statusBar, { backgroundColor: meta.bg }]}>
        <Text style={[styles.statusBarText, { color: meta.fg }]}>{meta.text}</Text>
      </View>

      {capsule?.status === 'collecting' ? <CollectingActions /> : null}
      {capsule?.status === 'sealed' ? <SealedInfo /> : null}
      {capsule?.status === 'opened' ? <OpenedInfo /> : null}
    </>
  );

  const canSubmit =
    (memoryText.trim().length > 0 || imageUri || recordingUri) && !isAdding && !isRecording;

  const isWorking = isAdding || isUploadingImage || isUploadingAudio;

  const workingLabel = isUploadingImage
    ? 'Uploading photo...'
    : isUploadingAudio
      ? 'Uploading voice note...'
      : 'Adding memory...';

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.header }]}>
        <View style={[styles.header, { backgroundColor: theme.header }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={[styles.backArrow, { color: theme.headerText }]} numberOfLines={1}>
              ‹ Back
            </Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.headerText }]} numberOfLines={1} ellipsizeMode="tail">
            {capsule?.title || 'Capsule'}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={[styles.contentCard, { backgroundColor: theme.bgPrimary }]}>
          <View style={[styles.center, { backgroundColor: theme.bgPrimary }]}>
            <ActivityIndicator color={theme.accent} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (errorText) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.header }]}>
        <View style={[styles.header, { backgroundColor: theme.header }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={[styles.backArrow, { color: theme.headerText }]} numberOfLines={1}>
              ‹ Back
            </Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.headerText }]} numberOfLines={1} ellipsizeMode="tail">
            {capsule?.title || 'Capsule'}
          </Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={[styles.contentCard, { backgroundColor: theme.bgPrimary }]}>
          <View style={[styles.center, { backgroundColor: theme.bgPrimary }]}>
            <Text style={[styles.errorText, { color: theme.textSecondary }]}>{errorText}</Text>
            <Pressable style={[styles.retryButton, { borderColor: theme.accent, backgroundColor: theme.bgPrimary }]} onPress={load}>
              <Text style={[styles.retryText, { color: theme.accent }]}>Retry</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.header }]}>
      <View style={[styles.header, { backgroundColor: theme.header }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backArrow, { color: theme.headerText }]} numberOfLines={1}>
            ‹ Back
          </Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.headerText }]} numberOfLines={1} ellipsizeMode="tail">
          {capsule?.title || 'Capsule'}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={[styles.contentCard, { backgroundColor: theme.bgPrimary }]}>
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          renderItem={renderPost}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={[styles.listContent, { backgroundColor: theme.bgPrimary }]}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        />
      </View>

      {/* Add Memory Modal */}
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
        <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.modalCard, { backgroundColor: theme.bgCard }]}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Add a Memory</Text>

              <TextInput
                placeholder="Write a memory... (optional if adding photo/voice)"
                placeholderTextColor={theme.textMuted}
                value={memoryText}
                onChangeText={setMemoryText}
                multiline
                maxLength={2000}
                editable={!isAdding}
                style={[styles.modalInput, { backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary }]}
              />

              <MoodPicker value={moodTag} onChange={setMoodTag} />

              {/* Media section */}
              <View style={styles.mediaSection}>
                <Text style={[styles.mediaLabel, { color: theme.textSecondary }]}>Add media (optional)</Text>

                <View style={styles.mediaRow}>
                  {/* Photo button */}
                  <Pressable
                    onPress={onPickImage}
                    disabled={isAdding || isRecording}
                    style={[
                      styles.mediaBtn,
                      { backgroundColor: theme.bgCard, borderColor: theme.border },
                      imageUri ? { backgroundColor: theme.accentLight, borderColor: theme.accent } : null,
                    ]}
                  >
                    <Text style={styles.mediaBtnIcon}>📷</Text>
                    <Text style={[styles.mediaBtnText, { color: theme.textSecondary }]}>
                      {imageUri ? 'Photo added ✓' : 'Add Photo'}
                    </Text>
                  </Pressable>

                  {/* Voice note button */}
                  <Pressable
                    onPress={
                      isRecording
                        ? stopRecording
                        : recordingUri
                          ? playRecording
                          : startRecording
                    }
                    disabled={isAdding || (imageUri != null)}
                    style={[
                      styles.mediaBtn,
                      { backgroundColor: theme.bgCard, borderColor: theme.border },
                      isRecording ? { backgroundColor: theme.errorLight, borderColor: theme.error } : null,
                      recordingUri && !isRecording ? { backgroundColor: theme.accentLight, borderColor: theme.accent } : null,
                    ]}
                  >
                    <Text style={styles.mediaBtnIcon}>
                      {isRecording ? '⏹' : recordingUri ? '▶️' : '🎙️'}
                    </Text>
                    <Text
                      style={[
                        styles.mediaBtnText,
                        { color: theme.textSecondary },
                        isRecording ? { color: theme.error } : null,
                      ]}
                    >
                      {isRecording
                        ? `Recording ${recordingDuration}s`
                        : recordingUri
                          ? `${recordingDuration}s — tap to play`
                          : 'Voice note'}
                    </Text>
                  </Pressable>
                </View>

                {/* Image preview */}
                {imageUri ? (
                  <View style={styles.imagePreviewWrap}>
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.imagePreview}
                      resizeMode="cover"
                    />
                    <Pressable
                      onPress={() => {
                        setImageUri(null);
                        setImageUrl(null);
                      }}
                      style={styles.imageRemoveBtn}
                    >
                      <Text style={styles.imageRemoveText}>✕</Text>
                    </Pressable>
                  </View>
                ) : null}

                {/* Discard recording */}
                {recordingUri && !isRecording ? (
                  <Pressable onPress={discardRecording} style={styles.discardBtn}>
                    <Text style={[styles.discardText, { color: theme.error }]}>Discard recording</Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalBtn, styles.modalCancelBtn, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                  onPress={() => {
                    if (isAdding) return;
                    setShowAddModal(false);
                    resetAddModal();
                  }}
                  disabled={isAdding}
                >
                  <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.modalBtn,
                    styles.modalAddBtn,
                    { backgroundColor: theme.accent },
                    (!canSubmit || isWorking) && { backgroundColor: theme.bgMuted, opacity: 0.5 },
                  ]}
                  disabled={!canSubmit || isWorking}
                  onPress={submitAdd}
                >
                  {isWorking ? (
                    <View style={{ alignItems: 'center' }}>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                      <Text style={[styles.modalAddText, { fontSize: 10, marginTop: 2 }]}>
                        {workingLabel}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.modalAddText}>Add Memory</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#4F46B8' },
  contentCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
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
    backgroundColor: '#4F46B8',
    borderBottomWidth: 0,
  },
  backBtn: { width: 72, height: 32, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  headerTitle: { flex: 2, textAlign: 'center', color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
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
  postImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    marginTop: 8,
  },
  audioPlayBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0EFFC',
    borderRadius: 10,
    padding: 10,
    alignSelf: 'flex-start',
  },
  audioPlayText: {
    fontSize: 12,
    color: '#4F46B8',
    fontWeight: '600',
  },
  postTime: { marginTop: 8, color: '#9CA3AF', fontSize: 12 },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  // Media section
  mediaSection: {
    marginTop: 14,
  },
  mediaLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  mediaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  mediaBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  mediaBtnActive: {
    backgroundColor: '#F0EFFC',
    borderColor: '#4F46B8',
  },
  mediaBtnRecording: {
    backgroundColor: '#FFF0F0',
    borderColor: '#DC2626',
  },
  mediaBtnIcon: {
    fontSize: 20,
  },
  mediaBtnText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 3,
    textAlign: 'center',
  },
  mediaBtnTextRecording: {
    color: '#DC2626',
  },
  imagePreviewWrap: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    aspectRatio: 4 / 3,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageRemoveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageRemoveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  discardBtn: {
    marginTop: 8,
    alignItems: 'center',
  },
  discardText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  modalButtons: { marginTop: 16, flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  modalCancelBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  modalCancelText: { color: '#6B7280', fontWeight: '900' },
  modalAddBtn: { backgroundColor: '#4F46B8' },
  modalAddDisabled: { backgroundColor: '#C7D2FE' },
  modalAddText: { color: '#FFFFFF', fontWeight: '900' },
});
