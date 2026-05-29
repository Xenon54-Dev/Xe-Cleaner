import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { colors } from './theme';

const { width: W } = Dimensions.get('window');
const N = 18;
const PALETTE = [colors.mint, colors.violet, '#FFFFFF', colors.warn];

// A short celebratory burst. Fires whenever `trigger` changes (e.g. a cleanup id).
export default function Confetti({ trigger }) {
  const parts = useRef(
    [...Array(N)].map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      o: new Animated.Value(0),
      r: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (!trigger) return;
    const animations = parts.map((p) => {
      p.x.setValue(0);
      p.y.setValue(0);
      p.o.setValue(1);
      p.r.setValue(0);
      const dx = (Math.random() - 0.5) * W * 0.9;
      const peak = -(60 + Math.random() * 150);
      const dur = 900 + Math.random() * 500;
      return Animated.parallel([
        Animated.timing(p.x, { toValue: dx, duration: dur, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(p.y, { toValue: peak, duration: dur * 0.4, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(p.y, { toValue: 280, duration: dur * 0.6, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.timing(p.r, { toValue: (Math.random() - 0.5) * 8, duration: dur, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(dur * 0.55),
          Animated.timing(p.o, { toValue: 0, duration: dur * 0.45, useNativeDriver: true }),
        ]),
      ]);
    });
    Animated.parallel(animations).start();
  }, [trigger]);

  if (!trigger) return null;
  return (
    <View style={styles.wrap} pointerEvents="none">
      {parts.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: i % 3 === 0 ? 10 : 7,
            height: i % 3 === 0 ? 6 : 7,
            borderRadius: i % 2 ? 4 : 1,
            backgroundColor: PALETTE[i % PALETTE.length],
            opacity: p.o,
            transform: [
              { translateX: p.x },
              { translateY: p.y },
              { rotate: p.r.interpolate({ inputRange: [-8, 8], outputRange: ['-720deg', '720deg'] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 92, left: W / 2, zIndex: 150 },
});
