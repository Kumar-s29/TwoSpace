import React, { useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { deletePost, pinPost } from '../services/api';

dayjs.extend(relativeTime);

const REACTIONS = ['❤️', '🥹', '😂', '🔥', '🫂'];

export default function PostCard({
  post,
  isOwn,
  onDelete,
  onEdit,
  onEditRequest,
  onPin,
  reactions,
  currentUserId,
  onReact,
}) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const initial =
    typeof post?.authorName === 'string' && post.authorName.length > 0
      ? post.authorName.trim()[0].toUpperCase()
      : '?';

  const mood = post?.moodTag;
  const moodMeta =
    mood === 'good'
      ? { bg: '#D1FAE5', text: '🌤 Good' }
      : mood === 'okay'
        ? { bg: '#FEF3C7', text: '⛅ Okay' }
        : mood === 'low'
          ? { bg: '#DBEAFE', text: '🌧 Low' }
          : null;

  const safeReactions =
    reactions && typeof reactions === 'object' && !Array.isArray(reactions)
      ? reactions
      : {};
  const reactionEntries = Object.entries(safeReactions);

  const createdAtMs = post?.createdAt ? new Date(post.createdAt).getTime() : 0;
  const ageMs = Date.now() - createdAtMs;
  const canEdit = isOwn && !isNaN(createdAtMs) && createdAtMs > 0 && ageMs < 15 * 60 * 1000;

  const onLongPress = () => {
    if (isOwn) {
      const buttons = [];
      buttons.push({
        text: 'React',
        onPress: () => setShowReactionPicker(true),
      });

      if (canEdit) {
        buttons.push({
          text: 'Edit',
          onPress: () => {
            // Allow native alert dismissal animation to complete.
            setTimeout(() => {
              if (typeof onEditRequest === 'function') {
                onEditRequest(post);
              }
            }, 300);
          },
        });
      }

      buttons.push({
        text: post?.isPinned ? 'Unpin' : 'Pin',
        onPress: async () => {
          try {
            const res = await pinPost(post._id);
            if (typeof onPin === 'function') {
              onPin(post._id, res.isPinned);
            }
          } catch (err) {
            const code = err?.error;
            if (code === 'PIN_LIMIT') {
              Alert.alert('Pin limit reached', 'You can only pin up to 5 posts.');
            } else {
              Alert.alert('Could not pin post.');
            }
          }
        },
      });

      buttons.push({
        text: 'Delete Post',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(post._id);
            if (typeof onDelete === 'function') onDelete(post._id);
          } catch (err) {
            Alert.alert('Could not delete post.');
          }
        },
      });

      buttons.push({ text: 'Cancel', style: 'cancel' });
      Alert.alert('Post options', null, buttons);
    } else {
      Alert.alert('Post options', null, [
        {
          text: 'React',
          onPress: () => setShowReactionPicker(true),
        },
        {
          text: post?.isPinned ? 'Unpin' : 'Pin ⭐',
          onPress: async () => {
            try {
              const res = await pinPost(post._id);
              if (typeof onPin === 'function') {
                onPin(post._id, res.isPinned);
              }
            } catch (err) {
              const code = err?.error;
              if (code === 'PIN_LIMIT') {
                Alert.alert(
                  'Pin limit reached',
                  'Maximum 5 pinned posts allowed.'
                );
              } else {
                Alert.alert('Could not pin post.');
              }
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <>
      {/* Reaction picker modal */}
      <Modal
        transparent
        visible={showReactionPicker}
        animationType="fade"
        onRequestClose={() => setShowReactionPicker(false)}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setShowReactionPicker(false)}
        />
        <View style={styles.reactionPicker}>
          {REACTIONS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => {
                setShowReactionPicker(false);
                if (typeof onReact === 'function') onReact(post._id, emoji);
              }}
              style={styles.reactionBtn}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      </Modal>

      <Pressable
        onLongPress={onLongPress}
        delayLongPress={350}
        style={[
          styles.wrapper,
          isOwn ? styles.wrapperOwn : styles.wrapperPartner,
        ]}
      >
        <View style={styles.row}>
          {!isOwn ? (
            <View style={[styles.initialCircle, styles.partnerCircle]}>
              <Text style={styles.initialText}>{initial}</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            {post?.isPinned ? (
              <Text style={styles.pinLabel}>⭐ Pinned</Text>
            ) : null}

            {post?.content ? (
              <Text style={styles.content}>{post.content}</Text>
            ) : null}
            {post?.isEdited ? (
              <Text style={styles.editedLabel}>edited</Text>
            ) : null}

            {post?.mediaUrl ? (
              <Image
                source={{ uri: post.mediaUrl }}
                style={styles.postImage}
                resizeMode="cover"
              />
            ) : null}

            {post?.songUrl ? (
              <Pressable
                onPress={() => {
                  Linking.openURL(post.songUrl).catch(() => {
                    Alert.alert(
                      'Could not open link',
                      'Make sure Spotify or YouTube is installed.'
                    );
                  });
                }}
                style={styles.songCard}
              >
                <Text style={styles.songIcon}>🎵</Text>
                <View style={styles.songInfo}>
                  <Text style={styles.songTitle} numberOfLines={1}>
                    {post.songTitle || 'Music Link'}
                  </Text>
                  <Text style={styles.songSub} numberOfLines={1}>
                    Tap to open
                  </Text>
                </View>
                <Text style={styles.songArrow}>›</Text>
              </Pressable>
            ) : null}

            {moodMeta ? (
              <View style={[styles.moodBadge, { backgroundColor: moodMeta.bg }]}>
                <Text style={styles.moodText}>{moodMeta.text}</Text>
              </View>
            ) : null}

            {/* Reaction bubbles */}
            {reactionEntries.length > 0 ? (
              <View style={styles.reactionsRow}>
                {reactionEntries.map(([userId, emoji]) => (
                  <View
                    key={userId}
                    style={[
                      styles.reactionBubble,
                      userId === currentUserId ? styles.reactionBubbleOwn : null,
                    ]}
                  >
                    <Text style={styles.reactionBubbleText}>{emoji}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                {post?.createdAt ? dayjs(post.createdAt).fromNow() : ''}
              </Text>
              {post?.replyCount > 0 ? (
                <Pressable onPress={() => {}}>
                  <Text style={styles.metaLink}>{post.replyCount} replies</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {isOwn ? (
            <View style={[styles.initialCircle, styles.ownCircle]}>
              <Text style={styles.initialText}>{initial}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 0,
  },
  wrapperOwn: {
    marginLeft: 48,
    marginRight: 0,
  },
  wrapperPartner: {
    marginRight: 48,
    marginLeft: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  initialCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownCircle: {
    backgroundColor: '#4F46B8',
  },
  partnerCircle: {
    backgroundColor: '#F9A8D4',
  },
  initialText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  content: {
    color: '#111827',
    fontSize: 15,
    lineHeight: 20,
  },
  pinLabel: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '700',
    marginBottom: 4,
  },
  editedLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 2,
  },
  postImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    marginTop: 10,
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EFFC',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    gap: 10,
  },
  songIcon: {
    fontSize: 20,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46B8',
  },
  songSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  songArrow: {
    fontSize: 18,
    color: '#4F46B8',
    fontWeight: '700',
  },
  moodBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  moodText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  reactionBubble: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reactionBubbleOwn: {
    backgroundColor: '#F0EFFC',
    borderColor: '#4F46B8',
  },
  reactionBubbleText: {
    fontSize: 18,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  metaLink: {
    fontSize: 12,
    color: '#6B7280',
    textDecorationLine: 'underline',
  },
  // Reaction picker
  reactionPicker: {
    position: 'absolute',
    bottom: '50%',
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 8,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 100,
  },
  reactionBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  reactionEmoji: {
    fontSize: 26,
  },
});
