import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { AuthContext } from '../context/AuthContext';
import {
  addMilestone,
  deleteMilestone,
  getMilestones,
} from '../services/api';

const EMOJI_PRESETS = ['❤️', '💑', '✈️', '🎂', '🏠', '⭐', '🥂', '🌟', '💍', '🎉'];

export default function MilestonesScreen({ navigation }) {
  const { user } = useContext(AuthContext);

  const [milestones, setMilestones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal & Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newNote, setNewNote] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('⭐');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isRecurring, setIsRecurring] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const loadMilestones = async () => {
    try {
      const res = await getMilestones();
      setMilestones(res?.milestones || []);
    } catch (err) {
      Alert.alert('Error', 'Could not load milestones.');
    }
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await loadMilestones();
      setIsLoading(false);
    })();
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadMilestones();
    setIsRefreshing(false);
  };

  const handleDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const onAdd = async () => {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      Alert.alert('Validation Error', 'Please enter a title for the milestone.');
      return;
    }
    if (isAdding) return;

    setIsAdding(true);
    try {
      const res = await addMilestone({
        title: trimmedTitle,
        note: newNote.trim() || undefined,
        emoji: selectedEmoji,
        date: selectedDate.toISOString(),
        isRecurring,
      });

      if (res?.success && res.milestone) {
        setMilestones(prev => [...prev, res.milestone]);
        // Reset form
        setNewTitle('');
        setNewNote('');
        setSelectedEmoji('⭐');
        setSelectedDate(new Date());
        setIsRecurring(false);
        setShowAddModal(false);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not add milestone.');
    } finally {
      setIsAdding(false);
    }
  };

  const onDelete = (milestone) => {
    const isOwn = 
      milestone.createdBy?._id?.toString() === user?._id?.toString() ||
      milestone.createdBy?.toString() === user?._id?.toString();

    if (!isOwn) {
      Alert.alert('Permission Denied', 'Only the creator of this milestone can delete it.');
      return;
    }

    Alert.alert(
      'Delete Milestone',
      `Are you sure you want to delete "${milestone.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMilestone(milestone._id);
              setMilestones(prev => prev.filter(m => m._id !== milestone._id));
            } catch (err) {
              Alert.alert('Error', 'Could not delete milestone.');
            }
          },
        },
      ]
    );
  };

  // Helper for computing countdown / time elapsed
  const getMilestoneInfo = (milestone) => {
    const today = dayjs().startOf('day');
    const mDate = dayjs(milestone.date).startOf('day');

    if (milestone.isRecurring) {
      // Recurring annual milestones
      let nextOccur = mDate.year(today.year());
      if (nextOccur.isBefore(today, 'day')) {
        nextOccur = nextOccur.add(1, 'year');
      }
      const daysUntil = nextOccur.diff(today, 'day');
      return {
        isUpcoming: true,
        daysUntil,
        displayText: daysUntil === 0 ? 'Today!' : `Annual — in ${daysUntil} days`,
      };
    } else {
      // Non-recurring milestones
      if (mDate.isSame(today, 'day')) {
        return {
          isUpcoming: true,
          daysUntil: 0,
          displayText: 'Today!',
        };
      } else if (mDate.isAfter(today, 'day')) {
        const daysUntil = mDate.diff(today, 'day');
        return {
          isUpcoming: true,
          daysUntil,
          displayText: `In ${daysUntil} days`,
        };
      } else {
        // Past milestone
        const years = today.diff(mDate, 'year');
        const months = today.diff(mDate, 'month');
        const days = today.diff(mDate, 'day');

        let agoText = '';
        if (years > 0) {
          agoText = years === 1 ? '1 year ago' : `${years} years ago`;
        } else if (months > 0) {
          agoText = months === 1 ? '1 month ago' : `${months} months ago`;
        } else {
          agoText = days === 1 ? '1 day ago' : `${days} days ago`;
        }

        return {
          isUpcoming: false,
          daysAgo: days,
          displayText: agoText,
        };
      }
    }
  };

  // Process & Categorize milestones
  const processedMilestones = milestones.map(m => {
    const info = getMilestoneInfo(m);
    return { ...m, ...info };
  });

  // UPCOMING: Ascending by daysUntil
  const upcomingMilestones = processedMilestones
    .filter(m => m.isUpcoming)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // PAST: Descending by daysAgo (most recent past date first)
  const pastMilestones = processedMilestones
    .filter(m => !m.isUpcoming)
    .sort((a, b) => a.daysAgo - b.daysAgo);

  const renderMilestoneCard = (item) => {
    const isOwn = 
      item.createdBy?._id?.toString() === user?._id?.toString() ||
      item.createdBy?.toString() === user?._id?.toString();
    const creatorName = item.createdBy?.displayName || 'Partner';
    const formattedDate = dayjs(item.date).format('MMM DD, YYYY');

    return (
      <Pressable
        key={item._id}
        style={styles.milestoneCard}
        onLongPress={() => onDelete(item)}
      >
        <View style={styles.emojiContainer}>
          <Text style={styles.milestoneEmoji}>{item.emoji || '⭐'}</Text>
        </View>
        <View style={styles.milestoneDetails}>
          <View style={styles.milestoneHeaderRow}>
            <Text style={styles.milestoneTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[
              styles.countdownText,
              item.daysUntil === 0 && styles.todayText
            ]}>
              {item.displayText}
            </Text>
          </View>
          {item.note ? (
            <Text style={styles.milestoneNote} numberOfLines={2}>
              {item.note}
            </Text>
          ) : null}
          <View style={styles.milestoneFooterRow}>
            <Text style={styles.milestoneDate}>{formattedDate}</Text>
            <Text style={styles.milestoneCreator}>
              By {isOwn ? 'you' : creatorName}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const sectionsData = [];
  if (upcomingMilestones.length > 0) {
    sectionsData.push({ title: 'Upcoming', data: upcomingMilestones });
  }
  if (pastMilestones.length > 0) {
    sectionsData.push({ title: 'Past', data: pastMilestones });
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹ Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Milestones</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.contentCard}>
          <View style={styles.center}>
            <ActivityIndicator color="#4F46B8" size="large" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Milestones</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.contentCard}>
        <FlatList
          data={sectionsData}
          keyExtractor={(item) => item.title}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionHeading}>{item.title.toUpperCase()}</Text>
              {item.data.map(milestone => renderMilestoneCard(milestone))}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🗓️</Text>
              <Text style={styles.emptyText}>
                No milestones added yet.{'\n'}
                Track anniversaries, trips, or big events together!
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContainer}
        />

        {/* Floating Add Button */}
        <Pressable
          style={styles.floatingAddBtn}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.floatingAddText}>+</Text>
        </Pressable>
      </View>

      {/* Add Milestone Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (!isAdding) setShowAddModal(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeading}>New Milestone</Text>

            <ScrollView
              contentContainerStyle={styles.modalForm}
              keyboardShouldPersistTaps="handled"
            >
              {/* Emoji Selector */}
              <Text style={styles.inputLabel}>Choose Emoji</Text>
              <View style={styles.emojiGrid}>
                {EMOJI_PRESETS.map(emoji => (
                  <Pressable
                    key={emoji}
                    onPress={() => setSelectedEmoji(emoji)}
                    style={[
                      styles.emojiButton,
                      selectedEmoji === emoji && styles.emojiButtonSelected,
                    ]}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Title Input */}
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Anniversary, first trip, next goal..."
                placeholderTextColor="#9CA3AF"
                value={newTitle}
                onChangeText={setNewTitle}
                maxLength={80}
              />

              {/* Date Input */}
              <Text style={styles.inputLabel}>Date</Text>
              <Pressable
                style={styles.dateSelectorBox}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateSelectorText}>
                  {dayjs(selectedDate).format('MMMM DD, YYYY')}
                </Text>
              </Pressable>

              {showDatePicker || Platform.OS === 'ios' ? (
                <View style={styles.pickerWrapper}>
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    style={styles.iosDatePicker}
                  />
                  {Platform.OS === 'ios' && (
                    <Pressable
                      style={styles.iosDoneButton}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={styles.iosDoneText}>Done</Text>
                    </Pressable>
                  )}
                </View>
              ) : null}

              {/* Note Input */}
              <Text style={styles.inputLabel}>Note (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                placeholder="Add some details or a memory..."
                placeholderTextColor="#9CA3AF"
                value={newNote}
                onChangeText={setNewNote}
                maxLength={300}
                multiline
              />

              {/* Recurring Toggle */}
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Recurring Yearly</Text>
                  <Text style={styles.toggleDesc}>
                    Anniversaries, birthdays, yearly events
                  </Text>
                </View>
                <Switch
                  value={isRecurring}
                  onValueChange={setIsRecurring}
                  trackColor={{ false: '#E5E7EB', true: '#C7D2FE' }}
                  thumbColor={isRecurring ? '#4F46B8' : '#F3F4F6'}
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowAddModal(false)}
                disabled={isAdding}
                style={[styles.modalBtn, styles.modalCancelBtn]}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={onAdd}
                disabled={isAdding || !newTitle.trim()}
                style={[
                  styles.modalBtn,
                  styles.modalAddBtn,
                  (!newTitle.trim() || isAdding) && { opacity: 0.5 }
                ]}
              >
                {isAdding ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalAddText}>Add</Text>
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
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backBtn: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  contentCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingTop: 16,
    paddingBottom: 80,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginLeft: 16,
    marginBottom: 8,
  },
  milestoneCard: {
    flexDirection: 'row',
    backgroundColor: '#FAFBFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    alignItems: 'center',
  },
  emojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0EFFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  milestoneEmoji: {
    fontSize: 22,
  },
  milestoneDetails: {
    flex: 1,
  },
  milestoneHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  milestoneTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46B8',
  },
  todayText: {
    color: '#22C55E',
    fontWeight: '900',
  },
  milestoneNote: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
    lineHeight: 18,
  },
  milestoneFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  milestoneDate: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  milestoneCreator: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  floatingAddBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46B8',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  floatingAddText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 32,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 22,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    padding: 24,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalForm: {
    paddingBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 8,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiButtonSelected: {
    borderColor: '#4F46B8',
    backgroundColor: '#F0EFFC',
  },
  emojiText: {
    fontSize: 20,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  dateSelectorBox: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  dateSelectorText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46B8',
  },
  pickerWrapper: {
    backgroundColor: '#FAFBFB',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  iosDatePicker: {
    height: 150,
  },
  iosDoneButton: {
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  iosDoneText: {
    color: '#4F46B8',
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 6,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  toggleDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 12 : 0,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
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
    fontWeight: '700',
  },
  modalAddBtn: {
    backgroundColor: '#4F46B8',
  },
  modalAddText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
