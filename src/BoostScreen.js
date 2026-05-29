import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radius, shadow } from './theme';
import { formatBytes } from './media';
import { getAppCacheBytes, clearAppCache } from './boost';
import { getBattery, getDeviceInfo } from './device';
import StorageRing from './StorageRing';
import AnimatedNumber from './AnimatedNumber';
import { tapLight, tapSuccess } from './haptics';

const MB = 1024 * 1024;
const GB = 1024 * MB;

function computeScore(freeRatio, cacheBytes, clutterBytes) {
  let s = 100;
  if (freeRatio != null) {
    if (freeRatio < 0.08) s -= 30;
    else if (freeRatio < 0.15) s -= 18;
    else if (freeRatio < 0.25) s -= 8;
  }
  if (cacheBytes > 200 * MB) s -= 16;
  else if (cacheBytes > 60 * MB) s -= 8;
  if (clutterBytes > 3 * GB) s -= 22;
  else if (clutterBytes > 1 * GB) s -= 12;
  else if (clutterBytes > 300 * MB) s -= 5;
  return Math.max(5, Math.min(100, Math.round(s)));
}

function health(score) {
  if (score >= 85) return { label: 'Excellent', color: colors.mint };
  if (score >= 70) return { label: 'Good', color: colors.mint };
  if (score >= 50) return { label: 'Fair', color: colors.warn };
  return { label: 'Needs attention', color: colors.danger };
}

function HealthRow({ glyph, title, value, sub, accent, last }) {
  return (
    <View style={[styles.hrow, !last && styles.hrowDivider]}>
      <View style={styles.hicon}>
        <Text style={styles.hglyph}>{glyph}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.htitle}>{title}</Text>
        {sub ? <Text style={styles.hsub}>{sub}</Text> : null}
      </View>
      <Text style={[styles.hvalue, accent && { color: accent }]}>{value}</Text>
    </View>
  );
}

export default function BoostScreen({ isPremium, deviceStorage, photoReclaimable = 0, onBack, onUpgrade, onGoClean, onBoosted }) {
  const [phase, setPhase] = useState('analyzing');
  const [appCache, setAppCache] = useState(0);
  const [freed, setFreed] = useState(0);
  const [battery, setBattery] = useState(null);
  const deviceInfo = getDeviceInfo();

  const freeRatio = deviceStorage ? deviceStorage.free / deviceStorage.total : null;
  const score = computeScore(freeRatio, appCache, photoReclaimable);
  const h = health(score);

  useEffect(() => {
    (async () => {
      const [cache, batt] = await Promise.all([getAppCacheBytes(), getBattery()]);
      setAppCache(cache);
      setBattery(batt);
      setPhase('ready');
    })();
  }, []);

  async function onBoost() {
    if (!isPremium) {
      tapLight();
      onUpgrade();
      return;
    }
    tapLight();
    setPhase('boosting');
    const start = Date.now();
    const f = await clearAppCache();
    const wait = Math.max(0, 1300 - (Date.now() - start));
    setTimeout(() => {
      setFreed(f);
      setAppCache(0);
      setPhase('done');
      tapSuccess();
      if (onBoosted) onBoosted(f);
    }, wait);
  }

  const boosting = phase === 'boosting';
  const done = phase === 'done';

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={onBack} hitSlop={14} style={({ pressed }) => pressed && styles.pressed}>
            <Text style={styles.back}>‹  Back</Text>
          </Pressable>
          <Text style={styles.title}>Boost</Text>
          <View style={[styles.proPill, isPremium ? styles.proOn : styles.proOff]}>
            <Text style={[styles.proText, isPremium && { color: '#06140F' }]}>{isPremium ? 'PRO' : 'LOCKED'}</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <StorageRing size={196} stroke={15} progress={score / 100} animate>
            <View style={styles.ringInner}>
              <Text style={styles.ringLabel}>OPTIMIZATION</Text>
              <AnimatedNumber value={score} format={(n) => String(Math.round(n))} style={styles.scoreNum} />
              <Text style={[styles.healthLabel, { color: h.color }]}>{boosting ? 'Optimizing…' : h.label}</Text>
            </View>
          </StorageRing>
        </View>

        <Pressable onPress={onBoost} disabled={boosting} style={({ pressed }) => [pressed && styles.pressed]}>
          {isPremium ? (
            <LinearGradient colors={[colors.mint, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
              {boosting ? <ActivityIndicator color="#06140F" /> : <Text style={styles.ctaText}>{done ? `Boosted · Freed ${formatBytes(freed)}` : 'Boost Now'}</Text>}
            </LinearGradient>
          ) : (
            <View style={styles.ctaLocked}>
              <Text style={styles.ctaLockedText}>Unlock Boost with Pro</Text>
            </View>
          )}
        </Pressable>

        <Text style={styles.section}>Device</Text>
        <View style={styles.card}>
          <HealthRow
            glyph="▤"
            title="Storage"
            sub={deviceStorage ? `${formatBytes(deviceStorage.free)} free of ${formatBytes(deviceStorage.total)}` : 'Unavailable'}
            value={deviceStorage ? `${Math.round((deviceStorage.free / deviceStorage.total) * 100)}%` : '—'}
            accent={colors.mint}
          />
          <HealthRow
            glyph="◓"
            title="Battery"
            sub={battery ? (battery.charging ? 'Charging' : battery.lowPower ? 'Low Power Mode' : 'On battery') : 'Unavailable'}
            value={battery && battery.level != null ? `${Math.round(battery.level * 100)}%` : '—'}
            accent={battery && battery.lowPower ? colors.warn : colors.text}
          />
          <HealthRow glyph="❖" title={deviceInfo.model} sub={deviceInfo.os} value="" last />
        </View>

        <Text style={styles.section}>Cleanable</Text>
        <View style={styles.card}>
          <HealthRow glyph="◷" title="App cache" sub="Cleared by Boost" value={phase === 'analyzing' ? '…' : formatBytes(appCache)} />
          <Pressable onPress={onGoClean} style={({ pressed }) => pressed && styles.pressed}>
            <HealthRow glyph="▦" title="Photos & videos" sub="Reclaimable in your library" value={`${formatBytes(photoReclaimable)} ›`} accent={colors.mint} last />
          </Pressable>
        </View>

        <Text style={styles.note}>
          The score reflects your free storage, app cache, and photo clutter. iOS sandboxes every other app and Safari —
          their data can't be read or cleared by any third-party app, so Boost optimizes what iOS actually allows.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { paddingTop: 64, paddingHorizontal: 22, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.mint },
  title: { fontFamily: fonts.display, fontSize: 18, color: colors.text },
  proPill: { borderRadius: radius.xs, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1 },
  proOn: { backgroundColor: colors.mint, borderColor: colors.mint },
  proOff: { backgroundColor: 'transparent', borderColor: colors.faint },
  proText: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.5, color: colors.faint },

  hero: { alignItems: 'center', marginTop: 18, marginBottom: 18 },
  ringInner: { alignItems: 'center', justifyContent: 'center' },
  ringLabel: { fontFamily: fonts.bodySemi, fontSize: 10, letterSpacing: 3, color: colors.dim },
  scoreNum: { fontFamily: fonts.displayX, fontSize: 56, color: colors.text, lineHeight: 60 },
  healthLabel: { fontFamily: fonts.bodySemi, fontSize: 13, marginTop: 2 },

  cta: { paddingVertical: 17, borderRadius: radius.pill, alignItems: 'center' },
  ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#06140F' },
  ctaLocked: { paddingVertical: 17, borderRadius: radius.pill, alignItems: 'center', borderWidth: 1.5, borderColor: colors.violet, backgroundColor: 'rgba(139,108,255,0.12)' },
  ctaLockedText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.violet },

  section: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 1.5, color: colors.dim, textTransform: 'uppercase', marginTop: 26, marginBottom: 12 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: 6, borderWidth: 1, borderColor: colors.cardBorder, ...shadow.sm },
  hrow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 10 },
  hrowDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  hicon: { width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(103,232,195,0.14)', alignItems: 'center', justifyContent: 'center' },
  hglyph: { fontSize: 17, color: colors.mint },
  htitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  hsub: { fontFamily: fonts.body, fontSize: 12, color: colors.dim, marginTop: 2 },
  hvalue: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },

  note: { fontFamily: fonts.body, fontSize: 12, color: colors.faint, lineHeight: 17, marginTop: 18 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
