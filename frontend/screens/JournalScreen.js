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
  getTodayJournal,
  getTodayCheckIn,
  answerCheckIn,
  setCustomQuestion,
  getCheckInHistory
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

  // Daily check-in states
  const [checkIn, setCheckIn] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const [checkInHistory, setCheckInHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

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

  const loadCheckIn = async () => {
    try {
      const res = await getTodayCheckIn();
      setCheckIn(res?.checkIn || null);
    } catch (err) {}
  };

  const loadHistory = async (page = 1, replace = false) => {
    try {
      const res = await getCheckInHistory(page);
      const items = Array.isArray(res?.history)
        ? res.history : [];
      setHistoryTotalPages(
        res?.pagination?.totalPages || 1
      );
      setHistoryPage(page);
      setCheckInHistory(prev => 
        replace ? items : [...prev, ...items]
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
        loadCheckIn(),
        loadHistory(1, true),
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
      loadCheckIn(),
      loadHistory(1, true),
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

  const onSubmitAnswer = async () => {
    const trimmed = answerText.trim();
    if (!trimmed || isAnswering) return;
    setIsAnswering(true);
    try {
      const res = await answerCheckIn(trimmed);
      setCheckIn(res?.checkIn || null);
      setAnswerText('');
    } catch (err) {
      const code = err?.error;
      if (code === 'ALREADY_ANSWERED') {
        Alert.alert(
          'Already answered',
          'You already answered today\'s question.'
        );
      } else {
        Alert.alert('Could not submit answer.');
      }
    } finally {
      setIsAnswering(false);
    }
  };

  const onSubmitCustom = async () => {
    const trimmed = customQuestion.trim();
    if (!trimmed) return;
    try {
      const res = await setCustomQuestion(trimmed);
      setCheckIn(res?.checkIn || null);
      setCustomQuestion('');
      setShowCustomInput(false);
    } catch (err) {
      const code = err?.error;
      if (code === 'ALREADY_ANSWERED') {
        Alert.alert(
          'Too late',
          'Cannot change the question after someone has answered.'
        );
      } else {
        Alert.alert('Could not set custom question.');
      }
    }
  };

  const hasAnswered = checkIn?.answers?.some(
    a => a.authorId?._id?.toString() === 
      user?._id?.toString()
    || a.authorId?.toString() === 
      user?._id?.toString()
  );

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
      {/* Daily question */}
      {checkIn ? (
        <View style={styles.questionSection}>
          {/* Question card */}
          <View style={styles.questionCard}>
            <View style={styles.questionTopRow}>
              <Text style={styles.questionLabel}>
                💬 Today's Question
              </Text>
              {checkIn.isCustom ? (
                <Text style={styles.customBadge}>
                  Custom
                </Text>
              ) : null}
            </View>
            <Text style={styles.questionText}>
              {checkIn.question}
            </Text>
          </View>

          {/* Answers */}
          {checkIn.answers?.length > 0 ? (
            <View style={styles.answersWrap}>
              {checkIn.answers.map((answer, i) => {
                const isOwn = 
                  answer.authorId?._id?.toString() 
                    === user?._id?.toString()
                  || answer.authorId?.toString() 
                    === user?._id?.toString();
                const initial = 
                  answer.authorId?.displayName
                    ?.[0]?.toUpperCase() || '?';
                return (
                  <View key={i} style={styles.answerRow}>
                    <View style={[
                      styles.answerCircle,
                      isOwn 
                        ? styles.entryCircleOwn 
                        : styles.entryCirclePartner,
                    ]}>
                      <Text style={styles.entryInitial}>
                        {initial}
                      </Text>
                    </View>
                    <View style={styles.answerBody}>
                      <Text style={styles.answerContent}>
                        {answer.content}
                      </Text>
                      <Text style={styles.answerTime}>
                        {dayjs(answer.createdAt)
                          .format('h:mm A')}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Answer input — only if not answered */}
          {!hasAnswered ? (
            <View style={styles.answerInputWrap}>
              <TextInput
                value={answerText}
                onChangeText={setAnswerText}
                placeholder="Your answer..."
                multiline
                maxLength={1000}
                style={styles.answerInput}
                editable={!isAnswering}
              />
              <Pressable
                onPress={onSubmitAnswer}
                disabled={
                  !answerText.trim() || isAnswering
                }
                style={[
                  styles.answerBtn,
                  (!answerText.trim() || isAnswering) 
                    && { opacity: 0.5 }
                ]}
              >
                {isAnswering
                  ? <ActivityIndicator 
                      color="#fff" size="small" />
                  : <Text style={styles.answerBtnText}>
                      Answer
                    </Text>
                }
              </Pressable>
            </View>
          ) : (
            <Text style={styles.answeredLabel}>
              ✓ You answered today
            </Text>
          )}

          {/* Custom question toggle */}
          {!hasAnswered ? (
            <Pressable
              onPress={() => 
                setShowCustomInput(v => !v)
              }
              style={styles.customToggle}
            >
              <Text style={styles.customToggleText}>
                {showCustomInput 
                  ? 'Cancel' 
                  : '✏️ Set a custom question instead'
                }
              </Text>
            </Pressable>
          ) : null}

          {/* Custom question input */}
          {showCustomInput ? (
            <View style={styles.customInputWrap}>
              <TextInput
                value={customQuestion}
                onChangeText={setCustomQuestion}
                placeholder="Write your question..."
                maxLength={200}
                style={styles.customInput}
              />
              <Pressable
                onPress={onSubmitCustom}
                disabled={customQuestion.trim().length < 5}
                style={[
                  styles.customBtn,
                  customQuestion.trim().length < 5 
                    && { opacity: 0.5 }
                ]}
              >
                <Text style={styles.customBtnText}>
                  Set
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

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
            <View>
              {isLoadingMore 
                ? <ActivityIndicator 
                    style={{ padding: 16 }} /> 
                : null
              }
              
              {/* Check-in history */}
              {checkInHistory.length > 0 ? (
                <View style={styles.pastHeader}>
                  <Text style={styles.sectionTitle}>
                    Past questions
                  </Text>
                  {checkInHistory.map((item, i) => (
                    <Pressable
                      key={item.date}
                      style={styles.pastCard}
                      onPress={() => 
                        toggleExpand('ci_' + item.date)
                      }
                    >
                      <View style={styles.pastCardTop}>
                        <Text style={styles.pastCardDate}
                          numberOfLines={1}>
                          {item.question}
                        </Text>
                        <Text style={styles.pastCardCount}>
                          {item.answers?.length || 0} answers
                        </Text>
                      </View>
                      {expandedDates['ci_' + item.date] ? (
                        <View style={styles.pastEntries}>
                          {(item.answers || []).map(
                            (a, ai) => {
                              const isOwn = 
                                a.authorId?._id?.toString() 
                                  === user?._id?.toString()
                                || a.authorId?.toString() 
                                  === user?._id?.toString();
                              const initial = 
                                a.authorId?.displayName
                                  ?.[0]?.toUpperCase() || '?';
                              return (
                                <View key={ai} 
                                  style={styles.answerRow}>
                                  <View style={[
                                    styles.answerCircle,
                                    isOwn 
                                      ? styles.entryCircleOwn 
                                      : styles.entryCirclePartner,
                                  ]}>
                                    <Text style={
                                      styles.entryInitial
                                    }>
                                      {initial}
                                    </Text>
                                  </View>
                                  <View style={styles.answerBody}>
                                    <Text style={
                                      styles.answerContent
                                    }>
                                      {a.content}
                                    </Text>
                                  </View>
                                </View>
                              );
                            }
                          )}
                        </View>
                      ) : null}
                    </Pressable>
                  ))}
                  {historyPage < historyTotalPages ? (
                    <Pressable
                      onPress={() => 
                        loadHistory(historyPage + 1, false)
                      }
                      style={{ 
                        padding: 14, alignItems: 'center' 
                      }}
                    >
                      <Text style={{ 
                        color: '#4F46B8', 
                        fontWeight: '700' 
                      }}>
                        Load more
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              
              <View style={{ height: 24 }} />
            </View>
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
  questionSection: {
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingHorizontal: 16,
  },
  questionCard: {
    backgroundColor: '#F0EFFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  questionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46B8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  customBadge: {
    fontSize: 10,
    color: '#C2185B',
    fontWeight: '700',
    backgroundColor: '#FFF0F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    lineHeight: 22,
  },
  answersWrap: {
    marginBottom: 10,
    gap: 8,
  },
  answerRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  answerCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  answerBody: { flex: 1 },
  answerContent: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  answerTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 3,
  },
  answerInputWrap: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  answerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 10,
    fontSize: 14,
    color: '#111827',
    maxHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#F9FAFB',
  },
  answerBtn: {
    backgroundColor: '#4F46B8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  answeredLabel: {
    fontSize: 12,
    color: '#4F46B8',
    fontWeight: '700',
    marginBottom: 8,
  },
  customToggle: {
    paddingVertical: 6,
  },
  customToggleText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  customInputWrap: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  customBtn: {
    backgroundColor: '#C2185B',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  customBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
