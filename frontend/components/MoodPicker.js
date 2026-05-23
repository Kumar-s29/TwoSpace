import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function MoodPicker({ value, onChange }) {
  const { theme } = useTheme();

  const moods = [
    { key: 'good', label: '🌤 Good', bg: theme.moodGoodBg, text: theme.moodGoodText },
    { key: 'okay', label: '⛅ Okay', bg: theme.moodOkayBg, text: theme.moodOkayText },
    { key: 'low', label: '🌧 Low', bg: theme.moodLowBg, text: theme.moodLowText },
  ];

  const onPress = (next) => {
    const v = value === next ? null : next;
    if (typeof onChange === 'function') onChange(v);
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>How are you feeling?</Text>
      <View style={styles.row}>
        {moods.map((m) => {
          const selected = value === m.key;
          return (
            <Pressable
              key={m.key}
              onPress={() => onPress(m.key)}
              style={[
                styles.pill,
                selected
                  ? { backgroundColor: m.bg, borderColor: m.bg }
                  : [styles.pillUnselected, { backgroundColor: theme.bgInput, borderColor: theme.border }],
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  selected
                    ? { color: m.text }
                    : [styles.pillTextUnselected, { color: theme.textSecondary }],
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

