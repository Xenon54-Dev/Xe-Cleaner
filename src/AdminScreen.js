import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, shadow } from './theme';
import { formatBytes } from './media';
import { getUserCount } from './auth/authStore';
import { clearStats } from './storage';
import AnimatedNumber from './AnimatedNumber';

function StatCard({ label, value, format, accent }) {
  return (
    <View style={styles.statCard}>
      <AnimatedNumber value={value} format={format} style={[styles.statValue, accent && { color: colors.mint }]} />
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const intFmt = (n) => Math.round(n).toLocaleString();

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminScreen({ user, stats, onSignOut, onStatsReset }) {
  const [users, setUsers] = useState(null);
  useEffect(() => {
    getUserCount().then(setUsers);
  }, []);

  const history = stats?.history || [];

  function confirmReset() {
    Alert.alert('Reset statistics?', 'This clears the lifetime totals and cleanup history on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await clearStats();
          onStatsReset && onStatsReset();
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
      <View style={styles.titleRow}>
        <Text style={styles.h1}>CEO Console</Text>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      </View>
      <Text style={styles.signedAs}>
        {user?.name} · {user?.email}
      </Text>

      <Text style={styles.section}>Analytics</Text>
      <View style={styles.grid}>
        <StatCard label="TOTAL FREED" value={stats?.totalFreed || 0} format={formatBytes} accent />
        <StatCard label="ITEMS REMOVED" value={stats?.totalItems || 0} format={intFmt} />
      </View>
      <View style={styles.grid}>
        <StatCard label="CLEANUPS" value={history.length} format={intFmt} />
        <StatCard label="REGISTERED USERS" value={users || 0} format={intFmt} />
      </View>

      <Text style={styles.section}>Recent activity</Text>
      <View style={styles.activityCard}>
        {history.length === 0 ? (
          <Text style={styles.empty}>No activity recorded yet.</Text>
        ) : (
          history.slice(0, 6).map((h, i) => (
            <View key={i} style={[styles.activityRow, i > 0 && styles.activityDivider]}>
              <View style={styles.dot} />
              <Text style={styles.activityKind}>{h.kind}</Text>
              <Text style={styles.activityMeta}>
                {timeAgo(h.ts)} · {formatBytes(h.bytes)}
              </Text>
            </View>
          ))
        )}
      </View>

      <Text style={styles.section}>Controls</Text>
      <Pressable onPress={confirmReset} style={({ pressed }) => [styles.control, pressed && styles.pressed]}>
        <Text style={styles.controlText}>Reset statistics</Text>
        <Text style={styles.controlChevron}>›</Text>
      </Pressable>
      <Pressable onPress={onSignOut} style={({ pressed }) => [styles.control, styles.signOut, pressed && styles.pressed]}>
        <Text style={[styles.controlText, { color: colors.danger }]}>Sign out</Text>
      </Pressable>

      <Text style={styles.note}>
        This console is gated by role-based access control. In production, admin verification should run on a backend —
        client-side roles can be bypassed.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 66, paddingHorizontal: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  h1: { fontFamily: fonts.displayX, fontSize: 30, color: colors.text },
  adminBadge: { backgroundColor: 'rgba(139,108,255,0.18)', borderRadius: radius.xs, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(139,108,255,0.5)' },
  adminBadgeText: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.5, color: colors.violet },
  signedAs: { fontFamily: fonts.body, fontSize: 13, color: colors.dim, marginTop: 6, marginBottom: 8 },
  section: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 1.5, color: colors.dim, textTransform: 'uppercase', marginTop: 24, marginBottom: 12 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: 18, borderWidth: 1, borderColor: colors.cardBorder, ...shadow.sm },
  statValue: { fontFamily: fonts.displayX, fontSize: 22, color: colors.text },
  statLabel: { fontFamily: fonts.bodySemi, fontSize: 10, letterSpacing: 1, color: colors.faint, marginTop: 6 },
  activityCard: { backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.cardBorder },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  activityDivider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  dot: { width: 7, height: 7, borderRadius: 7, backgroundColor: colors.mint },
  activityKind: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text, flex: 1 },
  activityMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.dim },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.dim, paddingVertical: 16, textAlign: 'center' },
  control: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 16, paddingHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.cardBorder },
  signOut: { borderColor: 'rgba(255,92,106,0.35)' },
  controlText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  controlChevron: { fontFamily: fonts.display, fontSize: 22, color: colors.faint },
  note: { fontFamily: fonts.body, fontSize: 11, color: colors.faint, lineHeight: 16, marginTop: 18 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
});
