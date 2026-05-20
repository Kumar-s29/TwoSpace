import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import { AuthContext } from '../context/AuthContext';
import { 
  addJournalEntry, 
  getAllJournals, 
  getOnThisDay, 
  getTodayJournal 
} from '../services/api';

export default function JournalScreen() {
  const { user } = useContext(AuthContext);

  const [todayJournal, setTodayJournal] = useState(null);
  const [onThisDay, setOnThisDay] = useState([]);
  const [pastJournals, setPastJournals] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorText, setErrorText] = useState('');

  const [entryText, setEntryText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [expandedDates, setExpandedDates] = useState({});

  const today = new Date().toISOString().split('T')[0];

  const loadToday = async () => {
    try {
      const res = await getTodayJournal();
      setTodayJournal(res?.journal || null);
    } catch (err) {}
  };

  const loadOnThisDay = async () => {
    try {
      const res = await getOnThisDay();
      setOnThisDay(
        Array.isArray(res?.memories) 
          ? res.memories : []
      );
    } catch (err) {}
  };

  const loadPast = async (page = 1, replace = false) => {
    try {
      const res = await getAllJournals(page);
      const journals = Array.isArray(res?.journals)
        ? res.journals.filter(j => j.date !== today)
        : [];
      setTotalPages(
        res?.pagination?.totalPages || 1
      );
      setCurrentPage(page);
      setPastJournals(prev => 
        replace 
          ? journals 
          : [...prev, ...journals]
      );
    } catch (err) {}
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      await Promise.all([
        loadToday(),
        loadOnThisDay(),
        loadPast(1, true),
      ]);
      if (mounted) setIsLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadToday(),
      loadOnThisDay(),
      loadPast(1, true),
    ]);
    setIsRefreshing(false);
  };

  const onLoadMore = async () => {
    if (isLoadingMore || currentPage >= totalPages)
      return;
    setIsLoadingMore(true);
    await loadPast(currentPage + 1, false);
    setIsLoadingMore(false);
  };

  const onSubmitEntry = async () => {
    const trimmed = entryText.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addJournalEntry(trimmed);
      setEntryText('');
      await loadToday();
    } catch (err) {
      Alert.alert('Could not add entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleExpand = (date) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const renderEntry = (entry, index) => {
    const isOwn = entry.authorId?._id?.toString() 
      === user?._id?.toString()
      || entry.authorId?.toString() 
        === user?._id?.toString();
    const initial = entry.authorId?.displayName
      ? entry.authorId.displayName[0].toUpperCase()
      : '?';
    return (
      <View key={index} style={styles.entryRow}>
        <View style={[
          styles.entryCircle,
          isOwn 
            ? styles.entryCircleOwn 
            : styles.entryCirclePartner,
        ]}>
          <Text style={styles.entryInitial}>
            {initial}
          </Text>
        </View>
        <View style={styles.entryBody}>
          <Text style={styles.entryContent}>
            {entry.content}
          </Text>
          <Text style={styles.entryTime}>
            {dayjs(entry.createdAt).format('h:mm A')}
          </Text>
        </View>
      </View>
    );
  };

  const todayFormatted = dayjs().format(
    'dddd, MMMM D'
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Our Journal
          </Text>
        </View>
        <View style={styles.contentCard}>
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const ListHeader = (
    <View>
      {/* On this day section */}
      {onThisDay.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            ✨ On this day
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ 
              paddingHorizontal: 16, gap: 10 
            }}
          >
            {onThisDay.map((memory, i) => (
              <View key={i} style={styles.memoryCard}>
                <Text style={styles.memoryLabel}>
                  {memory.label}
                </Text>
                <Text style={styles.memoryContent} numberOfLines={3}>
                  {memory.post.content || '📷 A photo'}
                </Text>
                <Text style={styles.memoryDate}>
                  {dayjs(memory.post.createdAt).format('MMM D, YYYY')}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Today's journal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Today — {todayFormatted}
        </Text>

        {/* Existing entries */}
        {todayJournal?.entries?.length > 0 ? (
          <View style={styles.entriesList}>
            {todayJournal.entries.map(
              (entry, i) => renderEntry(entry, i)
            )}
          </View>
        ) : (
          <View style={styles.emptyToday}>
            <Text style={styles.emptyTodayText}>
              📖 Nothing written today yet.{'\n'}
              Be the first to add a thought.
            </Text>
          </View>
        )}

        {/* Add entry input */}
        <View style={styles.inputWrap}>
          <TextInput
            value={entryText}
            onChangeText={setEntryText}
            placeholder="Write something for today..."
            multiline
            maxLength={3000}
            style={styles.entryInput}
            editable={!isSubmitting}
          />
          <View style={styles.inputFooter}>
            <Text style={styles.entryCounter}>
              {entryText.length} / 3000
            </Text>
            <Pressable
              onPress={onSubmitEntry}
              disabled={
                !entryText.trim() || isSubmitting
              }
              style={[
                styles.addBtn,
                (!entryText.trim() || isSubmitting) 
                  && { opacity: 0.5 }
              ]}
            >
              {isSubmitting 
                ? <ActivityIndicator 
                    color="#fff" size="small" />
                : <Text style={styles.addBtnText}>
                    Add
                  </Text>
              }
            </Pressable>
          </View>
        </View>
      </View>

      {/* Past entries header */}
      {pastJournals.length > 0 ? (
        <View style={styles.pastHeader}>
          <Text style={styles.sectionTitle}>
            Past entries
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Our Journal
        </Text>
      </View>

      <View style={styles.contentCard}>
        <FlatList
          data={pastJournals}
          keyExtractor={(item) => item.date}
          ListHeaderComponent={ListHeader}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={onRefresh} 
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.pastCard}
              onPress={() => toggleExpand(item.date)}
            >
              <View style={styles.pastCardTop}>
                <Text style={styles.pastCardDate}>
                  {dayjs(item.date).format(
                    'dddd, MMMM D, YYYY'
                  )}
                </Text>
                <Text style={styles.pastCardCount}>
                  {item.entries?.length || 0} thoughts
                </Text>
              </View>
              {expandedDates[item.date] ? (
                <View style={styles.pastEntries}>
                  {(item.entries || []).map(
                    (entry, i) => 
                      renderEntry(entry, i)
                  )}
                </View>
              ) : null}
            </Pressable>
          )}
          ListFooterComponent={
            isLoadingMore 
              ? <ActivityIndicator 
                  style={{ padding: 16 }} /> 
              : null
          }
          ListEmptyComponent={null}
          contentContainerStyle={{ 
            paddingBottom: 24 
          }}
        />
      </View>
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
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
  section: {
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  memoryCard: {
    width: 200,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
  },
  memoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  memoryContent: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  memoryDate: {
    fontSize: 10,
    color: '#B45309',
    marginTop: 6,
  },
  entriesList: {
    paddingHorizontal: 16,
  },
  emptyToday: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyTodayText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  entryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  entryCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  entryCircleOwn: { backgroundColor: '#4F46B8' },
  entryCirclePartner: { 
    backgroundColor: '#F9A8D4' 
  },
  entryInitial: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  entryBody: { flex: 1 },
  entryContent: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  entryTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  inputWrap: {
    margin: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
  },
  entryInput: {
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  entryCounter: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  addBtn: {
    backgroundColor: '#4F46B8',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  pastHeader: {
    paddingTop: 16,
  },
  pastCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  pastCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pastCardDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  pastCardCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  pastEntries: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});
