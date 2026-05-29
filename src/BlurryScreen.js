import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Dimensions } from 'react-native';
import { colors, fonts, radius } from './theme';
import ProgressBar from './ProgressBar';
import PreviewModal from './PreviewModal';
import { scanBlurry } from './blurry';
import { deleteAssets } from './media';

const TILE = Math.floor((Dimensions.get('window').width - 44 - 16) / 3);

function BlurTile({ asset, selected, onPress, onLongPress }) {
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={250} style={[styles.tile, selected && styles.tileSel]}>
      <Image source={{ uri: asset.uri }} style={styles.img} contentFit="cover" transition={120} />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{asset.blur}% blur</Text>
      </View>
      <View style={[styles.check, selected && styles.checkOn]}>{selected && <Text style={styles.checkMark}>✓</Text>}</View>
    </Pressable>
  );
}

export default function BlurryScreen({ settings, onBack, onCleaned }) {
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
      const res = await scanBlurry({
        depth: settings?.depth || 150,
        onProgress: (done, total) => id === runId.current && setProgress({ done, total }),
      });
      if (id !== runId.current) return;
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

  const assets = result?.blurry || [];
  const selectedIds = Object.keys(selected);
  const selectedCount = selectedIds.length;
  const allSelected = selectedCount === assets.length && assets.length > 0;

  function toggle(id) {
    setSelected((p) => {
      const n = { ...p };
      if (n[id]) delete n[id];
      else n[id] = true;
      return n;
    });
  }
  function selectAll() {
    if (allSelected) setSelected({});
    else {
      const all = {};
      assets.forEach((a) => (all[a.id] = true));
      setSelected(all);
    }
  }

  async function handleDelete() {
    if (selectedCount === 0) return;
    setDeleting(true);
    try {
      const ok = await deleteAssets(selectedIds);
      if (ok) {
        const del = new Set(selectedIds);
        setResult((prev) => (prev ? { ...prev, blurry: prev.blurry.filter((a) => !del.has(a.id)) } : prev));
        setSelected({});
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
        setResult((prev) => (prev ? { ...prev, blurry: prev.blurry.filter((a) => a.id !== asset.id) } : prev));
        if (onCleaned) onCleaned(1);
      }
    } catch (e) {
      Alert.alert('Delete failed', e.message);
    }
    setPreview(null);
  }

  const pct = progress.total ? progress.done / progress.total : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={14} style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.headerBtn}>‹  Back</Text>
        </Pressable>
        <Text style={styles.title}>Blurry Photos</Text>
        <Pressable onPress={selectAll} hitSlop={14} style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.headerBtn}>{allSelected ? 'Clear' : 'All'}</Text>
        </Pressable>
      </View>

      {phase === 'scanning' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.mint} />
          <Text style={styles.scanTitle}>Analyzing sharpness</Text>
          <Text style={styles.scanSub}>{progress.done} of {progress.total || '…'} photos</Text>
          <View style={styles.barWrap}>
            <ProgressBar progress={pct} />
          </View>
        </View>
      )}

      {phase === 'error' && (
        <View style={styles.center}>
          <Text style={styles.err}>Scan failed: {error}</Text>
          <Pressable onPress={run} style={({ pressed }) => [styles.rescan, pressed && styles.pressed]}>
            <Text style={styles.rescanText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {phase === 'done' && assets.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No blurry photos found</Text>
          <Text style={styles.emptySub}>Scanned {result?.scanned || 0} recent photos — they all look sharp.</Text>
          <Pressable onPress={run} style={({ pressed }) => [styles.rescan, pressed && styles.pressed]}>
            <Text style={styles.rescanText}>Rescan</Text>
          </Pressable>
        </View>
      )}

      {phase === 'done' && assets.length > 0 && (
        <>
          <Text style={styles.summary}>{assets.length} blurry photos · review before deleting</Text>
          <FlatList
            style={styles.flex1}
            data={assets}
            keyExtractor={(item) => item.id}
            numColumns={3}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <BlurTile asset={item} selected={!!selected[item.id]} onPress={() => toggle(item.id)} onLongPress={() => setPreview(item)} />
            )}
          />
          <View style={styles.footer}>
            <Text style={styles.footerCount}>{selectedCount} selected</Text>
            <Pressable
              onPress={handleDelete}
              disabled={selectedCount === 0 || deleting}
              style={({ pressed }) => [styles.deleteBtn, (selectedCount === 0 || deleting) && styles.deleteDisabled, pressed && styles.pressed]}
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

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 66, paddingHorizontal: 22 },
  flex1: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerBtn: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.mint },
  title: { fontFamily: fonts.display, fontSize: 18, color: colors.text },
  scanTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text, marginTop: 22 },
  scanSub: { fontFamily: fonts.body, fontSize: 14, color: colors.dim, marginTop: 6 },
  barWrap: { width: '80%', marginTop: 18 },
  err: { fontFamily: fonts.body, fontSize: 14, color: colors.danger, textAlign: 'center', marginBottom: 18 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  emptySub: { fontFamily: fonts.body, fontSize: 14, color: colors.dim, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  rescan: { marginTop: 22, paddingVertical: 14, paddingHorizontal: 30, borderRadius: radius.pill, backgroundColor: colors.mint },
  rescanText: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#06140F' },
  summary: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.dim, marginBottom: 12 },
  gridRow: { gap: 8, marginBottom: 8 },
  tile: { width: TILE, height: TILE, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.cardStrong },
  tileSel: { borderWidth: 3, borderColor: colors.mint },
  img: { width: '100%', height: '100%' },
  badge: { position: 'absolute', left: 6, bottom: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: '#fff', fontFamily: fonts.bodySemi, fontSize: 9 },
  check: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#fff', backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.mint, borderColor: colors.mint },
  checkMark: { color: '#06140F', fontSize: 14, fontFamily: fonts.bodyBold },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 30, paddingHorizontal: 18, marginHorizontal: -22, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  footerCount: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  deleteBtn: { backgroundColor: colors.danger, paddingVertical: 13, paddingHorizontal: 24, borderRadius: radius.pill, minWidth: 104, alignItems: 'center' },
  deleteDisabled: { backgroundColor: 'rgba(255,92,106,0.28)' },
  deleteText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#fff' },
});
