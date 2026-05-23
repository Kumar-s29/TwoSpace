import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createPost, uploadImage } from '../services/api';
import MoodPicker from '../components/MoodPicker';
import { useTheme } from '../context/ThemeContext';

export default function NewPostScreen({ navigation }) {
  const { theme } = useTheme();
  const [content, setContent] = useState('');
  const [moodTag, setMoodTag] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [mediaUrl, setMediaUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [songUrl, setSongUrl] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [showSongInput, setShowSongInput] = useState(false);

  const trimmed = content.trim();

  const extractSongTitle = (url) => {
    // Try to extract something readable from URL
    if (!url) return '';
    if (url.includes('spotify.com/track/')) {
      return 'Spotify Track';
    }
    if (url.includes('spotify.com/album/')) {
      return 'Spotify Album';
    }
    if (url.includes('spotify.com/playlist/')) {
      return 'Spotify Playlist';
    }
    if (url.includes('youtu.be/') || url.includes('youtube.com/')) {
      return 'YouTube Music';
    }
    return 'Music Link';
  };

  const canPost = useMemo(() => {
    if (isSubmitting) return false;
    if (trimmed.length > 0) return true;
    if (imageUri) return true;
    if (songUrl.trim()) return true;
    return false;
  }, [isSubmitting, trimmed, imageUri, songUrl]);

  const counterColor = content.length > 1800 ? '#DC2626' : '#9CA3AF';

  const onPickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      // ignore
    }
  };

  const onSubmit = async () => {
    if (!canPost) return;

    if (trimmed.length > 2000) {
      Alert.alert('Post is too long', 'Please keep your thought under 2000 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalMediaUrl = mediaUrl;

      if (imageUri && !finalMediaUrl) {
        setIsUploading(true);
        try {
          const uploaded = await uploadImage(imageUri);
          finalMediaUrl = uploaded?.mediaUrl || null;
          setMediaUrl(finalMediaUrl);
        } catch (uploadErr) {
          const shouldContinue = await new Promise((resolve) => {
            Alert.alert(
              'Could not upload photo.',
              'Post without photo?',
              [
                { text: 'No', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Yes', style: 'default', onPress: () => resolve(true) },
              ],
              { cancelable: true }
            );
          });

          if (!shouldContinue) return;
        } finally {
          setIsUploading(false);
        }
      }

      await createPost({
        content: trimmed || null,
        moodTag,
        ...(finalMediaUrl ? { mediaUrl: finalMediaUrl } : {}),
        ...(songUrl.trim()
          ? {
              songUrl: songUrl.trim(),
              songTitle: songTitle || extractSongTitle(songUrl),
            }
          : {}),
      });
      navigation.goBack();
    } catch (err) {
      const msg =
        (err && typeof err.message === 'string' && err.message.trim().length > 0 && err.message) ||
        'Something went wrong. Please try again.';
      Alert.alert('Could not post', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.header }]}>
      <View style={[styles.header, { backgroundColor: theme.header }]}>
        <Pressable onPress={() => navigation.goBack()} disabled={isSubmitting}>
          <Text style={[styles.cancel, { color: theme.headerText, opacity: 0.8 }]}>Cancel</Text>
        </Pressable>

        <Text style={[styles.headerTitle, { color: theme.headerText }]}>New Thought</Text>

        <Pressable onPress={onSubmit} disabled={!canPost}>
          {isSubmitting ? (
            <Text style={[styles.post, styles.postUploading]}>
              {isUploading ? 'Uploading photo…' : 'Posting…'}
            </Text>
          ) : (
            <Text style={[styles.post, !canPost && styles.postDisabled]}>Post</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={[
          styles.scrollView,
          {
            backgroundColor: theme.bgPrimary,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          },
        ]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {imageUri ? (
          <View style={styles.imageWrap}>
            <Image source={{ uri: imageUri }} style={styles.image} />
            <Pressable onPress={() => setImageUri(null)} style={styles.removeImage}>
              <Text style={styles.removeImageText}>✕</Text>
            </Pressable>
            {isUploading ? (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.uploadOverlayText}>Uploading photo</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="What's on your mind?"
          placeholderTextColor={theme.textMuted}
          autoFocus
          multiline
          maxLength={2000}
          style={[styles.input, { color: theme.textPrimary }]}
          editable={!isSubmitting}
        />

        <View style={styles.counterRow}>
          <Text style={[styles.counter, { color: counterColor }]}>
            {content.length} / 2000
          </Text>
        </View>

        <MoodPicker value={moodTag} onChange={setMoodTag} />
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: theme.bgCard, borderTopColor: theme.border }]}>
        <Pressable onPress={onPickImage} disabled={isSubmitting} style={styles.bottomBarBtn}>
          <Text style={[styles.bottomBarText, { color: theme.textSecondary }]}>📷 Photo</Text>
        </Pressable>

        <View style={[styles.bottomBarDivider, { backgroundColor: theme.border }]} />

        <Pressable
          onPress={() => setShowSongInput((v) => !v)}
          disabled={isSubmitting}
          style={styles.bottomBarBtn}
        >
          <Text style={[styles.bottomBarText, { color: theme.textSecondary }, songUrl && { color: theme.accent }]}>
            🎵 Song
          </Text>
        </Pressable>
      </View>

      {showSongInput ? (
        <View style={[styles.songInputWrap, { backgroundColor: theme.bgInput, borderTopColor: theme.border }]}>
          <TextInput
            value={songUrl}
            onChangeText={(text) => {
              setSongUrl(text);
              setSongTitle(extractSongTitle(text));
            }}
            placeholder="Paste Spotify or YouTube link..."
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.songInput, { color: theme.textPrimary }]}
            keyboardType="url"
            editable={!isSubmitting}
          />
          {songUrl ? (
            <Pressable
              onPress={() => {
                setSongUrl('');
                setSongTitle('');
              }}
            >
              <Text style={[styles.songClear, { color: theme.textMuted }]}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
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
  post: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  postUploading: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
  },
  postDisabled: {
    color: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 8,
  },
  input: {
    width: '100%',
    fontSize: 16,
    color: '#111827',
    padding: 0,
    marginTop: 8,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  counterRow: {
    alignItems: 'flex-end',
    marginTop: 6,
  },
  counter: {
    fontSize: 12,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  bottomBarBtn: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
  },
  bottomBarText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomBarDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
  },
  songInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: 10,
  },
  songInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    padding: 0,
  },
  songClear: {
    color: '#9CA3AF',
    fontSize: 16,
    padding: 4,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeImage: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(17,24,39,0.7)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,24,39,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  uploadOverlayText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
