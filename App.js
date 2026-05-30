import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { useFonts } from 'expo-font';
import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';

import { colors, fonts, radius, shadow, ACTIVE_HOLIDAY, IS_RARE_THEME, RARE_THEME } from './src/theme';
import StorageRing from './src/StorageRing';
import Aurora from './src/Aurora';
import AnimatedNumber from './src/AnimatedNumber';
import Confetti from './src/Confetti';
import SeasonalLayer from './src/SeasonalLayer';
import Logo from './src/Logo';
import PreviewModal from './src/PreviewModal';
import SwipeReview from './src/SwipeReview';
import DuplicatesScreen from './src/DuplicatesScreen';
import Onboarding from './src/Onboarding';
import TabBar from './src/TabBar';
import HistoryScreen from './src/HistoryScreen';
import SettingsScreen from './src/SettingsScreen';
import FreedToast from './src/FreedToast';
import Splash from './src/Splash';
import AuthScreen from './src/auth/AuthScreen';
import AdminScreen from './src/AdminScreen';
import InsightsScreen from './src/InsightsScreen';
import { recordStorageSample } from './src/insights';
import BoostScreen from './src/BoostScreen';
import BlurryScreen from './src/BlurryScreen';
import Paywall from './src/Paywall';
import { restoreSession, signOut as authSignOut, getBiometricEnabled, setBiometricEnabled } from './src/auth/authStore';
import { getBiometricInfo } from './src/auth/biometric';
import { getDeviceStorage } from './src/device';
import { tapSelect, tapSuccess } from './src/haptics';
import {
  loadSettings,
  saveSettings,
  clearHashCache,
  DEFAULT_SETTINGS,
  getStats,
  recordCleanup,
  isOnboarded,
  setOnboardedFlag,
  getPremium,
  setPremium,
} from './src/storage';
import {
  formatBytes,
  formatDuration,
  getOverview,
  getScreenshots,
  getLargeVideos,
  getLargePhotos,
  getRecentPhotos,
  deleteAssets,
} from './src/media';

const SCREEN_W = Dimensions.get('window').width;
const TILE = Math.floor((SCREEN_W - 40 - 16) / 3);
const GB = 1024 ** 3;
const EST_PHOTO = 2.2 * 1024 * 1024;

const CATS = {
  videos: { title: 'Large Videos', list: true },
  photos: { title: 'Large Photos', list: false },
  screenshots: { title: 'Screenshots', list: false },
};

function splitBytes(bytes) {
  if (!bytes || bytes < 1) return { value: 0, unit: 'MB', decimals: 0 };
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  const decimals = i <= 1 ? 0 : value >= 100 ? 0 : 1;
  return { value, unit: units[i], decimals };
}

function ringProgress(bytes) {
  if (!bytes || bytes <= 0) return 0;
  return Math.max(0.35, Math.min(0.92, 0.35 + (bytes / (8 * GB)) * 0.57));
}

// Aurora background lives in ./src/Aurora (animated gradient mesh).

export default function App() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  const [permission, requestPermission] = MediaLibrary.usePermissions();
  const [onboarded, setOnboarded] = useState(null);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [savedSession, setSavedSession] = useState(null);
  const [biometricInfo, setBiometricInfo] = useState(null);
  const [minSplashDone, setMinSplashDone] = useState(false);
  const [premium, setPremiumState] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [tab, setTab] = useState('clean');
  const [screen, setScreen] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState({});
  const [deleting, setDeleting] = useState(false);
  const [revealKey, setRevealKey] = useState(0);
  const [preview, setPreview] = useState(null);
  const [swipePhotos, setSwipePhotos] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [stats, setStats] = useState({ totalFreed: 0, totalItems: 0, history: [] });
  const [deviceStorage, setDeviceStorage] = useState(null);
  const [toast, setToast] = useState(null);

  const anims = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0))).current;
  const tabAnim = useRef(new Animated.Value(1)).current;
  const rareShown = useRef(false);

  useEffect(() => {
    (async () => {
      setSettings(await loadSettings());
      setStats(await getStats());
      const ds = await getDeviceStorage();
      setDeviceStorage(ds);
      recordStorageSample(ds);
      setOnboarded(await isOnboarded());
      const session = await restoreSession();
      const bioInfo = await getBiometricInfo();
      setBiometricInfo(bioInfo);
      if (session) {
        const bioEnabled = await getBiometricEnabled();
        if (bioEnabled && bioInfo.available) {
          setSavedSession(session); // require biometric unlock
        } else {
          setUser(session);
        }
      }
      setPremiumState(await getPremium());
      setAuthChecked(true);
    })();
  }, []);

  useEffect(() => {
    if (revealKey === 0) return;
    anims.forEach((a) => a.setValue(0));
    Animated.stagger(
      90,
      anims.map((a) => Animated.timing(a, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }))
    ).start();
  }, [revealKey]);

  useEffect(() => {
    tabAnim.setValue(0);
    Animated.timing(tabAnim, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [tab]);

  useEffect(() => {
    const t = setTimeout(() => setMinSplashDone(true), 2000);
    return () => clearTimeout(t);
  }, []);

  // Lucky launch — 1-in-100 rare theme rolled. Celebrate once the user lands.
  useEffect(() => {
    if (user && IS_RARE_THEME && !rareShown.current) {
      rareShown.current = true;
      setTimeout(() => setToast({ text: `✨ Rare theme: ${RARE_THEME}`, id: Date.now() }), 700);
    }
  }, [user]);

  const revealStyle = (i) => ({
    opacity: anims[i],
    transform: [{ translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }],
  });

  async function ensurePermission() {
    let perm = permission;
    if (!perm || !perm.granted) perm = await requestPermission();
    return perm;
  }

  async function onGetStarted() {
    await ensurePermission();
    await setOnboardedFlag();
    setOnboarded(true);
  }

  async function doSignOut() {
    await authSignOut();
    setUser(null);
    setSavedSession(null);
    setTab('clean');
  }

  function continueAsGuest() {
    handleAuthed({ name: 'Guest', email: '', role: 'user', guest: true });
  }

  async function handleAuthed(session) {
    setUser(session);
    setSavedSession(null);
    // Offer Face ID enrollment after first successful sign-in.
    if (biometricInfo?.available && !(await getBiometricEnabled()) && !session.guest) {
      setTimeout(() => {
        Alert.alert(
          `Enable ${biometricInfo.label}?`,
          `Sign in faster next time using ${biometricInfo.label}.`,
          [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'Enable',
              onPress: async () => {
                await setBiometricEnabled(true);
                showToast(`${biometricInfo.label} enabled`);
              },
            },
          ]
        );
      }, 500);
    }
  }
  function refreshStats() {
    getStats().then(setStats);
  }

  const isPremium = user?.role === 'admin' || premium;
  async function doUpgrade() {
    setPremiumState(true);
    await setPremium(true);
    setShowPaywall(false);
    showToast('Welcome to Pro');
  }

  function showToast(text) {
    setToast({ text, id: Date.now() });
  }

  async function afterCleaned(bytes, count, kind) {
    tapSuccess();
    showToast(`Freed ${formatBytes(bytes)}`);
    const next = await recordCleanup({ bytes, count, kind });
    if (next) setStats(next);
    getDeviceStorage().then((s) => s && setDeviceStorage(s));
  }

  async function handleScan() {
    setError(null);
    setScanning(true);
    try {
      const perm = await ensurePermission();
      if (!perm.granted) {
        setError('Photo access is off. Enable it in Settings to scan your library.');
        return;
      }
      setProgress('Counting your library');
      const overview = await getOverview();
      setProgress('Finding screenshots');
      const screenshots = await getScreenshots(120);
      setProgress('Measuring large videos');
      const videos = await getLargeVideos(18);
      setProgress('Measuring large photos');
      const photos = await getLargePhotos(40, 20);
      setData({
        overview: { ...overview, screenshots: screenshots.count, limited: perm.accessPrivileges === 'limited' },
        videos,
        photos,
        screenshots,
      });
      setRevealKey((k) => k + 1);
    } catch (e) {
      setError('Scan failed: ' + e.message);
    } finally {
      setScanning(false);
      setProgress('');
    }
  }

  function openCategory(key) {
    setSelected({});
    setScreen(key);
  }
  function closeDetail() {
    setSelected({});
    setScreen(null);
  }
  function toggle(id) {
    tapSelect();
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  }

  function assetsFor(key) {
    if (!data) return [];
    if (key === 'videos') return data.videos.assets;
    if (key === 'photos') return data.photos.assets;
    if (key === 'screenshots') return data.screenshots.assets;
    return [];
  }

  function freedBytesFor(assets) {
    return assets.reduce((s, a) => s + (a.bytes || EST_PHOTO), 0);
  }

  function removeFromState(ids) {
    const del = new Set(ids);
    const n = ids.length;
    setData((prev) => {
      if (!prev) return prev;
      const d = { ...prev };
      const ov = { ...prev.overview };
      if (screen === 'videos') {
        const assets = prev.videos.assets.filter((a) => !del.has(a.id));
        d.videos = { ...prev.videos, assets, total: assets.reduce((s, v) => s + v.bytes, 0) };
        ov.videos = Math.max(0, ov.videos - n);
      } else if (screen === 'photos') {
        const assets = prev.photos.assets.filter((a) => !del.has(a.id));
        d.photos = { ...prev.photos, assets, total: assets.reduce((s, v) => s + v.bytes, 0) };
        ov.photos = Math.max(0, ov.photos - n);
      } else if (screen === 'screenshots') {
        const assets = prev.screenshots.assets.filter((a) => !del.has(a.id));
        d.screenshots = { ...prev.screenshots, assets, count: Math.max(0, prev.screenshots.count - n) };
        ov.photos = Math.max(0, ov.photos - n);
        ov.screenshots = Math.max(0, ov.screenshots - n);
      }
      d.overview = ov;
      return d;
    });
  }

  const activeAssets = assetsFor(screen);
  const selectedIds = Object.keys(selected);
  const selectedCount = selectedIds.length;

  function selectAll() {
    if (selectedCount === activeAssets.length) setSelected({});
    else {
      const all = {};
      activeAssets.forEach((a) => (all[a.id] = true));
      setSelected(all);
    }
  }

  async function handleDelete() {
    if (selectedCount === 0) return;
    setDeleting(true);
    const dabs = activeAssets.filter((a) => selected[a.id]);
    try {
      const ok = await deleteAssets(selectedIds);
      if (ok) {
        removeFromState(selectedIds);
        afterCleaned(freedBytesFor(dabs), dabs.length, CATS[screen]?.title || 'Cleanup');
        setSelected({});
      }
    } catch (e) {
      Alert.alert('Delete failed', e.message);
    } finally {
      setDeleting(false);
    }
  }

  async function deleteOne(asset) {
    try {
      const ok = await deleteAssets([asset.id]);
      if (ok) {
        removeFromState([asset.id]);
        afterCleaned(asset.bytes || EST_PHOTO, 1, CATS[screen]?.title || 'Cleanup');
      }
    } catch (e) {
      Alert.alert('Delete failed', e.message);
    }
    setPreview(null);
  }

  async function openSwipe() {
    setError(null);
    try {
      const perm = await ensurePermission();
      if (!perm.granted) {
        setError('Photo access is off. Enable it in Settings.');
        return;
      }
      const photos = await getRecentPhotos(100);
      if (!photos.length) {
        setError('No photos to review yet.');
        return;
      }
      setSwipePhotos(photos);
      setScreen('swipe');
    } catch (e) {
      setError('Could not start swipe: ' + e.message);
    }
  }

  async function finishSwipe(ids) {
    setScreen(null);
    setSwipePhotos([]);
    if (ids && ids.length) {
      try {
        const ok = await deleteAssets(ids);
        if (ok) afterCleaned(ids.length * EST_PHOTO, ids.length, 'Swipe cleanup');
      } catch {
        // user cancelled the system dialog
      }
    }
  }

  function changeSettings(s) {
    setSettings(s);
    saveSettings(s);
  }
  async function doClearCache() {
    await clearHashCache();
    Alert.alert('Cache cleared', 'Fingerprints will be recomputed on the next duplicate scan.');
  }

  // ---- Loading gate ----
  if (!fontsLoaded || onboarded === null || !authChecked || !minSplashDone) {
    return <Splash />;
  }

  // ---- Onboarding ----
  if (!onboarded) {
    return (
      <View style={styles.root}>
        <Aurora />
        <SeasonalLayer />
        <StatusBar style="light" />
        <Onboarding onGetStarted={onGetStarted} />
      </View>
    );
  }

  // ---- Auth ----
  if (!user) {
    return (
      <View style={styles.root}>
        <Aurora />
        <SeasonalLayer />
        <StatusBar style="light" />
        <AuthScreen
          onAuthed={handleAuthed}
          onGuest={continueAsGuest}
          savedSession={savedSession}
          biometricInfo={biometricInfo}
          onBiometricUnlock={(s) => {
            setUser(s);
            setSavedSession(null);
          }}
        />
      </View>
    );
  }

  // ---- Swipe (full screen) ----
  if (screen === 'swipe') {
    return (
      <View style={styles.root}>
        <Aurora />
        <SeasonalLayer />
        <StatusBar style="light" />
        <SwipeReview photos={swipePhotos} onFinish={finishSwipe} />
        <FreedToast toast={toast} onHide={() => setToast(null)} />
      <Confetti trigger={toast ? toast.id : null} />
      </View>
    );
  }

  // ---- Duplicates (full screen) ----
  if (screen === 'duplicates') {
    return (
      <View style={styles.root}>
        <Aurora />
        <SeasonalLayer />
        <StatusBar style="light" />
        <DuplicatesScreen
          settings={settings}
          onBack={closeDetail}
          onOpenSettings={() => {
            setScreen(null);
            setTab('settings');
          }}
          onCleaned={(count) => afterCleaned(count * EST_PHOTO, count, 'Duplicates')}
        />
        <FreedToast toast={toast} onHide={() => setToast(null)} />
      <Confetti trigger={toast ? toast.id : null} />
      </View>
    );
  }

  // ---- Boost (full screen) ----
  if (screen === 'boost') {
    return (
      <View style={styles.root}>
        <Aurora />
        <SeasonalLayer />
        <StatusBar style="light" />
        <BoostScreen
          isPremium={isPremium}
          deviceStorage={deviceStorage}
          photoReclaimable={(data?.videos.total ?? 0) + (data?.photos.total ?? 0)}
          onBack={() => setScreen(null)}
          onUpgrade={() => setShowPaywall(true)}
          onGoClean={() => {
            setScreen(null);
            setTab('clean');
          }}
          onBoosted={(f) => afterCleaned(f, 0, 'Boost')}
        />
        <Paywall visible={showPaywall} onUpgrade={doUpgrade} onClose={() => setShowPaywall(false)} />
        <FreedToast toast={toast} onHide={() => setToast(null)} />
      <Confetti trigger={toast ? toast.id : null} />
      </View>
    );
  }

  // ---- Blurry (full screen) ----
  if (screen === 'blurry') {
    return (
      <View style={styles.root}>
        <Aurora />
        <SeasonalLayer />
        <StatusBar style="light" />
        <BlurryScreen
          settings={settings}
          onBack={() => setScreen(null)}
          onCleaned={(count) => afterCleaned(count * EST_PHOTO, count, 'Blurry photos')}
        />
        <FreedToast toast={toast} onHide={() => setToast(null)} />
      <Confetti trigger={toast ? toast.id : null} />
      </View>
    );
  }

  // ---- Category (full screen) ----
  if (screen) {
    const cat = CATS[screen];
    const isList = cat.list;
    const selectedBytes = activeAssets.filter((a) => selected[a.id]).reduce((s, a) => s + (a.bytes || 0), 0);
    const allSelected = selectedCount === activeAssets.length && activeAssets.length > 0;
    return (
      <View style={styles.root}>
        <Aurora />
        <SeasonalLayer />
        <StatusBar style="light" />
        <View style={styles.container}>
          <View style={styles.catHeader}>
            <Pressable onPress={closeDetail} hitSlop={14} style={({ pressed }) => pressed && styles.pressed}>
              <Text style={styles.backText}>‹  Back</Text>
            </Pressable>
            <Text style={styles.headerTitle}>{cat.title}</Text>
            <Pressable onPress={selectAll} hitSlop={14} style={({ pressed }) => pressed && styles.pressed}>
              <Text style={styles.selectAllText}>{allSelected ? 'Clear' : 'All'}</Text>
            </Pressable>
          </View>

          <FlatList
            key={screen}
            style={styles.flex1}
            data={activeAssets}
            keyExtractor={(item) => item.id}
            numColumns={isList ? 1 : 3}
            columnWrapperStyle={isList ? undefined : styles.gridRow}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) =>
              isList ? (
                <VideoRow asset={item} selected={!!selected[item.id]} onPress={() => toggle(item.id)} onLongPress={() => setPreview(item)} />
              ) : (
                <Tile asset={item} selected={!!selected[item.id]} onPress={() => toggle(item.id)} onLongPress={() => setPreview(item)} />
              )
            }
            ListEmptyComponent={<Text style={styles.muted}>Nothing here — you're all clean.</Text>}
          />

          <BlurView intensity={40} tint="dark" style={styles.footer}>
            <View>
              <Text style={styles.footerCount}>{selectedCount} selected</Text>
              {selectedBytes > 0 && <Text style={styles.footerSize}>{formatBytes(selectedBytes)}</Text>}
            </View>
            <Pressable
              onPress={handleDelete}
              disabled={selectedCount === 0 || deleting}
              style={({ pressed }) => [styles.deleteBtn, (selectedCount === 0 || deleting) && styles.deleteDisabled, pressed && styles.pressed]}
            >
              {deleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.deleteBtnText}>Delete{selectedCount > 0 ? ` ${selectedCount}` : ''}</Text>}
            </Pressable>
          </BlurView>
        </View>
        <PreviewModal asset={preview} onClose={() => setPreview(null)} onDelete={deleteOne} />
        <FreedToast toast={toast} onHide={() => setToast(null)} />
      <Confetti trigger={toast ? toast.id : null} />
      </View>
    );
  }

  // ---- Tabs ----
  const reclaimable = (data?.videos.total ?? 0) + (data?.photos.total ?? 0);
  const { value, unit, decimals } = splitBytes(reclaimable);
  const usedPct = deviceStorage ? Math.min(100, Math.round((deviceStorage.used / deviceStorage.total) * 100)) : 0;
  const hour = new Date().getHours();
  const greeting = ACTIVE_HOLIDAY
    ? `Happy ${ACTIVE_HOLIDAY}`
    : hour < 12
    ? 'Good morning'
    : hour < 18
    ? 'Good afternoon'
    : 'Good evening';
  const firstName = user?.guest ? 'Welcome' : (user?.name || '').trim().split(' ')[0] || 'Welcome';
  const avatarInitial = (user?.name || 'U').trim().charAt(0).toUpperCase();

  return (
    <View style={styles.root}>
      <Aurora />
        <SeasonalLayer />
      <StatusBar style="light" />
      <Animated.View
        style={[styles.tabContent, { opacity: tabAnim, transform: [{ translateY: tabAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}
      >
        {tab === 'clean' && (
          <View style={styles.tabRoot}>
            <View style={styles.dashHeader}>
              <View style={styles.headerText}>
                <Text style={styles.greeting}>{greeting}</Text>
                <Text style={styles.greetingName} numberOfLines={1}>{firstName}</Text>
              </View>
              <Pressable onPress={() => setTab('settings')} hitSlop={12} style={({ pressed }) => pressed && styles.pressed}>
                <LinearGradient colors={[colors.mint, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarRing}>
                  <View style={styles.avatarInner}>
                    <Text style={styles.avatarText}>{avatarInitial}</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </View>

            {scanning && !data ? (
              <View style={styles.center}>
                <StorageRing size={210} stroke={16} progress={0.18}>
                  <ActivityIndicator size="large" color={colors.mint} />
                </StorageRing>
                <Text style={styles.progressText}>{progress}…</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.flex1}
                contentContainerStyle={styles.resultsContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={scanning} onRefresh={handleScan} tintColor={colors.mint} colors={[colors.mint]} />}
              >
                <Pressable onPress={() => setScreen('boost')} style={({ pressed }) => [pressed && styles.pressed]}>
                  <LinearGradient colors={['#142a4a', '#221a4d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.boostCard}>
                    <View style={styles.boostIcon}>
                      <Text style={styles.boostBolt}>⚡</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.boostTitle}>Boost &amp; Optimize</Text>
                      <Text style={styles.boostSub}>Clear cache and reclaim space</Text>
                    </View>
                    {!isPremium && (
                      <View style={styles.proTag}>
                        <Text style={styles.proTagText}>PRO</Text>
                      </View>
                    )}
                    <Text style={styles.boostArrow}>›</Text>
                  </LinearGradient>
                </Pressable>
                {deviceStorage && (
                  <View style={styles.storageCard}>
                    <View style={styles.storageTop}>
                      <Text style={styles.storageLabel}>iPhone Storage</Text>
                      <Text style={styles.storageFree}>{formatBytes(deviceStorage.free)} free</Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={{ width: `${usedPct}%`, height: '100%' }}>
                        <LinearGradient colors={[colors.mint, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, borderRadius: 8 }} />
                      </View>
                    </View>
                    <Text style={styles.storageTotal}>
                      {formatBytes(deviceStorage.used)} used of {formatBytes(deviceStorage.total)}
                    </Text>
                  </View>
                )}

                {!data ? (
                  <View style={styles.scanPrompt}>
                    <StorageRing size={230} stroke={18} progress={0}>
                      <View style={styles.ringInner}>
                        <Text style={styles.ringPrompt}>Ready</Text>
                        <Text style={styles.ringPromptSub}>Tap to scan</Text>
                      </View>
                    </StorageRing>
                    <Pressable onPress={handleScan} style={({ pressed }) => [{ marginTop: 30 }, pressed && styles.pressed]}>
                      <LinearGradient colors={[colors.mint, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryBtn}>
                        <Text style={styles.primaryBtnText}>Scan My Library</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <Animated.View style={[styles.heroWrap, revealStyle(0)]}>
                      <StorageRing size={224} stroke={18} progress={ringProgress(reclaimable)} animate>
                        <View style={styles.ringInner}>
                          <Text style={styles.heroLabel}>RECLAIMABLE</Text>
                          <View style={styles.heroNumRow}>
                            <AnimatedNumber value={value} format={(n) => n.toFixed(decimals)} style={styles.heroNumber} />
                            <Text style={styles.heroUnit}>{unit}</Text>
                          </View>
                          <Text style={styles.heroSub}>in {data.videos.assets.length + data.photos.assets.length} large files</Text>
                        </View>
                      </StorageRing>
                    </Animated.View>

                    <Animated.View style={revealStyle(1)}>
                      <View style={styles.chipsRow}>
                        <Chip value={data.overview.photos.toLocaleString()} label="Photos" />
                        <Chip value={data.overview.videos.toLocaleString()} label="Videos" />
                        <Chip value={data.overview.screenshots.toLocaleString()} label="Shots" />
                      </View>
                      {reclaimable > 0 && (
                        <View style={styles.breakdown}>
                          <View style={styles.breakdownBar}>
                            {data.videos.total > 0 && <View style={{ flex: data.videos.total, backgroundColor: colors.mint }} />}
                            {data.photos.total > 0 && <View style={{ flex: data.photos.total, backgroundColor: colors.violet }} />}
                          </View>
                          <View style={styles.legendRow}>
                            <Legend color={colors.mint} label="Videos" value={formatBytes(data.videos.total)} />
                            <Legend color={colors.violet} label="Photos" value={formatBytes(data.photos.total)} />
                          </View>
                        </View>
                      )}
                    </Animated.View>

                    <Animated.View style={revealStyle(2)}>
                      <Pressable onPress={openSwipe} style={({ pressed }) => pressed && styles.pressed}>
                        <LinearGradient colors={[colors.mint, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.swipeCard}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.swipeTitle}>Swipe to Clean</Text>
                            <Text style={styles.swipeSub}>Review recent photos one by one</Text>
                          </View>
                          <Text style={styles.swipeArrow}>→</Text>
                        </LinearGradient>
                      </Pressable>
                    </Animated.View>

                    <Animated.View style={revealStyle(3)}>
                      <Text style={styles.dashSection}>Clean up</Text>
                      <CategoryCard glyph="▶" title="Large Videos" subtitle={`${data.videos.assets.length} videos · ${formatBytes(data.videos.total)}`} onPress={() => openCategory('videos')} disabled={data.videos.assets.length === 0} />
                      <CategoryCard glyph="◳" title="Large Photos" subtitle={`${data.photos.assets.length} photos · ${formatBytes(data.photos.total)}`} onPress={() => openCategory('photos')} disabled={data.photos.assets.length === 0} />
                      <CategoryCard glyph="⛶" title="Screenshots" subtitle={`${data.screenshots.count} screenshots`} onPress={() => openCategory('screenshots')} disabled={data.screenshots.count === 0} />
                      <CategoryCard glyph="❏" title="Duplicates" subtitle="Find duplicate & similar photos" onPress={() => setScreen('duplicates')} disabled={false} />
                      <CategoryCard glyph="◌" title="Blurry Photos" subtitle="Find low-quality, out-of-focus shots" onPress={() => setScreen('blurry')} disabled={false} />
                    </Animated.View>

                    {data.overview.limited && (
                      <Text style={styles.note}>You shared only some photos. Allow full access in Settings to scan everything.</Text>
                    )}

                    <Animated.View style={[styles.bottom, revealStyle(4)]}>
                      <Pressable onPress={handleScan} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
                        <Text style={styles.secondaryBtnText}>Rescan</Text>
                      </Pressable>
                    </Animated.View>
                  </>
                )}

                {error && <Text style={styles.error}>{error}</Text>}
              </ScrollView>
            )}
          </View>
        )}

        {tab === 'insights' && <InsightsScreen deviceStorage={deviceStorage} />}
        {tab === 'history' && <HistoryScreen stats={stats} />}
        {tab === 'settings' && (
          <SettingsScreen
            settings={settings}
            onChange={changeSettings}
            onClearCache={doClearCache}
            user={user}
            onSignOut={doSignOut}
            isPremium={isPremium}
            onUpgrade={() => setShowPaywall(true)}
          />
        )}
        {tab === 'admin' && user?.role === 'admin' && (
          <AdminScreen user={user} stats={stats} onSignOut={doSignOut} onStatsReset={refreshStats} />
        )}
      </Animated.View>

      <TabBar active={tab} onChange={setTab} isAdmin={user?.role === 'admin'} />
      <FreedToast toast={toast} onHide={() => setToast(null)} />
      <Confetti trigger={toast ? toast.id : null} />
      <Paywall visible={showPaywall} onUpgrade={doUpgrade} onClose={() => setShowPaywall(false)} />
    </View>
  );
}

function Chip({ value, label }) {
  return (
    <BlurView intensity={24} tint="light" style={styles.chip}>
      <Text style={styles.chipValue}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </BlurView>
  );
}

function Legend({ color, label, value }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

function CategoryCard({ glyph, title, subtitle, onPress, disabled }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => pressed && styles.pressed}>
      <BlurView intensity={26} tint="light" style={[styles.catCard, disabled && styles.catCardDisabled]}>
        <View style={styles.catIcon}>
          <Text style={styles.catIconText}>{glyph}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.catTitle}>{title}</Text>
          <Text style={styles.catSub}>{subtitle}</Text>
        </View>
        {!disabled && <Text style={styles.catChevron}>›</Text>}
      </BlurView>
    </Pressable>
  );
}

function VideoRow({ asset, selected, onPress, onLongPress }) {
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={250} style={({ pressed }) => pressed && styles.pressed}>
      <View style={[styles.vrow, selected && styles.vrowSel]}>
        <View style={[styles.checkbox, selected && styles.checkboxOn]}>{selected && <Text style={styles.checkMark}>✓</Text>}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.vname} numberOfLines={1}>{asset.filename}</Text>
          <Text style={styles.vmeta}>{formatDuration(asset.duration)} · {formatBytes(asset.bytes)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function Tile({ asset, selected, onPress, onLongPress }) {
  const pop = useRef(new Animated.Value(selected ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: selected ? 1 : 0, friction: 6, tension: 170, useNativeDriver: true }).start();
  }, [selected]);
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={250} style={[styles.tile, selected && styles.tileSel]}>
      <Image source={{ uri: asset.uri }} style={styles.tileImg} contentFit="cover" transition={140} />
      {asset.bytes > 0 && (
        <View style={styles.tileBadge}>
          <Text style={styles.tileBadgeText}>{formatBytes(asset.bytes)}</Text>
        </View>
      )}
      {selected && (
        <Animated.View style={[styles.check, styles.checkOn, { transform: [{ scale: pop }] }]}>
          <Text style={styles.checkMark}>✓</Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg0 },
  container: { flex: 1, paddingTop: 66, paddingHorizontal: 20 },
  tabContent: { flex: 1 },
  tabRoot: { flex: 1, paddingTop: 66, paddingHorizontal: 20 },
  flex1: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  bottom: { marginTop: 18 },
  resultsContent: { paddingBottom: 28 },

  blob: { position: 'absolute', width: 360, height: 360, borderRadius: 360 },
  blobMint: { backgroundColor: colors.glowMint, top: -90, right: -70 },
  blobViolet: { backgroundColor: colors.glowViolet, top: 220, left: -120 },
  blobMint2: { backgroundColor: colors.glowViolet, bottom: -120, right: -60, opacity: 0.6 },

  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  topBar: { width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  wordmark: { fontFamily: fonts.displayX, fontSize: 27, color: colors.text, letterSpacing: 0.3 },
  dashHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 24 },
  headerText: { flex: 1, paddingRight: 12 },
  greeting: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.dim, letterSpacing: 0.2 },
  greetingName: { fontFamily: fonts.displayX, fontSize: 25, color: colors.text, marginTop: 3, letterSpacing: 0.2 },
  dashSection: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 1.5, color: colors.dim, textTransform: 'uppercase', marginTop: 4, marginBottom: 10 },

  storageCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 18, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 18, ...shadow.sm },
  storageTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  storageLabel: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  storageFree: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.mint },
  barTrack: { height: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  storageTotal: { fontFamily: fonts.body, fontSize: 12, color: colors.faint, marginTop: 8 },

  scanPrompt: { alignItems: 'center', marginTop: 30 },
  heroWrap: { alignItems: 'center', marginTop: 4, marginBottom: 16 },
  ringInner: { alignItems: 'center', justifyContent: 'center' },
  heroLabel: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 3, color: colors.dim },
  heroNumRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 },
  heroNumber: { fontFamily: fonts.displayX, fontSize: 56, color: colors.text, lineHeight: 60 },
  heroUnit: { fontFamily: fonts.display, fontSize: 22, color: colors.mint, marginBottom: 9, marginLeft: 4 },
  heroSub: { fontFamily: fonts.body, fontSize: 13, color: colors.faint, marginTop: 2 },
  ringPrompt: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  ringPromptSub: { fontFamily: fonts.body, fontSize: 13, color: colors.dim, marginTop: 2 },
  progressText: { fontFamily: fonts.body, fontSize: 14, color: colors.mint, marginTop: 26 },

  chipsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  chip: { flex: 1, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder },
  chipValue: { fontFamily: fonts.display, fontSize: 19, color: colors.text },
  chipLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.dim, marginTop: 3, letterSpacing: 0.5 },
  avatarRing: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', padding: 2, ...shadow.sm },
  avatarInner: { width: '100%', height: '100%', borderRadius: 21, backgroundColor: colors.bg1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.text },
  breakdown: { marginBottom: 16 },
  breakdownBar: { flexDirection: 'row', height: 10, borderRadius: 6, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)' },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 9, height: 9, borderRadius: 9 },
  legendLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.dim },
  legendValue: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.text },

  swipeCard: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: 18, marginBottom: 12 },
  swipeTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: '#06140F' },
  swipeSub: { fontFamily: fonts.bodySemi, fontSize: 13, color: 'rgba(6,20,15,0.7)', marginTop: 3 },
  swipeArrow: { fontFamily: fonts.bodyBold, fontSize: 24, color: '#06140F' },
  boostCard: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(139,108,255,0.35)', ...shadow.sm },
  boostIcon: { width: 44, height: 44, borderRadius: 13, marginRight: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(103,232,195,0.16)' },
  boostBolt: { fontSize: 22, color: colors.mint },
  boostTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.text },
  boostSub: { fontFamily: fonts.body, fontSize: 13, color: colors.dim, marginTop: 3 },
  boostArrow: { fontFamily: fonts.display, fontSize: 24, color: colors.mint, marginLeft: 6 },
  proTag: { backgroundColor: colors.mint, borderRadius: radius.xs, paddingHorizontal: 7, paddingVertical: 3 },
  proTagText: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1, color: '#06140F' },

  catCard: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: 16, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder },
  catCardDisabled: { opacity: 0.4 },
  catIcon: { width: 46, height: 46, borderRadius: 14, marginRight: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(103,232,195,0.16)' },
  catIconText: { fontSize: 18, color: colors.mint },
  catTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.text },
  catSub: { fontFamily: fonts.body, fontSize: 13, color: colors.dim, marginTop: 3 },
  catChevron: { fontFamily: fonts.display, fontSize: 26, color: colors.mint },

  primaryBtn: { paddingVertical: 17, paddingHorizontal: 46, borderRadius: radius.pill, alignItems: 'center' },
  primaryBtnText: { fontFamily: fonts.bodyBold, fontSize: 17, color: '#06140F' },
  secondaryBtn: { paddingVertical: 15, borderRadius: radius.pill, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card },
  secondaryBtnText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },

  note: { fontFamily: fonts.body, color: colors.warn, fontSize: 13, textAlign: 'center', marginTop: 14, paddingHorizontal: 8 },
  error: { fontFamily: fonts.body, color: colors.danger, fontSize: 14, textAlign: 'center', marginTop: 18, paddingHorizontal: 8 },
  muted: { fontFamily: fonts.body, color: colors.dim, fontSize: 14, textAlign: 'center', marginTop: 50 },

  catHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  backText: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.mint },
  headerTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.text },
  selectAllText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.mint },

  listContent: { paddingBottom: 16 },
  gridRow: { gap: 8, marginBottom: 8 },

  vrow: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, padding: 14, marginBottom: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  vrowSel: { borderColor: colors.mint, backgroundColor: 'rgba(103,232,195,0.10)' },
  vname: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  vmeta: { fontFamily: fonts.body, fontSize: 12, color: colors.dim, marginTop: 3 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.faint, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  checkboxOn: { backgroundColor: colors.mint, borderColor: colors.mint },

  tile: { width: TILE, height: TILE, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.cardStrong },
  tileSel: { borderWidth: 3, borderColor: colors.mint },
  tileImg: { width: '100%', height: '100%' },
  tileBadge: { position: 'absolute', left: 6, bottom: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tileBadgeText: { color: '#fff', fontFamily: fonts.bodySemi, fontSize: 10 },
  check: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#fff', backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.mint, borderColor: colors.mint },
  checkMark: { color: '#06140F', fontSize: 14, fontFamily: fonts.bodyBold },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 30, paddingHorizontal: 18, marginHorizontal: -20, borderTopWidth: 1, borderTopColor: colors.cardBorder, overflow: 'hidden' },
  footerCount: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  footerSize: { fontFamily: fonts.body, fontSize: 13, color: colors.mint, marginTop: 2 },
  deleteBtn: { backgroundColor: colors.danger, paddingVertical: 13, paddingHorizontal: 26, borderRadius: radius.pill, minWidth: 104, alignItems: 'center' },
  deleteDisabled: { backgroundColor: 'rgba(255,92,106,0.28)' },
  deleteBtnText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#fff' },
});
