import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Logo from './Logo';
import Aurora from './Aurora';
import { colors, fonts } from './theme';

export default function Splash({ label = 'Preparing your library' }) {
  const enter = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(shimmer, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true })).start();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.84, 1] });
  const shimmerX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-70, 170] });

  const ring = 150;
  const r = (ring - 6) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <View style={styles.root}>
      <Aurora />

      <Animated.View style={[styles.center, { opacity: enter, transform: [{ scale }] }]}>
        <View style={{ width: ring, height: ring, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
            <Svg width={ring} height={ring}>
              <Defs>
                <SvgGrad id="splashArc" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={colors.mint} stopOpacity="0" />
                  <Stop offset="1" stopColor={colors.mint} stopOpacity="1" />
                </SvgGrad>
              </Defs>
              <Circle
                cx={ring / 2}
                cy={ring / 2}
                r={r}
                fill="none"
                stroke="url(#splashArc)"
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray={`${circ * 0.3} ${circ}`}
              />
            </Svg>
          </Animated.View>
          <Logo size={70} />
        </View>

        <Text style={styles.wordmark}>Xe Cleaner</Text>
        <Text style={styles.label}>{label}</Text>

        <View style={styles.shimmerTrack}>
          <Animated.View style={[styles.shimmerSeg, { transform: [{ translateX: shimmerX }] }]}>
            <LinearGradient colors={['transparent', colors.mint, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg0, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center' },
  blob: { position: 'absolute', width: 320, height: 320, borderRadius: 320 },
  blobMint: { backgroundColor: colors.glowMint, top: -60, right: -50 },
  blobViolet: { backgroundColor: colors.glowViolet, bottom: -40, left: -80, opacity: 0.7 },
  wordmark: { fontFamily: fonts.displayX, fontSize: 28, color: colors.text, marginTop: 26, letterSpacing: 0.4 },
  label: { fontFamily: fonts.body, fontSize: 13, color: colors.dim, marginTop: 8 },
  shimmerTrack: { width: 140, height: 3, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 26 },
  shimmerSeg: { width: 70, height: '100%' },
});
