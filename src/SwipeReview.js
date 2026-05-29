import { useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, fonts, radius } from './theme';

const { width } = Dimensions.get('window');
const THRESHOLD = width * 0.26;

export default function SwipeReview({ photos, onFinish }) {
  const [index, setIndex] = useState(0);
  const [counts, setCounts] = useState({ keep: 0, del: 0 });
  const indexRef = useRef(0);
  const deleteIdsRef = useRef([]);
  const pos = useRef(new Animated.ValueXY()).current;

  const advance = () => {
    const next = indexRef.current + 1;
    indexRef.current = next;
    pos.setValue({ x: 0, y: 0 });
    if (next >= photos.length) onFinish(deleteIdsRef.current);
    else setIndex(next);
  };

  const swipe = (dir) => {
    const photo = photos[indexRef.current];
    if (!photo) return;
    if (dir === 'left') {
      deleteIdsRef.current = [...deleteIdsRef.current, photo.id];
      setCounts((c) => ({ ...c, del: c.del + 1 }));
    } else {
      setCounts((c) => ({ ...c, keep: c.keep + 1 }));
    }
    Animated.timing(pos, {
      toValue: { x: dir === 'left' ? -width * 1.4 : width * 1.4, y: 0 },
      duration: 240,
      useNativeDriver: false,
    }).start(advance);
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
      onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > THRESHOLD) swipe('right');
        else if (g.dx < -THRESHOLD) swipe('left');
        else Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  const current = photos[index];
  const next = photos[index + 1];
  const rotate = pos.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-9deg', '0deg', '9deg'],
  });
  const keepOpacity = pos.x.interpolate({ inputRange: [0, THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const delOpacity = pos.x.interpolate({ inputRange: [-THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable onPress={() => onFinish(deleteIdsRef.current)} hitSlop={14} style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.headerBtn}>Done</Text>
        </Pressable>
        <Text style={styles.progress}>{Math.min(index + 1, photos.length)} / {photos.length}</Text>
        <Text style={styles.counts}>Keep {counts.keep} · Del {counts.del}</Text>
      </View>

      <View style={styles.cardArea}>
        {next && (
          <View style={[styles.card, styles.cardBehind]}>
            <Image source={{ uri: next.uri }} style={styles.cardImg} contentFit="cover" />
          </View>
        )}
        {current ? (
          <Animated.View
            style={[styles.card, { transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate }] }]}
            {...pan.panHandlers}
          >
            <Image source={{ uri: current.uri }} style={styles.cardImg} contentFit="cover" />
            <Animated.View style={[styles.badge, styles.keepBadge, { opacity: keepOpacity }]}>
              <Text style={styles.keepText}>KEEP</Text>
            </Animated.View>
            <Animated.View style={[styles.badge, styles.delBadge, { opacity: delOpacity }]}>
              <Text style={styles.delText}>DELETE</Text>
            </Animated.View>
          </Animated.View>
        ) : (
          <Text style={styles.done}>All done!</Text>
        )}
      </View>

      <View style={styles.controls}>
        <Pressable onPress={() => swipe('left')} style={({ pressed }) => [styles.ctrl, styles.ctrlDel, pressed && styles.pressed]}>
          <Text style={styles.ctrlDelText}>Delete</Text>
        </Pressable>
        <Pressable onPress={() => swipe('right')} style={({ pressed }) => [styles.ctrl, styles.ctrlKeep, pressed && styles.pressed]}>
          <Text style={styles.ctrlKeepText}>Keep</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>Swipe the photo or tap a button. Deletions are confirmed at the end.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 66, paddingHorizontal: 20, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerBtn: { color: colors.mint, fontFamily: fonts.bodySemi, fontSize: 16 },
  progress: { color: colors.text, fontFamily: fonts.display, fontSize: 16 },
  counts: { color: colors.dim, fontFamily: fonts.body, fontSize: 13 },
  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    position: 'absolute', width: '100%', height: '100%', borderRadius: radius.xl, overflow: 'hidden',
    backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.cardBorder,
  },
  cardBehind: { transform: [{ scale: 0.94 }], opacity: 0.5 },
  cardImg: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: 28, paddingVertical: 8, paddingHorizontal: 18, borderRadius: radius.md, borderWidth: 3 },
  keepBadge: { left: 24, borderColor: colors.mint, transform: [{ rotate: '-12deg' }] },
  delBadge: { right: 24, borderColor: colors.danger, transform: [{ rotate: '12deg' }] },
  keepText: { color: colors.mint, fontFamily: fonts.bodyBold, fontSize: 26, letterSpacing: 1 },
  delText: { color: colors.danger, fontFamily: fonts.bodyBold, fontSize: 26, letterSpacing: 1 },
  done: { color: colors.text, fontFamily: fonts.display, fontSize: 22 },
  controls: { flexDirection: 'row', gap: 14, marginTop: 18 },
  ctrl: { flex: 1, paddingVertical: 16, borderRadius: radius.pill, alignItems: 'center', borderWidth: 1 },
  ctrlDel: { borderColor: colors.danger, backgroundColor: 'rgba(255,92,106,0.12)' },
  ctrlKeep: { borderColor: colors.mint, backgroundColor: 'rgba(103,232,195,0.12)' },
  ctrlDelText: { color: colors.danger, fontFamily: fonts.bodyBold, fontSize: 16 },
  ctrlKeepText: { color: colors.mint, fontFamily: fonts.bodyBold, fontSize: 16 },
  hint: { color: colors.faint, fontFamily: fonts.body, fontSize: 12, textAlign: 'center', marginTop: 14 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
