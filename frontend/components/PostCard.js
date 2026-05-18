import React from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { deletePost } from '../services/api';

dayjs.extend(relativeTime);

export default function PostCard({ post, isOwn, onDelete }) {
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

  const onLongPress = () => {
    if (!isOwn) return;

    Alert.alert('Post options', undefined, [
      {
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
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
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
          <Text style={styles.content}>{post?.content}</Text>

          {post?.mediaUrl ? (
            <Image
              source={{ uri: post.mediaUrl }}
              style={styles.postImage}
              resizeMode="cover"
            />
          ) : null}

          {moodMeta ? (
            <View style={[styles.moodBadge, { backgroundColor: moodMeta.bg }]}>
              <Text style={styles.moodText}>{moodMeta.text}</Text>
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
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  wrapperOwn: {
    marginLeft: 48,
  },
  wrapperPartner: {
    marginRight: 48,
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
  postImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    marginTop: 10,
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
});
