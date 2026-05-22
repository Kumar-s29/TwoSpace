import React from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function MoreScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>
      <View style={styles.contentCard}>
        <View style={styles.grid}>
          
          <Pressable
            style={styles.card}
            onPress={() => 
              navigation.navigate('BucketList')
            }
          >
            <Text style={styles.cardEmoji}>🪣</Text>
            <Text style={styles.cardTitle}>
              Bucket List
            </Text>
            <Text style={styles.cardDesc}>
              Things you want to{'\n'}
              do together
            </Text>
          </Pressable>

          <Pressable
            style={styles.card}
            onPress={() => 
              navigation.navigate('Milestones')
            }
          >
            <Text style={styles.cardEmoji}>🗓️</Text>
            <Text style={styles.cardTitle}>
              Milestones
            </Text>
            <Text style={styles.cardDesc}>
              Important dates{'\n'}
              and anniversaries
            </Text>
          </Pressable>

        </View>

        <View style={[styles.grid, { marginTop: 16 }]}>
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.cardEmoji}>⚙️</Text>
            <Text style={styles.cardTitle}>Settings</Text>
            <Text style={styles.cardDesc}>
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
