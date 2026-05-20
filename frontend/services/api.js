import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const getHeaders = async () => {
  const token = await AsyncStorage.getItem('twospace_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const apiCall = async (method, path, body = null) => {
  const headers = await getHeaders();
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (networkErr) {
    console.log('apiCall network error:', path, networkErr?.message);
    throw { message: networkErr?.message || 'Network request failed', path };
  }
  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
};

export const login = (body) => apiCall('POST', '/auth/login', body);
export const register = (body) => apiCall('POST', '/auth/register', body);
export const getMe = () => apiCall('GET', '/auth/me');
export const createInvite = () => apiCall('POST', '/rooms/create-invite');
export const joinRoom = (token) => apiCall('POST', `/rooms/join/${token}`);
export const getTimeline = (page = 1) => apiCall('GET', `/posts?page=${page}&limit=20`);
export const createPost = (body) => apiCall('POST', '/posts', body);
export const createWish = (body) => apiCall('POST', '/posts/timed-wish', body);
export const deletePost = (id) => apiCall('DELETE', `/posts/${id}`);
export const getReplies = (id) => apiCall('GET', `/posts/${id}/replies`);
export const addReply = (id, body) => apiCall('POST', `/posts/${id}/reply`, body);
export const getMyRoom = () => apiCall('GET', '/rooms/my-room');
export const archiveRoom = () => apiCall('POST', '/rooms/archive');
export const closeRoom = (body) => apiCall('DELETE', '/rooms/close', body);
export const saveExpoPushToken = (t) =>
  apiCall('POST', '/notifications/token', { expoPushToken: t });

export const uploadImage = async (imageUri) => {
  const token = await AsyncStorage.getItem('twospace_token');

  const formData = new FormData();
  const filename = imageUri.split('/').pop();
  const ext = filename.split('.').pop().toLowerCase();
  const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const type = mimeMap[ext] || 'image/jpeg';

  formData.append('image', {
    uri: imageUri,
    name: filename,
    type,
  });

  const res = await fetch(`${BASE_URL}/posts/upload-image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
};

export const createCapsule = (body) => apiCall('POST', '/posts/capsule/create', body);

export const addToCapsule = (capsuleId, body) =>
  apiCall('POST', `/posts/capsule/${capsuleId}/add`, body);

export const getCapsule = (capsuleId) =>
  apiCall('GET', `/posts/capsule/${capsuleId}`);

export const confirmCapsule = (capsuleId) =>
  apiCall('POST', `/posts/capsule/${capsuleId}/confirm`);

export const getMyCapsules = () =>
  apiCall('GET', '/posts/capsule/my-capsules');

export const getWishes = () =>
  apiCall('GET', '/posts?type=timed-wish&limit=50');

export const uploadAudio = async (audioUri) => {
  const token = await AsyncStorage.getItem('twospace_token');

  const formData = new FormData();
  const filename = audioUri.split('/').pop();

  formData.append('audio', {
    uri: audioUri,
    name: filename,
    type: 'audio/m4a',
  });

  const res = await fetch(`${BASE_URL}/posts/upload-audio`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
};

export const reactToPost = (postId, emoji) =>
  apiCall('POST', `/posts/${postId}/react`, { emoji });

export const editPost = (postId, content) =>
  apiCall('PUT', `/posts/${postId}`, { content });

export const pinPost = (postId) =>
  apiCall('POST', `/posts/${postId}/pin`);

export const getPinnedPosts = () =>
  apiCall('GET', '/posts?pinned=true&limit=10');
