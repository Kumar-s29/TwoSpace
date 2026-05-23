import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createWish } from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function WishScreen({ navigation }) {
  const { theme } = useTheme();
  const [label, setLabel] = useState('');
  const [content, setContent] = useState('');
  const [unlockDate, setUnlockDate] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(null);
  const [showTooSoonError, setShowTooSoonError] = useState(false);

  const trimmedContent = content.trim();

  const minimumDate = useMemo(
    () => new Date(Date.now() + 60 * 60 * 1000),
    []
  );

  const canSend = useMemo(() => {
    if (isSubmitting) return false;
    if (!trimmedContent) return false;
    if (!unlockDate) return false;
    return true;
  }, [isSubmitting, trimmedContent, unlockDate]);

  const counterColor = content.length > 4500 ? '#DC2626' : '#9CA3AF';

  const formattedDateText = useMemo(() => {
    if (!unlockDate) return null;
    return dayjs(unlockDate).format('dddd, MMMM D [at] h:mm A');
  }, [unlockDate]);

  const validateUnlockDate = (d) => {
    if (!d) return false;
    return d.getTime() >= Date.now() + 60 * 60 * 1000;
  };

  const onOpenPicker = () => {
    setShowDatePicker(true);
    setShowTimePicker(false);
  };

  const onAndroidDateChange = (event, selected) => {
    if (event?.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    if (!selected) {
      setShowDatePicker(false);
      return;
    }
    setTempDate(selected);
    setShowDatePicker(false);
    setShowTimePicker(true);
  };

  const onAndroidTimeChange = (event, selectedTime) => {
    if (event?.type === 'dismissed') {
      setShowTimePicker(false);
      return;
    }
    if (!selectedTime || !tempDate) {
      setShowTimePicker(false);
      return;
    }
    const combined = new Date(tempDate);
    combined.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    setUnlockDate(combined);
    setShowTimePicker(false);

    const ok = validateUnlockDate(combined);
    setShowTooSoonError(!ok);
  };

  const onIOSChange = (event, selected) => {
    if (!selected) return;
    setUnlockDate(selected);
    const ok = validateUnlockDate(selected);
    setShowTooSoonError(!ok);
  };

  const onSubmit = async () => {
    if (isSubmitting) return;

    if (!trimmedContent) return;
    if (!unlockDate) return;

    const ok = validateUnlockDate(unlockDate);
    setShowTooSoonError(!ok);
    if (!ok) return;

    setIsSubmitting(true);
    try {
      await createWish({
        content: trimmedContent,
        unlocksAt: unlockDate.toISOString(),
        ...(label.trim().length > 0 ? { label: label.trim() } : {}),
      });
      navigation.goBack();
    } catch (err) {
      const code = err && typeof err.error === 'string' ? err.error : null;
      if (code === 'INVALID_UNLOCK_DATE') {
        Alert.alert('Invalid time', 'Please choose a time at least 1 hour from now.');
      } else if (code === 'UNLOCK_DATE_TOO_FAR') {
        Alert.alert('Invalid date', 'Please choose a date within the next 5 years.');
      } else {
        const msg =
          (err && typeof err.message === 'string' && err.message.trim().length > 0 && err.message) ||
          'Something went wrong. Please try again.';
        Alert.alert('Could not send wish', msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.header }}>
      <View style={[styles.header, { backgroundColor: theme.header }]}>
        <Pressable onPress={() => navigation.goBack()} disabled={isSubmitting}>
          <Text style={[styles.cancel, { color: theme.headerText, opacity: 0.8 }]}>Cancel</Text>
        </Pressable>

        <Text style={[styles.headerTitle, { color: theme.headerText }]}>Timed Wish</Text>

        <Pressable onPress={onSubmit} disabled={!canSend}>
          {isSubmitting ? (
            <ActivityIndicator color={theme.accent} />
          ) : (
            <Text style={[styles.send, !canSend && styles.sendDisabled]}>🔒 Seal & Send</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={{
          flex: 1,
          backgroundColor: theme.bgPrimary,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>What's the occasion?</Text>
        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder="Occasion (e.g. Birthday, Anniversary)"
          placeholderTextColor={theme.textMuted}
          maxLength={40}
          style={[styles.labelInput, { backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary }]}
          editable={!isSubmitting}
        />

        <Text style={[styles.sectionLabel, { marginTop: 18, color: theme.textSecondary }]}>Wish message</Text>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Write your heartfelt message..."
          placeholderTextColor={theme.textMuted}
          autoFocus
          multiline
          maxLength={5000}
          style={[styles.messageInput, { color: theme.textPrimary }]}
          editable={!isSubmitting}
          textAlignVertical="top"
        />
        <View style={styles.counterRow}>
          <Text style={[styles.counter, { color: counterColor }]}>
            {content.length} / 5000
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 18, color: theme.textSecondary }]}>When should this open?</Text>
        <Pressable onPress={onOpenPicker} style={[styles.dateBox, { backgroundColor: theme.bgInput, borderColor: theme.border }]} disabled={isSubmitting}>
          <Text style={[styles.dateText, unlockDate ? [styles.dateTextSelected, { color: theme.accent }] : [styles.dateTextEmpty, { color: theme.textMuted }]]}>
            {unlockDate ? formattedDateText : 'Tap to choose a date & time'}
          </Text>
        </Pressable>

        {showTooSoonError ? (
          <Text style={[styles.inlineError, { color: theme.error }]}>Please choose a time at least 1 hour from now.</Text>
        ) : null}

        {Platform.OS === 'android' && showDatePicker ? (
          <DateTimePicker
            value={unlockDate || minimumDate}
            mode="date"
            minimumDate={minimumDate}
            onChange={onAndroidDateChange}
          />
        ) : null}

        {Platform.OS === 'android' && showTimePicker ? (
          <DateTimePicker
            value={unlockDate || minimumDate}
            mode="time"
            onChange={onAndroidTimeChange}
          />
        ) : null}

        {Platform.OS === 'ios' && showDatePicker ? (
          <DateTimePicker
            value={unlockDate || minimumDate}
            mode="datetime"
            display="spinner"
            minimumDate={minimumDate}
            onChange={onIOSChange}
          />
        ) : null}

        <View style={[styles.callout, { backgroundColor: theme.accentLight }]}>
          <Text style={[styles.calloutText, { color: theme.accent }]}>
            💌 Your message will stay sealed until the moment you choose. They'll know something is waiting —
            but they can't open it early.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4F46B8',
    borderBottomWidth: 0,
  },
  cancel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  send: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sendDisabled: {
    color: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  labelInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
  },
  messageInput: {
    fontSize: 16,
    color: '#111827',
    minHeight: 160,
    padding: 0,
  },
  counterRow: {
    alignItems: 'flex-end',
    marginTop: 6,
  },
  counter: {
    fontSize: 12,
  },
  dateBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#F9FAFB',
  },
  dateText: {
    fontSize: 14,
  },
  dateTextSelected: {
    color: '#4F46B8',
    fontWeight: '700',
  },
  dateTextEmpty: {
    color: '#9CA3AF',
  },
  inlineError: {
    marginTop: 8,
    color: '#DC2626',
    fontSize: 12,
  },
  callout: {
    backgroundColor: '#F0EFFC',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  calloutText: {
    color: '#4F46B8',
    fontSize: 13,
    lineHeight: 20,
  },
});
