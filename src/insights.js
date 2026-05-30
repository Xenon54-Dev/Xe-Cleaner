import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';

const HISTORY_KEY = 'xe:storageHistory:v1';
const MAX_SAMPLES = 60;
const SAMPLE_THROTTLE = 6 * 60 * 60 * 1000; // at most one sample / 6h
const DAY = 24 * 60 * 60 * 1000;

// Average bytes per captured photo/video — a labeled ESTIMATE used only for the
// forecast (we don't measure each asset's real size here for speed).
export const EST_MEDIA_BYTES = 3.5 * 1024 * 1024;

// Append a timestamped device-storage sample (throttled). Builds a real trend
// line over days/weeks of normal use.
export async function recordStorageSample(deviceStorage) {
  if (!deviceStorage) return;
  try {
    const history = await getStorageHistory();
    const last = history[history.length - 1];
    if (last && Date.now() - last.ts < SAMPLE_THROTTLE) return;
    history.push({ ts: Date.now(), free: deviceStorage.free, used: deviceStorage.used, total: deviceStorage.total });
    const trimmed = history.slice(-MAX_SAMPLES);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore
  }
}

export async function getStorageHistory() {
  try {
    const s = await AsyncStorage.getItem(HISTORY_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

// Least-squares slope of `used` bytes over time → bytes/day. Returns null until
// there are ≥2 samples spanning a meaningful interval.
export function usedTrendPerDay(history) {
  if (!history || history.length < 2) return null;
  const span = history[history.length - 1].ts - history[0].ts;
  if (span < DAY * 0.5) return null; // need ~half a day of spread
  const n = history.length;
  const t0 = history[0].ts;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const s of history) {
    const x = (s.ts - t0) / DAY;
    const y = s.used;
    sx += x; sy += y; sxx += x * x; sxy += x * y;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  return (n * sxy - sx * sy) / denom;
}

// Count real photos/videos created after `sinceTs` (bounded paging).
export async function getRecentMediaCount(sinceTs, cap = 4000) {
  let count = 0;
  let after;
  try {
    while (count < cap) {
      const page = await MediaLibrary.getAssetsAsync({
        mediaType: ['photo', 'video'],
        createdAfter: sinceTs,
        first: 200,
        after,
        sortBy: [['creationTime', false]],
      });
      count += page.assets.length;
      if (!page.hasNextPage || page.assets.length === 0) break;
      after = page.endCursor;
    }
  } catch {
    return null;
  }
  return count;
}

// Build the real forecast from photo-library growth (immediate, from creation
// timestamps) refined by device-storage samples (accumulate over time).
export async function buildForecast(deviceStorage) {
  const now = Date.now();
  const recentMedia = await getRecentMediaCount(now - 30 * DAY);
  const history = await getStorageHistory();
  const sampleSlope = usedTrendPerDay(history); // bytes/day from real samples

  let bytesPerMonth = null;
  let source = null;
  if (sampleSlope && sampleSlope > 0) {
    bytesPerMonth = sampleSlope * 30;
    source = 'samples';
  } else if (recentMedia != null) {
    bytesPerMonth = recentMedia * EST_MEDIA_BYTES;
    source = 'photos';
  }

  let monthsLeft = null;
  let projectedUsed = null;
  if (bytesPerMonth && bytesPerMonth > 0 && deviceStorage) {
    monthsLeft = deviceStorage.free / bytesPerMonth;
    projectedUsed = deviceStorage.used + bytesPerMonth;
  }

  return {
    recentMedia,
    bytesPerMonth,
    monthsLeft,
    projectedUsed,
    source,
    sampleCount: history.length,
  };
}

// Honest, educational content — NOT a measurement of the user's device.
export const SYSTEM_DATA_FACTS = [
  'Caches from apps, the keyboard, and the App Store',
  'System & crash logs and diagnostic data',
  'Siri voices, dictation, and on-device learning',
  'Spotlight search index of your content',
  'Downloaded iOS update files waiting to install',
  'Streaming buffers from music & video apps',
];

export const SYSTEM_DATA_TIPS = [
  'Restart your iPhone — clears temporary system caches',
  'Update to the latest iOS — removes staged update files',
  'Offload large unused apps (keeps their documents)',
  'In Safari: Settings → Apps → Safari → Clear History and Website Data',
  'Sign out of and back into streaming apps to drop their buffers',
];

export const APP_HABIT_FACTS = [
  'Messaging apps keep every photo, video & voice note you receive',
  'Social apps aggressively pre-cache feeds and reels',
  'Streaming apps store offline/temporary playback buffers',
  'Browsers accumulate website data and downloads',
];
