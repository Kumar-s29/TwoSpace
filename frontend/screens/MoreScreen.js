import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export default function MoreScreen({ navigation }) {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.header }]}>
      <View style={[styles.header, { backgroundColor: theme.header }]}>
        <Text style={[styles.headerTitle, { color: theme.headerText }]}>More</Text>
      </View>
      <View style={[styles.contentCard, { backgroundColor: theme.bgPrimary }]}>
        <View style={styles.grid}>
          
          <Pressable
            style={[styles.card, { backgroundColor: theme.accentLight }]}
            onPress={() => 
              navigation.navigate('BucketList')
            }
          >
            <Text style={styles.cardEmoji}>🪣</Text>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Bucket List
            </Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              Things you want to{'\n'}
              do together
            </Text>
          </Pressable>

          <Pressable
            style={[styles.card, { backgroundColor: theme.accentLight }]}
            onPress={() => 
              navigation.navigate('Milestones')
            }
          >
            <Text style={styles.cardEmoji}>🗓️</Text>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Milestones
            </Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              Important dates{'\n'}
              and anniversaries
            </Text>
          </Pressable>

        </View>

        <View style={[styles.grid, { marginTop: 16 }]}>
          <Pressable
            style={[styles.card, { backgroundColor: theme.accentLight }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.cardEmoji}>⚙️</Text>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Settings</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              Profile, space{'\n'}and account
            </Text>
          </Pressable>

          <View style={[styles.card, { backgroundColor: 'transparent' }]} />
        </View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  contentCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  card: {
    flex: 1,
    backgroundColor: '#F0EFFC',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  cardEmoji: {
    fontSize: 36,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
  },
  cardDesc: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});
