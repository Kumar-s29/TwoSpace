import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { deletePost, editPost } from '../services/api';

dayjs.extend(relativeTime);

const REACTIONS = ['❤️', '🥹', '😂', '🔥', '🫂'];

export default function PostCard({
  post,
  isOwn,
  onDelete,
  onEdit,
  reactions,
  currentUserId,
  onReact,
}) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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

  // Safe — reactions can be undefined, null, or {}
  const safeReactions =
    reactions && typeof reactions === 'object' && !Array.isArray(reactions)
      ? reactions
      : {};
  const reactionEntries = Object.entries(safeReactions);

  // canEdit: post is editable if under 15 min old and is your own post
  const createdAtMs = post?.createdAt ? new Date(post.createdAt).getTime() : 0;
  const ageMs = Date.now() - createdAtMs;
  const canEdit = isOwn && !isNaN(createdAtMs) && createdAtMs > 0 && ageMs < 15 * 60 * 1000;

  const onLongPress = () => {
    if (isOwn) {
      // Build options array for own post
      const buttons = [];

      // React option (you can react to your own post via Alert, even if API blocks it)
      buttons.push({
        text: 'React',
        onPress: () => setShowReactionPicker(true),
      });

      // Edit — only if within 15-minute window
      if (canEdit) {
        buttons.push({
          text: 'Edit',
          onPress: () => {
            setEditText(post?.content || '');
            setIsEditing(true);
          },
        });
      }

      // Delete
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

      // Cancel — must be last, style 'cancel' required for Android sheet
      buttons.push({ text: 'Cancel', style: 'cancel' });

      Alert.alert('Post options', null, buttons);
    } else {
      // Partner post — show reaction picker directly
      setShowReactionPicker(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    setIsSavingEdit(true);
    try {
      await editPost(post._id, editText.trim());
      setIsEditing(false);
      if (typeof onEdit === 'function') onEdit(post._id, editText.trim());
    } catch (err) {
      const code = err?.error;
      setIsEditing(false);
      if (code === 'EDIT_WINDOW_EXPIRED') {
        Alert.alert('Edit window closed', 'Posts can only be edited within 15 minutes.');
      } else {
        Alert.alert('Could not save edit.');
      }
    } finally {
      setIsSavingEdit(false);
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
            {/* Content or inline edit */}
            {isEditing ? (
              <View style={styles.editWrap}>
                <TextInput
                  value={editText}
                  onChangeText={setEditText}
                  multiline
                  autoFocus
                  style={styles.editInput}
                  maxLength={2000}
                />
                <View style={styles.editActions}>
                  <Pressable
                    onPress={() => setIsEditing(false)}
                    style={styles.editCancel}
                  >
                    <Text style={styles.editCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSaveEdit}
                    disabled={!editText.trim() || isSavingEdit}
                    style={[
                      styles.editSave,
                      (!editText.trim() || isSavingEdit) && { opacity: 0.5 },
                    ]}
                  >
                    {isSavingEdit ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.editSaveText}>Save</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                {post?.content ? (
                  <Text style={styles.content}>{post.content}</Text>
                ) : null}
                {post?.isEdited ? (
                  <Text style={styles.editedLabel}>edited</Text>
                ) : null}
              </>
            )}

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

            {/* Reaction bubbles — shown when reactions exist */}
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
  // Edit mode
  editWrap: {
    width: '100%',
  },
  editInput: {
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#F9FAFB',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  editCancel: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  editCancelText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },
  editSave: {
    backgroundColor: '#4F46B8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  editSaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
