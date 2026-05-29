import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import { ACTIVE_HOLIDAY_KEY } from './theme';

const { width: W, height: H } = Dimensions.get('window');

// Per-holiday ambient effect: drifting glyphs/dots that fall, rise, or float.
const FX = {
  christmas: { kind: 'glyph', glyph: '❄', colors: ['#FFFFFF', '#D6ECFF'], count: 22, dir: 'down', min: 10, max: 22, sway: 34, dmin: 7000, dmax: 13000, opacity: 0.85 },
  valentines: { kind: 'glyph', glyph: '♥', colors: ['#FF6FAE', '#FFA6CC'], count: 16, dir: 'up', min: 12, max: 24, sway: 28, dmin: 8000, dmax: 14000, opacity: 0.8 },
  july4: { kind: 'glyph', glyph: '★', colors: ['#4C8DFF', '#FF4D5E', '#FFFFFF'], count: 20, dir: 'up', min: 9, max: 18, sway: 18, dmin: 6000, dmax: 11000, opacity: 0.9, twinkle: true },
  halloween: { kind: 'dot', colors: ['#FF8A1E', '#A05BFF'], count: 26, dir: 'up', min: 3, max: 8, sway: 24, dmin: 6000, dmax: 12000, opacity: 0.7, twinkle: true },
  thanksgiving: { kind: 'leaf', colors: ['#F0A93B', '#C75B36', '#E0903A'], count: 18, dir: 'down', min: 9, max: 18, sway: 46, dmin: 7000, dmax: 13000, opacity: 0.85, rotate: true },
  easter: { kind: 'dot', colors: ['#6FE0D0', '#C6A8FF', '#FFD1E8', '#FFF1A6'], count: 20, dir: 'float', min: 6, max: 13, sway: 32, dmin: 9000, dmax: 15000, opacity: 0.7 },
};

function Particle({ cfg }) {
  const d = useRef({
    x: Math.random() * W,
    size: cfg.min + Math.random() * (cfg.max - cfg.min),
    color: cfg.colors[Math.floor(Math.random() * cfg.colors.length)],
    dur: cfg.dmin + Math.random() * (cfg.dmax - cfg.dmin),
    sway: (cfg.sway || 0) * (Math.random() < 0.5 ? -1 : 1),
    delay: Math.random() * 6000,
  }).current;
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(p, { toValue: 1, duration: d.dur, easing: Easing.linear, useNativeDriver: true })
    );
    const t = setTimeout(() => loop.start(), d.delay);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, []);

  const fromY = cfg.dir === 'up' ? H + 40 : cfg.dir === 'down' ? -40 : H * 0.25;
  const toY = cfg.dir === 'up' ? -40 : cfg.dir === 'down' ? H + 40 : H * 0.78;
  const translateY = p.interpolate({ inputRange: [0, 1], outputRange: [fromY, toY] });
  const translateX = d.sway ? p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, d.sway, 0] }) : 0;
  const transform = [{ translateX }, { translateY }];
  if (cfg.rotate) transform.push({ rotate: p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '320deg'] }) });
  const opacity =
    cfg.twinkle || cfg.dir === 'float'
      ? p.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, cfg.opacity, cfg.opacity, 0] })
      : cfg.opacity;

  return (
    <Animated.View style={{ position: 'absolute', left: d.x, top: 0, opacity, transform }}>
      {cfg.kind === 'glyph' ? (
        <Text style={{ fontSize: d.size, color: d.color }}>{cfg.glyph}</Text>
      ) : cfg.kind === 'leaf' ? (
        <View style={{ width: d.size, height: d.size * 0.6, borderRadius: d.size, backgroundColor: d.color }} />
      ) : (
        <View style={{ width: d.size, height: d.size, borderRadius: d.size, backgroundColor: d.color }} />
      )}
    </Animated.View>
  );
}

function Field({ cfg }) {
  const ids = useRef([...Array(cfg.count)].map((_, i) => i)).current;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {ids.map((i) => (
        <Particle key={i} cfg={cfg} />
      ))}
    </View>
  );
}

export default function SeasonalLayer() {
  const cfg = FX[ACTIVE_HOLIDAY_KEY];
  if (!cfg) return null;
  return <Field cfg={cfg} />;
}
