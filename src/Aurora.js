import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from './theme';

const { width: W, height: H } = Dimensions.get('window');

const GLOWS = [
  { id: 'g0', color: colors.mint, size: Math.round(W * 1.15), x: W * 0.82, y: H * 0.15, ampX: 30, ampY: 42, dX: 9000, dY: 12000, dS: 8000, opacity: 0.9 },
  { id: 'g1', color: colors.violet, size: Math.round(W * 1.3), x: W * 0.15, y: H * 0.68, ampX: 38, ampY: 30, dX: 11000, dY: 9500, dS: 10000, opacity: 0.9 },
  { id: 'g2', color: colors.mint, size: Math.round(W * 0.9), x: W * 0.62, y: H * 0.44, ampX: 24, ampY: 30, dX: 13000, dY: 10500, dS: 9000, opacity: 0.5 },
];

function Glow({ cfg, drift }) {
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: cfg.x - cfg.size / 2,
        top: cfg.y - cfg.size / 2,
        width: cfg.size,
        height: cfg.size,
        opacity: cfg.opacity,
        transform: [{ translateX: drift.tx }, { translateY: drift.ty }, { scale: drift.s }],
      }}
    >
      <Svg width={cfg.size} height={cfg.size}>
        <Defs>
          <RadialGradient id={cfg.id} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={cfg.color} stopOpacity="0.5" />
            <Stop offset="55%" stopColor={cfg.color} stopOpacity="0.12" />
            <Stop offset="100%" stopColor={cfg.color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width={cfg.size} height={cfg.size} fill={`url(#${cfg.id})`} />
      </Svg>
    </Animated.View>
  );
}

export default function Aurora() {
  const drifts = useRef(
    GLOWS.map(() => ({ tx: new Animated.Value(0), ty: new Animated.Value(0), s: new Animated.Value(1) }))
  ).current;

  useEffect(() => {
    const osc = (val, amp, dur) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: amp, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(val, { toValue: -amp, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
    const breathe = (val, dur) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1.12, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.95, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
    const loops = [];
    GLOWS.forEach((g, i) => {
      loops.push(osc(drifts[i].tx, g.ampX, g.dX), osc(drifts[i].ty, g.ampY, g.dY), breathe(drifts[i].s, g.dS));
    });
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={[colors.bg1, colors.bg0, '#04060C']} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill} />
      {GLOWS.map((g, i) => (
        <Glow key={g.id} cfg={g} drift={drifts[i]} />
      ))}
      <Svg style={StyleSheet.absoluteFill} width={W} height={H}>
        <Defs>
          <RadialGradient id="vignette" cx="50%" cy="42%" r="75%">
            <Stop offset="0%" stopColor="#04060C" stopOpacity="0" />
            <Stop offset="62%" stopColor="#04060C" stopOpacity="0" />
            <Stop offset="100%" stopColor="#04060C" stopOpacity="0.62" />
          </RadialGradient>
        </Defs>
        <Rect width={W} height={H} fill="url(#vignette)" />
      </Svg>
    </View>
  );
}
