import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  addBucketItem,
  celebrateBucketItem,
  deleteBucketItem,
  getBucketList,
  toggleBucketItem,
} from '../services/api';

export default function BucketListScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useContext(AuthContext);

  const [items, setItems] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newNote, setNewNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadBucketList = async () => {
    try {
      const res = await getBucketList();
      setItems(res?.items || []);
    } catch (err) {
      Alert.alert('Could not load bucket list.');
    }
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await loadBucketList();
      setIsLoading(false);
    })();
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadBucketList();
    setIsRefreshing(false);
  };

  const onAdd = async () => {
    const trimmed = newTitle.trim();
    if (!trimmed || isAdding) return;
    setIsAdding(true);
    try {
      const res = await addBucketItem({
        title: trimmed,
        note: newNote.trim() || undefined,
      });
      setItems(prev => [res.item, ...prev]);
      setNewTitle('');
      setNewNote('');
      setShowAddNote(false);
    } catch (err) {
      Alert.alert('Could not add item.');
    } finally {
      setIsAdding(false);
    }
  };

  const onToggle = async (item) => {
    // Optimistic update
    setItems(prev => prev.map(i =>
      i._id === item._id 
        ? { ...i, isDone: !i.isDone, completedBy: !i.isDone ? user : null, completedAt: !i.isDone ? new Date() : null } 
        : i
    ));
    
    try {
      await toggleBucketItem(item._id);
      
      // If marking as done, ask to celebrate
      if (!item.isDone) {
        setTimeout(() => {
          Alert.alert(
            '🎉 You did it!',
            `Add "${item.title}" to your timeline?`,
            [
              { text: 'Not now', style: 'cancel' },
              { 
                text: 'Yes, celebrate! 🎉',
                onPress: async () => {
                  try {
                    await celebrateBucketItem(item._id);
                  } catch (err) {
                    Alert.alert('Could not post to timeline.');
                  }
                }
              }
            ]
          );
        }, 300);
      }
    } catch (err) {
      // Revert on error
      setItems(prev => prev.map(i =>
        i._id === item._id 
          ? { ...i, isDone: item.isDone, completedBy: item.completedBy, completedAt: item.completedAt } 
          : i
      ));
      Alert.alert('Could not update item.');
    }
  };

  const onDelete = (item) => {
    const isOwn = 
      item.createdBy?._id?.toString() === user?._id?.toString() ||
      item.createdBy?.toString() === user?._id?.toString();
    
    if (!isOwn) {
      Alert.alert('Permission Denied', 'Only the creator of this item can delete it.');
      return;
    }

    Alert.alert('Delete this item?', item.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBucketItem(item._id);
            setItems(prev => 
              prev.filter(i => i._id !== item._id)
            );
          } catch (err) {
            Alert.alert('Could not delete item.');
          }
        }
      }
    ]);
  };

  const todoItems = items.filter(i => !i.isDone);
  const doneItems = items.filter(i => i.isDone);

  const renderItemCard = (item) => {
    const isOwn = 
      item.createdBy?._id?.toString() === user?._id?.toString() ||
      item.createdBy?.toString() === user?._id?.toString();
    const creatorName = item.createdBy?.displayName || 'Partner';

    return (
      <Pressable
        key={item._id}
        style={[styles.itemCard, { borderBottomColor: theme.borderLight }, item.isDone && styles.itemCardDone]}
        onLongPress={() => onDelete(item)}
      >
        <Pressable onPress={() => onToggle(item)} style={styles.checkboxWrap}>
          <View style={[styles.checkbox, { borderColor: theme.accent, backgroundColor: theme.bgCard }, item.isDone && { backgroundColor: theme.success, borderColor: theme.success }]}>
            {item.isDone && <Text style={styles.checkIcon}>✓</Text>}
          </View>
        </Pressable>
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, { color: theme.textPrimary }, item.isDone && [styles.itemTitleDone, { color: theme.textSecondary }]]}>
            {item.title}
          </Text>
          {item.note ? (
            <Text style={[styles.itemNote, { color: theme.textSecondary }, item.isDone && styles.itemNoteDone]}>
              {item.note}
            </Text>
          ) : null}
          <Text style={[styles.itemMeta, { color: theme.textMuted }]}>
            Created by {isOwn ? 'you' : creatorName}
            {item.isDone && item.completedBy ? ` • Done by ${item.completedBy?._id === user?._id ? 'you' : (item.completedBy?.displayName || 'Partner')}` : ''}
          </Text>
        </View>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.header }]}>
        <View style={[styles.header, { backgroundColor: theme.header }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={[styles.backArrow, { color: theme.headerText }]}>‹ Back</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.headerText }]}>Bucket List</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={[styles.contentCard, { backgroundColor: theme.bgPrimary }]}>
          <View style={[styles.center, { backgroundColor: theme.bgPrimary }]}>
            <ActivityIndicator color={theme.accent} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const ListHeader = (
    <View style={[styles.addSection, { borderBottomColor: theme.border }]}>
      <View style={styles.inputRow}>
        <TextInput
          value={newTitle}
          onChangeText={setNewTitle}
          placeholder="Add to bucket list..."
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary }]}
          maxLength={100}
        />
        <Pressable
          onPress={() => setShowAddNote(v => !v)}
          style={styles.noteToggleBtn}
        >
          <Text style={[styles.noteToggleText, { color: theme.accent }]}>
            {showAddNote ? 'Hide Note' : '+ Note'}
          </Text>
        </Pressable>
        <Pressable
          onPress={onAdd}
          disabled={!newTitle.trim() || isAdding}
          style={[
            styles.addBtn,
            { backgroundColor: theme.accent },
            (!newTitle.trim() || isAdding) && { opacity: 0.5 }
          ]}
        >
          {isAdding ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={[styles.addBtnText, { color: theme.accentText }]}>Add</Text>
          )}
        </Pressable>
      </View>
      {showAddNote && (
        <TextInput
          value={newNote}
          onChangeText={setNewNote}
          placeholder="Add a note (optional)..."
          placeholderTextColor={theme.textMuted}
          style={[styles.input, styles.noteInput, { backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary }]}
          maxLength={300}
          multiline
        />
      )}
    </View>
  );

  const ListFooter = (
    <View>
      {doneItems.length > 0 ? (
        <View style={styles.doneSection}>
          <Pressable
            onPress={() => setShowDone(v => !v)}
            style={[styles.doneToggleHeader, { backgroundColor: theme.bgSecondary }]}
          >
            <Text style={[styles.doneToggleTitle, { color: theme.textSecondary }]}>
              {showDone ? '▼' : '▶'} Completed ({doneItems.length})
            </Text>
          </Pressable>
          {showDone && (
            <View style={[styles.doneList, { backgroundColor: theme.bgPrimary }]}>
              {doneItems.map(item => renderItemCard(item))}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.header }]}>
      <View style={[styles.header, { backgroundColor: theme.header }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backArrow, { color: theme.headerText }]}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.headerText }]}>Bucket List</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={[styles.contentCard, { backgroundColor: theme.bgPrimary }]}>
        <FlatList
          data={todoItems}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => renderItemCard(item)}
          ListEmptyComponent={
            todoItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🪣</Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Your bucket list is empty.{'\n'}
                  Add something you want to do together.
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={[styles.listContainer, { backgroundColor: theme.bgPrimary }]}
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
    paddingBottom: 40,
  },
  addSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
  },
  noteToggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  noteToggleText: {
    color: '#4F46B8',
    fontSize: 12,
    fontWeight: '700',
  },
  addBtn: {
    backgroundColor: '#4F46B8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  noteInput: {
    marginTop: 8,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  itemCard: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'flex-start',
  },
  itemCardDone: {
    opacity: 0.6,
  },
  checkboxWrap: {
    paddingRight: 12,
    paddingVertical: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4F46B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 20,
  },
  itemTitleDone: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  itemNote: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 4,
    lineHeight: 18,
  },
  itemNoteDone: {
    textDecorationLine: 'line-through',
  },
  itemMeta: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
  },
  doneSection: {
    marginTop: 16,
  },
  doneToggleHeader: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  doneToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  doneList: {
    backgroundColor: '#FAFBFB',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
    lineHeight: 20,
  },
});
