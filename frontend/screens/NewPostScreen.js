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

export default function NewPostScreen({ navigation }) {
  const [content, setContent] = useState('');
  const [moodTag, setMoodTag] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [mediaUrl, setMediaUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const trimmed = content.trim();

  const canPost = useMemo(() => {
    if (isSubmitting) return false;
    if (trimmed.length > 0) return true;
    if (imageUri) return true;
    return false;
  }, [isSubmitting, trimmed.length, imageUri]);

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

    if (trimmed.length === 0) return;

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
        content: trimmed,
        moodTag,
        ...(finalMediaUrl ? { mediaUrl: finalMediaUrl } : {}),
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
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} disabled={isSubmitting}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>

        <Text style={styles.headerTitle}>New Thought</Text>

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
            backgroundColor: '#FFFFFF',
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
          autoFocus
          multiline
          maxLength={2000}
          style={styles.input}
          editable={!isSubmitting}
        />

        <View style={styles.counterRow}>
          <Text style={[styles.counter, { color: counterColor }]}>
            {content.length} / 2000
          </Text>
        </View>

        <MoodPicker value={moodTag} onChange={setMoodTag} />
      </ScrollView>

      <View style={styles.imageBar}>
        <Pressable onPress={onPickImage} disabled={isSubmitting}>
        <Text style={styles.imageBarText}>📷 Add Photo</Text>
        </Pressable>
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
  imageBar: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  imageBarText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600',
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
