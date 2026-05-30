import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, fonts, radius } from './theme';
import { tapLight } from './haptics';

const W = Dimensions.get('window').width;
const PAD = 10;

const TABS = [
  { key: 'clean', label: 'Clean', glyph: '✦' },
  { key: 'history', label: 'History', glyph: '↺' },
  { key: 'settings', label: 'Settings', glyph: '⚙' },
];
const ADMIN_TAB = { key: 'admin', label: 'Console', glyph: '★' };

export default function TabBar({ active, onChange, isAdmin }) {
  const tabs = isAdmin ? [...TABS, ADMIN_TAB] : TABS;
  const tabW = (W - PAD * 2) / tabs.length;
  const index = Math.max(0, tabs.findIndex((t) => t.key === active));
  const tx = useRef(new Animated.Value(index * tabW)).current;
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(tx, { toValue: index * tabW, useNativeDriver: true, friction: 9, tension: 80 }).start();
    pop.setValue(0.72);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 5, tension: 150 }).start();
  }, [index, tabW]);

  return (
    <BlurView intensity={50} tint="dark" style={styles.bar}>
      <Animated.View style={[styles.indicator, { width: tabW - 14, left: PAD + 7, transform: [{ translateX: tx }] }]} />
      {tabs.map((t) => {
        const on = active === t.key;
        return (
          <Pressable
            key={t.key}
            style={styles.tab}
            onPress={() => {
              tapLight();
              onChange(t.key);
            }}
          >
            <Animated.View style={on ? { transform: [{ scale: pop }] } : undefined}>
              <Text style={[styles.glyph, on && styles.on]}>{t.glyph}</Text>
            </Animated.View>
            <Text numberOfLines={1} style={[styles.label, on && styles.on]}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingBottom: 30,
    paddingHorizontal: PAD,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: 8,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: 'rgba(103,232,195,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(103,232,195,0.22)',
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 2 },
  glyph: { fontSize: 18, color: colors.faint },
  label: { fontFamily: fonts.bodySemi, fontSize: 10, color: colors.faint },
  on: { color: colors.mint },
});
