import { FlatList, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, shadow } from './theme';
import { formatBytes } from './media';
import AnimatedNumber from './AnimatedNumber';
import { getAchievements } from './achievements';

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Badge({ b }) {
  return (
    <View style={[styles.badge, b.earned ? styles.badgeOn : styles.badgeOff]}>
      <Text style={[styles.badgeGlyph, { color: b.earned ? colors.mint : colors.faint }]}>{b.glyph}</Text>
      <Text style={[styles.badgeName, !b.earned && { color: colors.dim }]} numberOfLines={1}>{b.name}</Text>
      <Text style={styles.badgeHint} numberOfLines={1}>{b.earned ? 'Unlocked' : b.hint}</Text>
    </View>
  );
}

export default function HistoryScreen({ stats }) {
  const history = stats?.history || [];
  const ach = getAchievements(stats);

  return (
    <View style={styles.wrap}>
      <Text style={styles.h1}>History</Text>
      <FlatList
        data={history}
        keyExtractor={(_, i) => 'h' + i}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
        ListHeaderComponent={
          <View>
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>TOTAL FREED</Text>
              <AnimatedNumber value={stats?.totalFreed || 0} format={formatBytes} style={styles.heroNum} />
              <Text style={styles.heroSub}>{(stats?.totalItems || 0).toLocaleString()} items removed all-time</Text>
              <View style={styles.streakPill}>
                <Text style={styles.streakText}>
                  {ach.streak > 0 ? `↺  ${ach.streak}-day streak` : 'Start a cleanup streak today'}
                </Text>
              </View>
            </View>

            <Text style={styles.section}>
              Achievements · {ach.earnedCount}/{ach.badges.length}
            </Text>
            <View style={styles.badgeGrid}>
              {ach.badges.map((b) => (
                <Badge key={b.id} b={b} />
              ))}
            </View>

            {history.length > 0 && <Text style={styles.section}>Recent cleanups</Text>}
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>No cleanups yet — free up some space and it'll show up here.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.dot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowKind}>{item.kind}</Text>
              <Text style={styles.rowTime}>
                {timeAgo(item.ts)} · {item.count} item{item.count === 1 ? '' : 's'}
              </Text>
            </View>
            <Text style={styles.rowBytes}>{formatBytes(item.bytes)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 66, paddingHorizontal: 20 },
  h1: { fontFamily: fonts.displayX, fontSize: 30, color: colors.text, marginBottom: 18 },
  heroCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder, ...shadow.sm },
  heroLabel: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 3, color: colors.dim },
  heroNum: { fontFamily: fonts.displayX, fontSize: 46, color: colors.mint, marginTop: 6 },
  heroSub: { fontFamily: fonts.body, fontSize: 13, color: colors.faint, marginTop: 4 },
  streakPill: { marginTop: 14, backgroundColor: 'rgba(103,232,195,0.12)', borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(103,232,195,0.22)' },
  streakText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.mint },
  section: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 1.5, color: colors.dim, textTransform: 'uppercase', marginTop: 24, marginBottom: 12 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { width: '47.5%', borderRadius: radius.md, padding: 14, borderWidth: 1 },
  badgeOn: { backgroundColor: 'rgba(103,232,195,0.07)', borderColor: 'rgba(103,232,195,0.25)' },
  badgeOff: { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: 0.7 },
  badgeGlyph: { fontSize: 20 },
  badgeName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text, marginTop: 8 },
  badgeHint: { fontFamily: fonts.body, fontSize: 11, color: colors.faint, marginTop: 2 },
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.dim, textAlign: 'center', marginTop: 24, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  dot: { width: 8, height: 8, borderRadius: 8, backgroundColor: colors.mint },
  rowKind: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  rowTime: { fontFamily: fonts.body, fontSize: 12, color: colors.dim, marginTop: 2 },
  rowBytes: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
});
