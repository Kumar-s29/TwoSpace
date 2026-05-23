import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createCapsule, getMyCapsules } from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function CapsuleScreen({ navigation }) {
  const { theme } = useTheme();
  const [capsules, setCapsules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorText, setErrorText] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [opensAt, setOpensAt] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [didPickDate, setDidPickDate] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(null);

  const minDate = useMemo(() => new Date(Date.now() + 60 * 60 * 1000), []);

  const didInitRef = useRef(false);

  const load = async () => {
    setErrorText('');
    try {
      const res = await getMyCapsules();
      setCapsules(Array.isArray(res?.capsules) ? res.capsules : []);
    } catch (err) {
      setErrorText('Could not load capsules.');
    }
  };

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    (async () => {
      setIsLoading(true);
      await load();
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const resetModal = () => {
    setTitle('');
    setOpensAt(null);
    setDidPickDate(false);
    setTempDate(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const statusMeta = (status) => {
    if (status === 'collecting') return { bg: theme.moodLowBg, fg: theme.moodLowText, text: 'Adding memories' };
    if (status === 'sealed') return { bg: theme.accentLight, fg: theme.accent, text: 'Sealed 🔒' };
    if (status === 'opened') return { bg: theme.successLight, fg: theme.successText, text: 'Opened 🎉' };
    return { bg: theme.bgSecondary, fg: theme.textPrimary, text: status || 'Unknown' };
  };

  const isDateTooSoon = useMemo(() => {
    if (!opensAt) return false;
    return opensAt.getTime() < Date.now() + 60 * 60 * 1000;
  }, [opensAt]);

  const canCreate =
    title.trim().length > 0 && title.trim().length <= 60 && opensAt && !isDateTooSoon;

  const submitCreate = async () => {
    if (isCreating) return;
    const trimmedTitle = title.trim();
    const date = opensAt;
    if (!trimmedTitle || trimmedTitle.length > 60) return;
    if (!date) return;
    if (date.getTime() < Date.now() + 60 * 60 * 1000) {
      Alert.alert('Pick a later time', 'Please choose a time at least 1 hour from now.');
      return;
    }
    setIsCreating(true);
    try {
      await createCapsule({ title: trimmedTitle, opensAt: date.toISOString() });
      setShowModal(false);
      resetModal();
      await load();
    } catch (err) {
      setErrorText('Could not create capsule.');
    } finally {
      setIsCreating(false);
    }
  };

  const renderItem = ({ item }) => {
    const meta = statusMeta(item?.status);
    const opensText = item?.opensAt
      ? dayjs(item.opensAt).format('MMM D, YYYY [at] h:mm A')
      : '';
    const confirmedCount = Array.isArray(item?.confirmedBy) ? item.confirmedBy.length : 0;

    return (
      <Pressable
        style={[styles.card, { backgroundColor: theme.bgCard, shadowColor: theme.shadow }]}
        onPress={() => navigation.navigate('CapsuleDetail', { capsuleId: item._id })}
      >
        <View style={styles.cardTopRow}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{item?.title || 'Untitled'}</Text>
          <View style={[styles.badge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.badgeText, { color: meta.fg }]}>{meta.text}</Text>
          </View>
        </View>

        <Text style={[styles.cardSub, { color: theme.textSecondary }]}>Opens on {opensText}</Text>
        {item?.status === 'collecting' ? (
          <Text style={[styles.cardSub, { color: theme.textSecondary }]}>{confirmedCount} of 2 confirmed</Text>
        ) : null}
      </Pressable>
    );
  };

  const Header = (
    <View style={[styles.header, { backgroundColor: theme.header }]}>
      <Text style={styles.headerTitle}>Memory Capsules</Text>
      <Pressable onPress={() => setShowModal(true)} style={styles.newBtn}>
        <Text style={styles.newBtnText}>+ New</Text>
      </Pressable>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.header }]}>
        {Header}
        <View style={[styles.contentCard, { backgroundColor: theme.bgPrimary }]}>
          <View style={[styles.center, { backgroundColor: theme.bgPrimary }]}>
            <ActivityIndicator color={theme.accent} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.header }]}>
      {Header}

      <View style={[styles.contentCard, { backgroundColor: theme.bgPrimary }]}>
      {errorText ? (
        <View style={[styles.center, { backgroundColor: theme.bgPrimary }]}>
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>{errorText}</Text>
          <Pressable style={[styles.retryButton, { borderColor: theme.accent }]} onPress={load}>
            <Text style={[styles.retryText, { color: theme.accent }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={capsules}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          style={{ backgroundColor: theme.bgPrimary }}
          contentContainerStyle={capsules.length === 0 ? [styles.emptyContainer, { backgroundColor: theme.bgPrimary }] : [styles.listContainer, { backgroundColor: theme.bgPrimary }]}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                📦 No capsules yet. Create your{'\n'}first shared memory capsule.
              </Text>
            </View>
          }
        />
      )}
      </View>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (isCreating) return;
          setShowModal(false);
          resetModal();
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.bgCard }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>New Memory Capsule</Text>

            <TextInput
              placeholder="e.g. Our 2026, Summer Trip..."
              placeholderTextColor={theme.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={60}
              editable={!isCreating}
              style={[styles.modalInput, { backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary }]}
            />

            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>When should it open?</Text>
            <Pressable
              style={[styles.dateBox, { backgroundColor: theme.bgInput, borderColor: theme.border }]}
              onPress={() => {
                if (isCreating) return;
                if (Platform.OS === 'ios') {
                  setShowDatePicker((v) => !v);
                } else {
                  setShowDatePicker(true);
                }
              }}
            >
              <Text style={[styles.dateText, { color: theme.textMuted }, opensAt ? [styles.dateTextSelected, { color: theme.accent }] : null]}>
                {opensAt
                  ? dayjs(opensAt).format('dddd, MMMM D [at] h:mm A')
                  : 'Tap to choose a date & time'}
              </Text>
            </Pressable>

            {Platform.OS === 'ios' && showDatePicker ? (
              <DateTimePicker
                value={opensAt || minDate}
                mode="datetime"
                display="spinner"
                minimumDate={minDate}
                onChange={(event, selected) => {
                  if (selected) {
                    setOpensAt(selected);
                    setDidPickDate(true);
                  }
                }}
              />
            ) : null}

            {didPickDate && isDateTooSoon ? (
              <Text style={[styles.dateError, { color: theme.error }]}>Please choose a time at least 1 hour from now.</Text>
            ) : null}

            {Platform.OS === 'android' && showDatePicker ? (
              <DateTimePicker
                value={opensAt || minDate}
                mode="date"
                minimumDate={minDate}
                onChange={(event, selected) => {
                  if (event.type === 'dismissed') {
                    setShowDatePicker(false);
                    return;
                  }
                  if (selected) {
                    setTempDate(selected);
                    setShowDatePicker(false);
                    setShowTimePicker(true);
                  }
                }}
              />
            ) : null}

            {Platform.OS === 'android' && showTimePicker ? (
              <DateTimePicker
                value={opensAt || minDate}
                mode="time"
                onChange={(event, selectedTime) => {
                  if (event.type === 'dismissed') {
                    setShowTimePicker(false);
                    setTempDate(null);
                    return;
                  }
                  if (selectedTime && tempDate) {
                    const combined = new Date(tempDate);
                    combined.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
                    setOpensAt(combined);
                    setDidPickDate(true);
                  }
                  setShowTimePicker(false);
                  setTempDate(null);
                }}
              />
            ) : null}

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.modalCancelBtn, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                onPress={() => {
                  if (isCreating) return;
                  setShowModal(false);
                  resetModal();
                }}
              >
                <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalBtn,
                  styles.modalCreateBtn,
                  { backgroundColor: theme.pink },
                  (!canCreate || isCreating) && { backgroundColor: theme.bgMuted, opacity: 0.5 },
                ]}
                disabled={!canCreate || isCreating}
                onPress={submitCreate}
              >
                {isCreating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalCreateText}>Create Capsule</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#4F46B8',
  },
  contentCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
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
  newBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  newBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 16,
    marginBottom: 14,
  },
  retryButton: {
    borderWidth: 1,
    borderColor: '#4F46B8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: '#4F46B8',
    fontWeight: '800',
  },
  listContainer: {
    paddingVertical: 14,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  emptyBox: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 16,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'flex-start',
  },
  cardTitle: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  cardSub: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 13,
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
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  modalInput: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  modalLabel: {
    marginTop: 14,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700',
  },
  dateBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#F9FAFB',
  },
  dateText: {
    color: '#9CA3AF',
    fontWeight: '700',
  },
  dateTextSelected: {
    color: '#4F46B8',
    fontWeight: '900',
  },
  dateError: {
    marginTop: 8,
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
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
  modalCreateBtn: {
    backgroundColor: '#C2185B',
  },
  modalCreateDisabled: {
    backgroundColor: '#FBCFE8',
  },
  modalCreateText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
