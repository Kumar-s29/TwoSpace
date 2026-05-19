import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { io } from 'socket.io-client';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthContext } from '../context/AuthContext';
import { getMyRoom, getTimeline } from '../services/api';
import PostCard from '../components/PostCard';
import LockedWishCard from '../components/LockedWishCard';

export default function TimelineScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const roomId = user?.roomId || null;

  const [partnerName, setPartnerName] = useState('');

  const [posts, setPosts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorText, setErrorText] = useState('');

  const [fabOpen, setFabOpen] = useState(false);

  const flatListRef = useRef(null);
  const didScrollToEndRef = useRef(false);
  const socketRef = useRef(null);

  const canLoadMore = useMemo(
    () => !isLoadingMore && currentPage < totalPages,
    [currentPage, totalPages, isLoadingMore]
  );

  const scrollToBottomOnce = () => {
    if (didScrollToEndRef.current) return;
    if (!flatListRef.current) return;
    if (!posts || posts.length === 0) return;
    didScrollToEndRef.current = true;
    requestAnimationFrame(() => {
      try {
        flatListRef.current.scrollToEnd({ animated: false });
      } catch (e) {}
    });
  };

  const fetchRoom = async () => {
    try {
      const res = await getMyRoom();
      if (res?.room?.partner?.displayName) setPartnerName(res.room.partner.displayName);
    } catch (err) {
      // ignore; timeline can still load
    }
  };

  const fetchPage = async (page, { replace } = { replace: false }) => {
    const res = await getTimeline(page);
    const newPosts = Array.isArray(res?.posts) ? res.posts : [];
    const pagination = res?.pagination || {};
    const nextTotalPages = pagination.totalPages || 1;
    const nextPage = pagination.page || page;

    setTotalPages(nextTotalPages);
    setCurrentPage(nextPage);
    setPosts((prev) => (replace ? newPosts : [...prev, ...newPosts]));
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      setIsLoading(true);
      setErrorText('');
      didScrollToEndRef.current = false;

      try {
        await Promise.all([fetchRoom(), fetchPage(1, { replace: true })]);
        if (!isMounted) return;
        scrollToBottomOnce();
      } catch (err) {
        if (!isMounted) return;
        setErrorText('Could not load timeline.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!roomId) return;

    const base = (process.env.EXPO_PUBLIC_API_URL || '').replace('/api', '');
    const socket = io(base, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('new_post', (payload) => {
      try {
        if (!payload || payload.roomId !== roomId) return;
        if (!payload.post) return;
        setPosts((prev) => [...prev, payload.post]);
        requestAnimationFrame(() => {
          try {
            flatListRef.current?.scrollToEnd({ animated: true });
          } catch (e) {}
        });
      } catch (e) {}
    });

    socket.on('wish_unlocked', (payload) => {
      try {
        if (!payload || payload.roomId !== roomId) return;
        const postId = payload.postId;
        if (!postId) return;
        setPosts((prev) =>
          prev.map((p) => (p._id === postId ? { ...p, isSealed: false } : p))
        );
        Toast.show({
          type: 'info',
          text1: 'A wish just unlocked!',
          text2: 'Pull down to refresh.',
        });
      } catch (e) {}
    });

    socket.on('capsule_opened', (payload) => {
      try {
        if (!payload || payload.roomId !== roomId) return;
        Toast.show({
          type: 'success',
          text1: '🎉 A capsule just opened!',
          text2: 'Tap Capsules to see your memories.',
        });
      } catch (e) {}
    });

    return () => {
      try {
        socket.disconnect();
      } catch (e) {}
      socketRef.current = null;
    };
  }, [roomId]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    setErrorText('');
    didScrollToEndRef.current = false;
    try {
      await fetchRoom();
      await fetchPage(1, { replace: true });
      scrollToBottomOnce();
    } catch (err) {
      setErrorText('Could not refresh timeline.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const onEndReached = async () => {
    if (!canLoadMore) return;
    setIsLoadingMore(true);
    setErrorText('');
    try {
      await fetchPage(currentPage + 1, { replace: false });
    } catch (err) {
      // keep existing posts; show small error
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleDelete = (postId) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  const renderItem = ({ item }) => {
    const isOwn =
      item?.authorId != null &&
      user?._id != null &&
      item.authorId.toString() === user._id.toString();
    if (item?.type === 'timed-wish' && item?.isSealed === true) {
      return <LockedWishCard post={item} isOwn={isOwn} />;
    }
    return <PostCard post={item} isOwn={isOwn} onDelete={handleDelete} />;
  };

  const Header = () => (
    <View>
      <View style={styles.header}>
        <Text style={styles.headerLeft}>TwoSpace</Text>
        <View style={styles.headerRight}>
          <Pressable onPress={() => navigation.navigate('Settings')} style={styles.gearButton}>
            <Text style={styles.gear}>⚙</Text>
          </Pressable>
          <View style={styles.partnerWrap}>
            <Text style={styles.partnerName} numberOfLines={1}>
              {partnerName || ''}
            </Text>
            <Text style={styles.dot}>●</Text>
          </View>
        </View>
      </View>
      <View style={styles.divider} />
    </View>
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

  if (errorText && posts.length === 0) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{errorText}</Text>
          <Pressable onPress={onRefresh} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Header />

      {posts.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIllustration}>✨</Text>
          <Text style={styles.emptyText}>
            Your shared space is ready.{'\n'}Add your first thought.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={posts}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          style={{ backgroundColor: '#FFFFFF' }}
          contentContainerStyle={{ backgroundColor: '#FFFFFF', paddingBottom: 80 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator />
              </View>
            ) : null
          }
        />
      )}

      <Pressable style={styles.fab} onPress={() => setFabOpen(true)}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <Modal
        transparent
        visible={fabOpen}
        animationType="slide"
        onRequestClose={() => setFabOpen(false)}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFabOpen(false)} />
          <View style={styles.sheet}>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                setFabOpen(false);
                navigation.navigate('NewPost');
              }}
            >
              <Text style={styles.sheetText}>Post a Thought</Text>
            </Pressable>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                setFabOpen(false);
                navigation.navigate('Wish');
              }}
            >
              <Text style={styles.sheetText}>Send Timed Wish</Text>
            </Pressable>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                setFabOpen(false);
                navigation.navigate('Capsules');
              }}
            >
              <Text style={styles.sheetText}>View Capsules 📦</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4F46B8',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gearButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  gear: {
    fontSize: 18,
  },
  partnerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 180,
  },
  partnerName: {
    color: '#111827',
    fontWeight: '700',
  },
  dot: {
    color: '#22C55E',
    fontSize: 12,
  },
  divider: {
    height: 2,
    backgroundColor: '#4F46B8',
    opacity: 0.25,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  emptyIllustration: {
    fontSize: 40,
    marginBottom: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 16,
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
  footerLoading: {
    paddingVertical: 16,
  },
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
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sheetItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  sheetText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
});
