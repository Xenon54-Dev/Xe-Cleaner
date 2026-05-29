import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Logo from './Logo';
import { colors, fonts, radius } from './theme';

function Feature({ glyph, title, desc }) {
  return (
    <View style={styles.feature}>
      <View style={styles.fIcon}>
        <Text style={styles.fGlyph}>{glyph}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.fTitle}>{title}</Text>
        <Text style={styles.fDesc}>{desc}</Text>
      </View>
    </View>
  );
}

export default function Onboarding({ onGetStarted }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Logo size={76} />
        <Text style={styles.title}>Xe Cleaner</Text>
        <Text style={styles.sub}>Free up space, beautifully.</Text>
      </View>

      <View style={styles.features}>
        <Feature glyph="▶" title="Find what's eating space" desc="Your largest videos and photos, measured precisely." />
        <Feature glyph="❏" title="Detect duplicates" desc="Smart fingerprinting catches look-alikes, not just exact copies." />
        <Feature glyph="✦" title="Swipe to clean" desc="Review and remove photos in seconds." />
      </View>

      <View style={styles.bottom}>
        <Pressable onPress={onGetStarted} style={({ pressed }) => pressed && styles.pressed}>
          <LinearGradient colors={[colors.mint, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
            <Text style={styles.btnText}>Get Started</Text>
          </LinearGradient>
        </Pressable>
        <Text style={styles.privacy}>Your photos never leave your device.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 96, paddingHorizontal: 28, paddingBottom: 48, justifyContent: 'space-between' },
  top: { alignItems: 'center' },
  title: { fontFamily: fonts.displayX, fontSize: 34, color: colors.text, marginTop: 18 },
  sub: { fontFamily: fonts.body, fontSize: 15, color: colors.dim, marginTop: 6 },
  features: { gap: 22 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  fIcon: {
    width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(103,232,195,0.14)',
  },
  fGlyph: { fontSize: 22, color: colors.mint },
  fTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  fDesc: { fontFamily: fonts.body, fontSize: 13, color: colors.dim, marginTop: 3, lineHeight: 18 },
  bottom: { alignItems: 'center' },
  btn: { paddingVertical: 18, paddingHorizontal: 80, borderRadius: radius.pill },
  btnText: { fontFamily: fonts.bodyBold, fontSize: 17, color: '#06140F' },
  privacy: { fontFamily: fonts.body, fontSize: 12, color: colors.faint, marginTop: 16 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
