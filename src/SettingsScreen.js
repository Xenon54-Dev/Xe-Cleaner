import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from './theme';
import { SENSITIVITY, DEPTHS } from './storage';
import { getBiometricEnabled, setBiometricEnabled } from './auth/authStore';
import { getBiometricInfo, authenticateWithBiometric } from './auth/biometric';
import { tapLight } from './haptics';

function Row({ k, v }) {
  return (
    <View style={styles.aboutRow}>
      <Text style={styles.aboutKey}>{k}</Text>
      <Text style={styles.aboutVal}>{v}</Text>
    </View>
  );
}

export default function SettingsScreen({ settings, onChange, onClearCache, user, onSignOut, isPremium, onUpgrade }) {
  const [biometricInfo, setBioInfo] = useState(null);
  const [bioEnabled, setBioEnabled] = useState(false);

  useEffect(() => {
    getBiometricInfo().then(setBioInfo);
    getBiometricEnabled().then(setBioEnabled);
  }, []);

  async function toggleBiometric() {
    const ok = await authenticateWithBiometric(biometricInfo?.label || 'Biometrics');
    if (!ok) return;
    tapLight();
    const next = !bioEnabled;
    setBioEnabled(next);
    await setBiometricEnabled(next);
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>Settings</Text>

      <Text style={styles.section}>Account</Text>
      <View style={styles.aboutCard}>
        <Row k="Name" v={user?.name || '—'} />
        <Row k="Email" v={user?.email || '—'} />
        <Row k="Role" v={user?.role === 'admin' ? 'CEO / Admin' : 'Member'} />
      </View>

      <Text style={[styles.section, { marginTop: 30 }]}>Security</Text>
      <View style={styles.aboutCard}>
        {biometricInfo?.available ? (
          <Pressable onPress={toggleBiometric} style={({ pressed }) => [styles.aboutRow, pressed && styles.pressed]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.aboutKey}>{biometricInfo.label} sign-in</Text>
              <Text style={styles.secSub}>Use {biometricInfo.label} to unlock your saved session</Text>
            </View>
            <View style={[styles.bioSwitch, bioEnabled && styles.bioSwitchOn]}>
              <View style={[styles.bioKnob, bioEnabled && styles.bioKnobOn]} />
            </View>
          </Pressable>
        ) : (
          <Row k={biometricInfo?.label || 'Biometrics'} v="Unavailable" />
        )}
      </View>

      <Text style={[styles.section, { marginTop: 30 }]}>Subscription</Text>
      <View style={styles.aboutCard}>
        <Row k="Plan" v={isPremium ? 'Xe Cleaner Pro' : 'Free'} />
      </View>
      {!isPremium && (
        <Pressable onPress={onUpgrade} style={({ pressed }) => [styles.upgradeBtn, pressed && styles.pressed]}>
          <Text style={styles.upgradeText}>Upgrade to Pro</Text>
        </Pressable>
      )}

      <Text style={[styles.section, { marginTop: 30 }]}>Duplicate detection</Text>

      <Text style={styles.label}>Sensitivity</Text>
      <View style={styles.segment}>
        {Object.entries(SENSITIVITY).map(([k, v]) => (
          <Pressable key={k} onPress={() => onChange({ ...settings, sensitivity: k })} style={[styles.seg, settings.sensitivity === k && styles.segOn]}>
            <Text style={[styles.segText, settings.sensitivity === k && styles.segTextOn]}>{v.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>{SENSITIVITY[settings.sensitivity]?.hint}</Text>

      <Text style={[styles.label, { marginTop: 22 }]}>Scan depth</Text>
      <View style={styles.segment}>
        {DEPTHS.map((d) => (
          <Pressable key={d.value} onPress={() => onChange({ ...settings, depth: d.value })} style={[styles.seg, settings.depth === d.value && styles.segOn]}>
            <Text style={[styles.segText, settings.depth === d.value && styles.segTextOn]}>{d.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>{DEPTHS.find((d) => d.value === settings.depth)?.hint}</Text>

      <Pressable onPress={onClearCache} style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}>
        <Text style={styles.clearText}>Clear fingerprint cache</Text>
      </Pressable>

      <Text style={[styles.section, { marginTop: 30 }]}>About</Text>
      <View style={styles.aboutCard}>
        <Row k="Version" v="1.0.0" />
        <Row k="Your photos" v="Stay on device" />
        <Row k="Deletes" v="Recoverable 30 days" />
      </View>
      <Text style={styles.how}>
        Xe Cleaner analyzes your photo library entirely on your iPhone to find large videos, large photos,
        screenshots, and duplicates. Nothing is ever uploaded.
      </Text>

      <Pressable
        onPress={() => Share.share({ message: 'Xe Cleaner — find and clear the junk hogging your iPhone storage.' })}
        style={({ pressed }) => [styles.shareBtn, { marginTop: 22 }, pressed && styles.pressed]}
      >
        <Text style={styles.shareText}>Share Xe Cleaner</Text>
      </Pressable>

      <Pressable onPress={onSignOut} style={({ pressed }) => [styles.clearBtn, { marginTop: 12 }, pressed && styles.pressed]}>
        <Text style={styles.clearText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 66, paddingHorizontal: 20 },
  h1: { fontFamily: fonts.displayX, fontSize: 30, color: colors.text, marginBottom: 22 },
  section: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 1.5, color: colors.dim, marginBottom: 14, textTransform: 'uppercase' },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text, marginBottom: 10 },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.md, padding: 4, gap: 4 },
  seg: { flex: 1, paddingVertical: 12, borderRadius: radius.sm, alignItems: 'center' },
  segOn: { backgroundColor: colors.mint },
  segText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.dim },
  segTextOn: { color: '#06140F' },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.faint, marginTop: 8 },
  clearBtn: { marginTop: 26, paddingVertical: 14, borderRadius: radius.pill, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,92,106,0.4)' },
  clearText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.danger },
  shareBtn: { paddingVertical: 14, borderRadius: radius.pill, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card },
  shareText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.mint },
  upgradeBtn: { marginTop: 12, paddingVertical: 14, borderRadius: radius.pill, alignItems: 'center', backgroundColor: colors.mint },
  upgradeText: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#06140F' },
  aboutCard: { backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: 18, borderWidth: 1, borderColor: colors.cardBorder },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  aboutKey: { fontFamily: fonts.body, fontSize: 14, color: colors.dim },
  aboutVal: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  secSub: { fontFamily: fonts.body, fontSize: 12, color: colors.faint, marginTop: 3 },
  bioSwitch: { width: 42, height: 25, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.12)', padding: 3, justifyContent: 'center' },
  bioSwitchOn: { backgroundColor: colors.mint },
  bioKnob: { width: 19, height: 19, borderRadius: 10, backgroundColor: '#fff' },
  bioKnobOn: { alignSelf: 'flex-end' },
  how: { fontFamily: fonts.body, fontSize: 13, color: colors.faint, marginTop: 16, lineHeight: 19 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
