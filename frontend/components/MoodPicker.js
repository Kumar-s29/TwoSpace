import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const MOODS = [
  { key: 'good', label: '🌤 Good', bg: '#D1FAE5', text: '#065F46' },
  { key: 'okay', label: '⛅ Okay', bg: '#FEF3C7', text: '#92400E' },
  { key: 'low', label: '🌧 Low', bg: '#DBEAFE', text: '#1E40AF' },
];

export default function MoodPicker({ value, onChange }) {
  const onPress = (next) => {
    const v = value === next ? null : next;
    if (typeof onChange === 'function') onChange(v);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>How are you feeling?</Text>
      <View style={styles.row}>
        {MOODS.map((m) => {
          const selected = value === m.key;
          return (
            <Pressable
              key={m.key}
              onPress={() => onPress(m.key)}
              style={[
                styles.pill,
                selected
                  ? { backgroundColor: m.bg, borderColor: m.bg }
                  : styles.pillUnselected,
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  selected ? { color: m.text } : styles.pillTextUnselected,
                ]}
              >
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
  },
  label: {
    color: '#6B7280',
    fontSize: 13,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillUnselected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pillTextUnselected: {
    color: '#6B7280',
  },
});

