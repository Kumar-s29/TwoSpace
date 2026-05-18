import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import dayjs from 'dayjs';

export default function LockedWishCard({ post, isOwn }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const unlockDate = post?.unlocksAt ? new Date(post.unlocksAt) : null;

  const remaining = useMemo(() => {
    if (!unlockDate || Number.isNaN(unlockDate.getTime())) return null;
    const diffMs = unlockDate.getTime() - Date.now();
    if (!Number.isFinite(diffMs) || diffMs <= 0) return { days: 0, hours: 0 };
    const totalHours = Math.floor(diffMs / (60 * 60 * 1000));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return { days, hours };
  }, [unlockDate, tick]);

  const label =
    typeof post?.label === 'string' && post.label.trim().length > 0
      ? post.label.trim()
      : 'Timed Wish';

  const onPress = () => {
    const formatted = unlockDate ? dayjs(unlockDate).format('MMM D, YYYY h:mm A') : 'Unknown date';
    Alert.alert('This wish unlocks on', formatted);
  };

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.wrapper,
        isOwn ? styles.wrapperOwn : styles.wrapperPartner,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.card}>
          <Text style={styles.lock}>🔒</Text>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.desc}>
            {isOwn
              ? 'Your sealed wish — waiting to unlock'
              : 'A wish is waiting for you...'}
          </Text>
          {remaining ? (
            <Text style={styles.countdown}>
              Opens in {remaining.days} days {remaining.hours} hours
            </Text>
          ) : null}
        </View>
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
  },
  card: {
    flex: 1,
    backgroundColor: '#FDF4FF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: '#E879F9',
    borderStyle: 'dashed',
  },
  lock: {
    fontSize: 18,
  },
  label: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '800',
    color: '#4F46B8',
  },
  desc: {
    marginTop: 6,
    fontSize: 13,
    color: '#6B7280',
  },
  countdown: {
    marginTop: 10,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
  },
});
