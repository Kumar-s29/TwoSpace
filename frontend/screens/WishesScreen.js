import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';

import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getWishes } from '../services/api';
import LockedWishCard from '../components/LockedWishCard';

export default function WishesScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { theme } = useTheme();
  const roomId = user?.roomId || null;

  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'sent'
  const [wishes, setWishes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorText, setErrorText] = useState('');

  const socketRef = useRef(null);

  const fetchWishes = useCallback(async () => {
    setErrorText('');
    try {
      const res = await getWishes();
      const allPosts = Array.isArray(res?.posts) ? res.posts : [];
      setWishes(allPosts);
    } catch (err) {
      setErrorText('Could not load wishes.');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setIsLoading(true);
      try {
        await fetchWishes();
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [fetchWishes]);

  useEffect(() => {
    if (!roomId) return;
    const base = (process.env.EXPO_PUBLIC_API_URL || '').replace('/api', '');
    const socket = io(base, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('wish_unlocked', (payload) => {
      try {
        if (!payload || payload.roomId !== roomId) return;
        const postId = payload.postId;
        if (!postId) return;
        setWishes((prev) =>
          prev.map((w) => (w._id === postId ? { ...w, isSealed: false } : w))
        );
      } catch (e) {}
    });

    socket.on('new_post', (payload) => {
      try {
        if (!payload || payload.roomId !== roomId) return;
        if (!payload.post || payload.post.type !== 'timed-wish') return;
        setWishes((prev) => [payload.post, ...prev]);
      } catch (e) {}
    });

    return () => {
      try { socket.disconnect(); } catch (e) {}
      socketRef.current = null;
    };
  }, [roomId]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchWishes();
    setIsRefreshing(false);
  };

  const received = wishes.filter(
    (w) => w?.authorId != null && user?._id != null &&
      w.authorId.toString() !== user._id.toString()
  );
  const sent = wishes.filter(
    (w) => w?.authorId != null && user?._id != null &&
      w.authorId.toString() === user._id.toString()
  );

  const displayList = activeTab === 'received' ? received : sent;
  const isOwn = activeTab === 'sent';

  const renderWishItem = ({ item }) => {
    if (item?.isSealed === true) {
      return <LockedWishCard post={item} isOwn={isOwn} />;
    }

    // Unlocked wish card
    const initial = isOwn
      ? (user?.displayName?.[0] || 'Y').toUpperCase()
      : (item?.authorName?.[0] || 'P').toUpperCase();
    const circleStyle = isOwn
      ? [styles.circlePurple, { backgroundColor: theme.accent }]
      : [styles.circlePink, { backgroundColor: theme.pink }];
    const label =
      typeof item?.label === 'string' && item.label.trim().length > 0
        ? item.label.trim()
        : null;

    return (
      <View style={[styles.unlockedCard, { backgroundColor: theme.accentLight, borderColor: theme.border, borderWidth: 1 }]}>
        <View style={styles.unlockedTop}>
          <Text style={styles.envelopeIcon}>💌</Text>
          {label ? <Text style={[styles.wishLabel, { color: theme.accent }]}>{label}</Text> : null}
        </View>
        <Text style={[styles.wishContent, { color: theme.textPrimary }]}>{item?.content || ''}</Text>
        <View style={styles.unlockedBottom}>
          <View style={[styles.authorCircle, circleStyle]}>
            <Text style={styles.authorInitial}>{initial}</Text>
          </View>
          {item?.unlocksAt ? (
            <Text style={[styles.openedDate, { color: theme.textMuted }]}>
              Opened on {dayjs(item.unlocksAt).format('MMM D, YYYY')}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  const EmptyReceived = () => (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyIcon}>⏰</Text>
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        No wishes received yet.{'\n'}Send one first and they might return the favour.
      </Text>
    </View>
  );

  const EmptySent = () => (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyIcon}>✨</Text>
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        No wishes sent yet.{'\n'}Tap + to send your first timed wish.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.header }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.header }]}>
        <Text style={styles.headerTitle}>Wishes</Text>
      </View>

      {/* White card content */}
      <View style={[styles.contentCard, { backgroundColor: theme.bgPrimary }]}>
        {/* Toggle tabs */}
        <View style={[styles.tabRow, { borderBottomColor: theme.border }]}>
          <Pressable
            style={[styles.tabItem, activeTab === 'received' && [styles.tabItemActive, { borderBottomColor: theme.accent }]]}
            onPress={() => setActiveTab('received')}
          >
            <Text style={[styles.tabLabel, { color: theme.textMuted }, activeTab === 'received' && [styles.tabLabelActive, { color: theme.accent }]]}>
              Received
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabItem, activeTab === 'sent' && [styles.tabItemActive, { borderBottomColor: theme.accent }]]}
            onPress={() => setActiveTab('sent')}
          >
            <Text style={[styles.tabLabel, { color: theme.textMuted }, activeTab === 'sent' && [styles.tabLabelActive, { color: theme.accent }]]}>
              Sent
            </Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={[styles.center, { backgroundColor: theme.bgPrimary }]}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : errorText ? (
          <View style={[styles.center, { backgroundColor: theme.bgPrimary }]}>
            <Text style={[styles.errorText, { color: theme.textSecondary }]}>{errorText}</Text>
            <Pressable onPress={onRefresh} style={[styles.retryButton, { borderColor: theme.accent }]}>
              <Text style={[styles.retryText, { color: theme.accent }]}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={displayList}
            keyExtractor={(item) => item._id}
            renderItem={renderWishItem}
            contentContainerStyle={
              displayList.length === 0
                ? [styles.emptyListContainer, { backgroundColor: theme.bgPrimary }]
                : [styles.listContainer, { backgroundColor: theme.bgPrimary }]
            }
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              activeTab === 'received' ? <EmptyReceived /> : <EmptySent />
            }
          />
        )}
      </View>

      {/* FAB */}
      <Pressable
        style={[styles.fab, { backgroundColor: theme.accent, shadowColor: theme.shadow }]}
        onPress={() => navigation.navigate('Wish')}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
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
    backgroundColor: '#4F46B8',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  contentCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#4F46B8',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabLabelActive: {
    color: '#4F46B8',
    fontWeight: '800',
  },
  listContainer: {
    paddingVertical: 10,
    paddingBottom: 100,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyBox: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 15,
    lineHeight: 22,
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
  // Unlocked wish card
  unlockedCard: {
    backgroundColor: '#F0EFFC',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  unlockedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  envelopeIcon: {
    fontSize: 18,
  },
  wishLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46B8',
  },
  wishContent: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
    marginBottom: 12,
  },
  unlockedBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circlePurple: {
    backgroundColor: '#4F46B8',
  },
  circlePink: {
    backgroundColor: '#EC4899',
  },
  authorInitial: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  openedDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  // FAB
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 22,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46B8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    marginTop: -2,
  },
});
