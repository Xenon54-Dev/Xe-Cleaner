import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radius, shadow } from './theme';
import { tapSuccess } from './haptics';

const PERKS = [
  'One-tap Boost & cache optimization',
  'Deeper duplicate scans (1000+ photos)',
  'Priority large-file detection',
  'Unlimited cleanups, forever updates',
];

export default function Paywall({ visible, onUpgrade, onClose }) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>XE CLEANER PRO</Text>
          </View>
          <Text style={styles.title}>Unlock the full clean</Text>
          <Text style={styles.subtitle}>Everything you need to keep your iPhone lean.</Text>

          <View style={styles.perks}>
            {PERKS.map((p) => (
              <View key={p} style={styles.perkRow}>
                <View style={styles.checkDot}>
                  <Text style={styles.check}>✓</Text>
                </View>
                <Text style={styles.perkText}>{p}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.price}>
            $2.99<Text style={styles.per}> / month</Text>
          </Text>

          <Pressable onPress={() => { tapSuccess(); onUpgrade(); }} style={({ pressed }) => [pressed && styles.pressed]}>
            <LinearGradient colors={[colors.mint, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
              <Text style={styles.ctaText}>Upgrade to Pro</Text>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={onClose} hitSlop={8} style={styles.laterBtn}>
            <Text style={styles.later}>Maybe later</Text>
          </Pressable>
          <Text style={styles.fine}>Demo upgrade — real billing runs through the App Store when published.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(3,5,12,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0E1430', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: 24, paddingBottom: 38, borderWidth: 1, borderColor: colors.cardBorder, ...shadow.md,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 18 },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(139,108,255,0.18)', borderRadius: radius.xs, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(139,108,255,0.5)' },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 2, color: colors.violet },
  title: { fontFamily: fonts.displayX, fontSize: 26, color: colors.text, marginTop: 14 },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.dim, marginTop: 6 },
  perks: { marginTop: 22, gap: 14 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(103,232,195,0.16)', alignItems: 'center', justifyContent: 'center' },
  check: { color: colors.mint, fontFamily: fonts.bodyBold, fontSize: 13 },
  perkText: { fontFamily: fonts.body, fontSize: 15, color: colors.text, flex: 1 },
  price: { fontFamily: fonts.displayX, fontSize: 30, color: colors.text, marginTop: 26 },
  per: { fontFamily: fonts.body, fontSize: 15, color: colors.dim },
  cta: { paddingVertical: 17, borderRadius: radius.pill, alignItems: 'center', marginTop: 18 },
  ctaText: { fontFamily: fonts.bodyBold, fontSize: 17, color: '#06140F' },
  laterBtn: { alignItems: 'center', marginTop: 14 },
  later: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.dim },
  fine: { fontFamily: fonts.body, fontSize: 11, color: colors.faint, textAlign: 'center', marginTop: 16 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
