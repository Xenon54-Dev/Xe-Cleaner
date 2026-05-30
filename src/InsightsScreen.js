import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radius, shadow } from './theme';
import { formatBytes } from './media';
import AnimatedNumber from './AnimatedNumber';
import { buildForecast, SYSTEM_DATA_FACTS, SYSTEM_DATA_TIPS, APP_HABIT_FACTS } from './insights';

function Section({ children }) {
  return <Text style={styles.section}>{children}</Text>;
}

function FactRow({ text, accent }) {
  return (
    <View style={styles.factRow}>
      <View style={[styles.bullet, { backgroundColor: accent || colors.mint }]} />
      <Text style={styles.factText}>{text}</Text>
    </View>
  );
}

function CheckRow({ text }) {
  return (
    <View style={styles.factRow}>
      <View style={styles.check}>
        <Text style={styles.checkGlyph}>✓</Text>
      </View>
      <Text style={styles.factText}>{text}</Text>
    </View>
  );
}

function CardHeader({ glyph, title, badge, tint }) {
  return (
    <View style={styles.cardHeader}>
      <View style={[styles.iconBadge, { backgroundColor: `${tint}22`, borderColor: `${tint}55` }]}>
        <Text style={[styles.iconGlyph, { color: tint }]}>{glyph}</Text>
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      {badge && (
        <View style={[styles.pill, { backgroundColor: `${tint}1F`, borderColor: `${tint}55` }]}>
          <Text style={[styles.pillText, { color: tint }]}>{badge}</Text>
        </View>
      )}
    </View>
  );
}

function monthsLabel(m) {
  if (m == null) return { big: '—', unit: '', warn: false };
  if (m >= 60) return { big: '5+', unit: 'years left', warn: false };
  if (m >= 12) return { big: (m / 12).toFixed(1), unit: 'years left', warn: false };
  if (m < 1) return { big: '<1', unit: 'month left', warn: true };
  return { big: String(Math.round(m)), unit: 'months left', warn: m < 3 };
}

export default function InsightsScreen({ deviceStorage }) {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setForecast(await buildForecast(deviceStorage));
      } catch {
        setForecast(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ml = monthsLabel(forecast?.monthsLeft);
  const hasForecast = forecast && forecast.bytesPerMonth > 0;

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>Insights</Text>

      <Section>Storage forecast</Section>
      <LinearGradient colors={[colors.bg2, 'rgba(103,232,195,0.06)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.forecastCard}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.mint} />
            <Text style={styles.loadingText}>Analyzing your storage trend…</Text>
          </View>
        ) : hasForecast ? (
          <>
            <View style={styles.forecastTop}>
              <View>
                <Text style={[styles.forecastBig, ml.warn && { color: colors.warn }]}>{ml.big}</Text>
                <Text style={styles.forecastUnit}>{ml.unit}</Text>
              </View>
              <View style={styles.forecastSide}>
                {forecast.recentMedia != null && (
                  <Text style={styles.sideStat}>
                    <Text style={styles.sideNum}>{forecast.recentMedia}</Text> new photos & videos this month
                  </Text>
                )}
                <Text style={styles.sideStat}>
                  ≈ <Text style={styles.sideNum}>{formatBytes(forecast.bytesPerMonth)}</Text> added / month
                </Text>
              </View>
            </View>
            {forecast.projectedUsed != null && deviceStorage && (
              <View style={styles.projRow}>
                <Text style={styles.projLabel}>Projected next month</Text>
                <AnimatedNumber
                  value={forecast.projectedUsed}
                  format={(n) => `${formatBytes(n)} of ${formatBytes(deviceStorage.total)}`}
                  style={styles.projValue}
                />
              </View>
            )}
            <Text style={styles.caveat}>
              {forecast.source === 'samples'
                ? 'Calculated from your measured storage trend.'
                : 'Calculated from your recent photo & video activity.'}
            </Text>
          </>
        ) : (
          <View style={styles.loadingBox}>
            <Text style={styles.gatherTitle}>Gathering data</Text>
            <Text style={styles.gatherText}>
              Open Xe Cleaner over the next few days and your storage forecast will appear here.
            </Text>
          </View>
        )}
      </LinearGradient>

      <Section>Recommendations</Section>
      <View style={styles.card}>
        <CardHeader glyph="≡" title="System Data" badge="HIGH IMPACT" tint={colors.violet} />
        <Text style={styles.body}>
          System Data builds up from caches, logs, and temporary files iOS keeps behind the scenes. It’s the most common
          source of hidden bloat — here’s what fills it and how to clear it.
        </Text>
        <View style={styles.list}>
          {SYSTEM_DATA_FACTS.map((f) => (
            <FactRow key={f} text={f} accent={colors.violet} />
          ))}
        </View>
        <Text style={styles.subhead}>Recommended actions</Text>
        <View style={styles.list}>
          {SYSTEM_DATA_TIPS.map((t) => (
            <CheckRow key={t} text={t} />
          ))}
        </View>
        <Pressable onPress={() => Linking.openSettings()} style={({ pressed }) => [styles.settingsBtn, pressed && styles.pressed]}>
          <Text style={styles.settingsBtnText}>Open iOS Settings  ›</Text>
        </Pressable>
        <Text style={styles.path}>General › iPhone Storage</Text>
      </View>

      <View style={[styles.card, { marginTop: 14 }]}>
        <CardHeader glyph="↻" title="Cache-heavy apps" badge="RECOMMENDED" tint={colors.warn} />
        <Text style={styles.body}>
          These app types rebuild their cache after every cleanup — the biggest repeat offenders for storage creep.
          Target them to reclaim the most space.
        </Text>
        <View style={styles.list}>
          {APP_HABIT_FACTS.map((f) => (
            <FactRow key={f} text={f} accent={colors.warn} />
          ))}
        </View>
        <Text style={styles.subhead}>The fix</Text>
        <Text style={styles.body}>
          In iPhone Storage, tap a heavy app and choose <Text style={styles.bodyStrong}>Offload App</Text> — it clears the
          cache while keeping your documents and data.
        </Text>
        <Pressable onPress={() => Linking.openSettings()} style={({ pressed }) => [styles.settingsBtn, pressed && styles.pressed]}>
          <Text style={styles.settingsBtnText}>Open iOS Settings  ›</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 66, paddingHorizontal: 20 },
  h1: { fontFamily: fonts.displayX, fontSize: 30, color: colors.text, marginBottom: 20 },
  section: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 1.5, color: colors.dim, textTransform: 'uppercase', marginTop: 26, marginBottom: 12 },

  forecastCard: { borderRadius: radius.lg, padding: 20, borderWidth: 1, borderColor: colors.cardBorder, ...shadow.sm },
  loadingBox: { alignItems: 'center', paddingVertical: 16 },
  loadingText: { fontFamily: fonts.body, fontSize: 13, color: colors.dim, marginTop: 12 },
  gatherTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.text },
  gatherText: { fontFamily: fonts.body, fontSize: 13, color: colors.dim, textAlign: 'center', marginTop: 8, lineHeight: 19 },

  forecastTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  forecastBig: { fontFamily: fonts.displayX, fontSize: 52, color: colors.mint, lineHeight: 56 },
  forecastUnit: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.dim, marginTop: 2 },
  forecastSide: { flex: 1, paddingLeft: 18, paddingTop: 6, gap: 8 },
  sideStat: { fontFamily: fonts.body, fontSize: 13, color: colors.dim, lineHeight: 18 },
  sideNum: { fontFamily: fonts.bodyBold, color: colors.text },

  projRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  projLabel: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.dim },
  projValue: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  caveat: { fontFamily: fonts.body, fontSize: 11, color: colors.faint, lineHeight: 16, marginTop: 14 },

  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 18, borderWidth: 1, borderColor: colors.cardBorder, ...shadow.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 14 },
  iconBadge: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  iconGlyph: { fontSize: 19 },
  cardTitle: { flex: 1, fontFamily: fonts.displaySemi, fontSize: 17, color: colors.text },
  pill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.xs, borderWidth: 1 },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1 },
  subhead: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 1, color: colors.dim, textTransform: 'uppercase', marginTop: 16, marginBottom: 10 },
  check: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(103,232,195,0.15)', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkGlyph: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.mint },
  body: { fontFamily: fonts.body, fontSize: 13, color: colors.dim, lineHeight: 20 },
  bodyStrong: { fontFamily: fonts.bodyBold, color: colors.text },
  list: { marginTop: 12, gap: 9 },
  factRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  bullet: { width: 7, height: 7, borderRadius: 7, marginTop: 6 },
  factText: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.text, lineHeight: 19 },

  settingsBtn: { marginTop: 16, paddingVertical: 13, borderRadius: radius.pill, alignItems: 'center', backgroundColor: 'rgba(103,232,195,0.12)', borderWidth: 1, borderColor: 'rgba(103,232,195,0.3)' },
  settingsBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.mint },
  path: { fontFamily: fonts.body, fontSize: 12, color: colors.faint, textAlign: 'center', marginTop: 8 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
});
