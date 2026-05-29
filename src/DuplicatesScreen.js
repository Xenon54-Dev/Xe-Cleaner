import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, fonts, radius } from './theme';
import ProgressBar from './ProgressBar';
import { SENSITIVITY } from './storage';
import { scanDuplicates } from './duplicates';
import { deleteAssets } from './media';
import PreviewModal from './PreviewModal';

export default function DuplicatesScreen({ settings, onBack, onOpenSettings, onCleaned }) {
  const [phase, setPhase] = useState('scanning');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState({});
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const runId = useRef(0);

  async function run() {
    const id = ++runId.current;
    setPhase('scanning');
    setError(null);
    setResult(null);
    setSelected({});
    setProgress({ done: 0, total: 0 });
    try {
      const threshold = SENSITIVITY[settings.sensitivity]?.threshold ?? 8;
      const res = await scanDuplicates({
        depth: settings.depth,
        threshold,
        onProgress: (done, total) => {
          if (id === runId.current) setProgress({ done, total });
        },
      });
      if (id !== runId.current) return;
      const pre = {};
      res.groups.forEach((g) => g.assets.forEach((a) => { if (a.isExtra) pre[a.id] = true; }));
      setSelected(pre);
      setResult(res);
      setPhase('done');
    } catch (e) {
      if (id === runId.current) {
        setError(e.message);
        setPhase('error');
      }
    }
  }

  useEffect(() => {
    run();
  }, []);

  const selectedIds = Object.keys(selected);
  const selectedCount = selectedIds.length;

  function toggle(id) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  }

  function removeDeleted(ids) {
    const del = new Set(ids);
    setResult((prev) => {
      if (!prev) return prev;
      const groups = prev.groups
        .map((g) => ({ ...g, assets: g.assets.filter((a) => !del.has(a.id)) }))
        .filter((g) => g.assets.length >= 2)
        .map((g) => ({ ...g, assets: g.assets.map((a, k) => ({ ...a, isExtra: k > 0 })), count: g.assets.length }));
      const extras = groups.reduce((s, g) => s + (g.assets.length - 1), 0);
      return { ...prev, groups, extras };
    });
    setSelected((prev) => {
      const n = { ...prev };
      ids.forEach((id) => delete n[id]);
      return n;
    });
  }

  async function handleDelete() {
    if (selectedCount === 0) return;
    setDeleting(true);
    try {
      const ok = await deleteAssets(selectedIds);
      if (ok) {
        removeDeleted(selectedIds);
        if (onCleaned) onCleaned(selectedIds.length);
      }
    } catch (e) {
      Alert.alert('Delete failed', e.message);
    } finally {
      setDeleting(false);
    }
  }

  async function previewDelete(asset) {
    try {
      const ok = await deleteAssets([asset.id]);
      if (ok) {
        removeDeleted([asset.id]);
        if (onCleaned) onCleaned(1);
      }
    } catch (e) {
      Alert.alert('Delete failed', e.message);
    }
    setPreview(null);
  }

  function showDetails() {
    if (!result) return;
    Alert.alert(
      'Scan details',
      `Photos scanned: ${result.scanned}\nFingerprinted: ${result.hashed}\n  • new: ${result.computed}\n  • from cache: ${result.fromCache}\n  • skipped (iCloud/err): ${result.failed}\n\nGroups: ${result.groups.length}\nRemovable extras: ${result.extras}\nSensitivity: ${SENSITIVITY[settings.sensitivity]?.label}`
    );
  }

  const pct = progress.total ? progress.done / progress.total : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={14} style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.headerBtn}>‹  Back</Text>
        </Pressable>
        <Text style={styles.title}>Duplicates</Text>
        <Pressable onPress={onOpenSettings} hitSlop={14} style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.gear}>⚙</Text>
        </Pressable>
      </View>

      {phase === 'scanning' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.mint} />
          <Text style={styles.scanTitle}>Analyzing your photos</Text>
          <Text style={styles.scanSub}>
            {progress.done} of {progress.total || '…'} fingerprinted
          </Text>
          <View style={styles.barWrap}>
            <ProgressBar progress={pct} />
          </View>
          <Text style={styles.scanHint}>{SENSITIVITY[settings.sensitivity]?.label} · {settings.depth} deep</Text>
        </View>
      )}

      {phase === 'error' && (
        <View style={styles.center}>
          <Text style={styles.errorText}>Scan failed: {error}</Text>
          <Pressable onPress={run} style={({ pressed }) => [styles.rescanBtn, pressed && styles.pressed]}>
            <Text style={styles.rescanText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {phase === 'done' && result && result.groups.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No duplicates found</Text>
          <Text style={styles.emptySub}>
            Scanned {result.scanned} photos. Try a looser sensitivity or a deeper scan in settings.
          </Text>
          <Pressable onPress={onOpenSettings} style={({ pressed }) => [styles.rescanBtn, pressed && styles.pressed]}>
            <Text style={styles.rescanText}>Adjust settings</Text>
          </Pressable>
          <Pressable onPress={run} style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}>
            <Text style={styles.linkText}>Rescan</Text>
          </Pressable>
        </View>
      )}

      {phase === 'done' && result && result.groups.length > 0 && (
        <>
          <Pressable onPress={showDetails} style={({ pressed }) => [styles.summary, pressed && styles.pressed]}>
            <Text style={styles.summaryText}>
              {result.groups.length} groups · {result.extras} extra copies
            </Text>
            <Text style={styles.summaryLink}>Details</Text>
          </Pressable>

          <FlatList
            style={styles.flex1}
            data={result.groups}
            keyExtractor={(_, i) => 'g' + i}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
            renderItem={({ item }) => (
              <View style={styles.group}>
                <View style={styles.groupHead}>
                  <Text style={styles.groupTitle}>Group of {item.count}</Text>
                  <Text style={styles.groupMatch}>~{item.similarity}% match</Text>
                </View>
                <View style={styles.tiles}>
                  {item.assets.map((a) => (
                    <GroupTile
                      key={a.id}
                      asset={a}
                      selected={!!selected[a.id]}
                      onPress={() => toggle(a.id)}
                      onLongPress={() => setPreview(a)}
                    />
                  ))}
                </View>
              </View>
            )}
          />

          <View style={styles.footer}>
            <Text style={styles.footerCount}>{selectedCount} selected to remove</Text>
            <Pressable
              onPress={handleDelete}
              disabled={selectedCount === 0 || deleting}
              style={({ pressed }) => [
                styles.deleteBtn,
                (selectedCount === 0 || deleting) && styles.deleteDisabled,
                pressed && styles.pressed,
              ]}
            >
              {deleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.deleteText}>Delete {selectedCount > 0 ? selectedCount : ''}</Text>}
            </Pressable>
          </View>
        </>
      )}
      <PreviewModal asset={preview} onClose={() => setPreview(null)} onDelete={previewDelete} />
    </View>
  );
}

function GroupTile({ asset, selected, onPress, onLongPress }) {
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={250} style={[styles.gtile, selected && styles.gtileSel]}>
      <Image source={{ uri: asset.uri }} style={styles.gimg} contentFit="cover" transition={120} />
      {selected ? (
        <View style={styles.gcheckOn}>
          <Text style={styles.gcheckMark}>✓</Text>
        </View>
      ) : !asset.isExtra ? (
        <View style={styles.keepBadge}>
          <Text style={styles.keepBadgeText}>KEEP</Text>
        </View>
      ) : null}
      {asset.isExtra && asset.distance > 0 && (
        <View style={styles.dBadge}>
          <Text style={styles.dBadgeText}>Δ{asset.distance}</Text>
        </View>
      )}
    </Pressable>
  );
}

const TILE = 92;

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 66, paddingHorizontal: 20 },
  flex1: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerBtn: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.mint },
  title: { fontFamily: fonts.display, fontSize: 18, color: colors.text },
  gear: { fontSize: 20, color: colors.mint },

  scanTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text, marginTop: 22 },
  scanSub: { fontFamily: fonts.body, fontSize: 14, color: colors.dim, marginTop: 6 },
  barWrap: { width: '80%', marginTop: 18 },
  scanHint: { fontFamily: fonts.body, fontSize: 12, color: colors.faint, marginTop: 14 },

  errorText: { fontFamily: fonts.body, fontSize: 14, color: colors.danger, textAlign: 'center', marginBottom: 18 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  emptySub: { fontFamily: fonts.body, fontSize: 14, color: colors.dim, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  rescanBtn: {
    marginTop: 22, paddingVertical: 14, paddingHorizontal: 30, borderRadius: radius.pill,
    backgroundColor: colors.mint,
  },
  rescanText: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#06140F' },
  linkBtn: { marginTop: 14 },
  linkText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.mint },

  summary: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.md, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  summaryText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  summaryLink: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.mint },

  group: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  groupTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  groupMatch: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.mint },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  gtile: { width: TILE, height: TILE, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.cardStrong },
  gtileSel: { borderWidth: 3, borderColor: colors.mint },
  gimg: { width: '100%', height: '100%' },
  keepBadge: {
    position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  keepBadgeText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.5 },
  gcheckOn: {
    position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center',
  },
  gcheckMark: { color: '#06140F', fontSize: 14, fontFamily: fonts.bodyBold },
  dBadge: {
    position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1,
  },
  dBadgeText: { color: '#fff', fontFamily: fonts.bodySemi, fontSize: 9 },

  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 16, paddingBottom: 30, paddingHorizontal: 18, marginHorizontal: -20,
    borderTopWidth: 1, borderTopColor: colors.cardBorder,
  },
  footerCount: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  deleteBtn: {
    backgroundColor: colors.danger, paddingVertical: 13, paddingHorizontal: 24, borderRadius: radius.pill,
    minWidth: 104, alignItems: 'center',
  },
  deleteDisabled: { backgroundColor: 'rgba(255,92,106,0.28)' },
  deleteText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#fff' },
});
