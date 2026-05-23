import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.28;

export default function SplashScreen({ onFinish }) {
  const { theme } = useTheme();
  const circlesOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Step 1: Circles fade in (600ms)
      Animated.timing(circlesOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Step 2: Pause (200ms)
      Animated.delay(200),
      // Step 3: Title slides up + fades in (400ms)
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Step 4: Tagline fades in (300ms)
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Step 5: Hold (800ms)
      Animated.delay(800),
      // Step 6: Whole screen fades out (400ms)
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (typeof onFinish === 'function') onFinish();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.screen, { opacity: screenOpacity, backgroundColor: theme.header }]}>
      <View style={styles.content}>
        {/* Two overlapping circles */}
        <Animated.View style={[styles.circlesWrap, { opacity: circlesOpacity }]}>
          <View style={[styles.circle, styles.circleLeft]} />
          <View style={[styles.circle, styles.circleRight]} />
          {/* Overlap tint */}
          <View style={styles.overlapTint} />
        </Animated.View>

        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          <Text style={{ color: '#FFFFFF' }}>Two</Text>
          <Text style={{ color: '#F9A8D4' }}>Space</Text>
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Your private space
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#4F46B8',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  content: {
    alignItems: 'center',
  },
  circlesWrap: {
    width: CIRCLE_SIZE * 1.6,
    height: CIRCLE_SIZE,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: CIRCLE_SIZE * 0.1,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'transparent',
    position: 'absolute',
  },
  circleLeft: {
    left: 0,
  },
  circleRight: {
    right: 0,
  },
  overlapTint: {
    position: 'absolute',
    width: CIRCLE_SIZE * 0.32,
    height: CIRCLE_SIZE * 0.72,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: CIRCLE_SIZE,
    left: CIRCLE_SIZE * 0.64,
    top: CIRCLE_SIZE * 0.14,
  },
  title: {
    marginTop: 28,
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  tagline: {
    marginTop: 8,
    fontSize: 16,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '500',
  },
});

