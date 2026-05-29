import AsyncStorage from '@react-native-async-storage/async-storage';

const HASH_KEY = 'xe:hashes:v1';
const SETTINGS_KEY = 'xe:settings:v1';
const MAX_CACHED = 6000;

export const DEFAULT_SETTINGS = { sensitivity: 'balanced', depth: 400 };

// Sensitivity -> dHash Hamming distance threshold (0..64). Lower = stricter.
export const SENSITIVITY = {
  strict: { label: 'Strict', threshold: 3, hint: 'Near-exact copies only' },
  balanced: { label: 'Balanced', threshold: 8, hint: 'Resizes & recompressions' },
  loose: { label: 'Loose', threshold: 12, hint: 'Also catches light edits' },
};

export const DEPTHS = [
  { value: 150, label: 'Quick', hint: '150 recent photos' },
  { value: 400, label: 'Standard', hint: '400 recent photos' },
  { value: 1000, label: 'Deep', hint: '1000 recent photos' },
];

export async function loadSettings() {
  try {
    const s = await AsyncStorage.getItem(SETTINGS_KEY);
    return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings) {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export async function getCachedHashes() {
  try {
    const s = await AsyncStorage.getItem(HASH_KEY);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

export async function mergeCachedHashes(newOnes) {
  try {
    const current = await getCachedHashes();
    let merged = { ...current, ...newOnes };
    const keys = Object.keys(merged);
    if (keys.length > MAX_CACHED) {
      // Keep the most recently added (tail of the key list).
      const trimmed = {};
      for (const k of keys.slice(keys.length - MAX_CACHED)) trimmed[k] = merged[k];
      merged = trimmed;
    }
    await AsyncStorage.setItem(HASH_KEY, JSON.stringify(merged));
  } catch {
    // ignore
  }
}

export async function clearHashCache() {
  try {
    await AsyncStorage.removeItem(HASH_KEY);
  } catch {
    // ignore
  }
}

const STATS_KEY = 'xe:stats:v1';
const ONBOARD_KEY = 'xe:onboarded:v1';

export async function getStats() {
  try {
    const s = await AsyncStorage.getItem(STATS_KEY);
    return s ? JSON.parse(s) : { totalFreed: 0, totalItems: 0, history: [] };
  } catch {
    return { totalFreed: 0, totalItems: 0, history: [] };
  }
}

export async function recordCleanup({ bytes = 0, count = 0, kind = 'Cleanup' }) {
  try {
    const cur = await getStats();
    const entry = { ts: Date.now(), bytes, count, kind };
    const history = [entry, ...(cur.history || [])].slice(0, 100);
    const next = {
      totalFreed: (cur.totalFreed || 0) + bytes,
      totalItems: (cur.totalItems || 0) + count,
      history,
    };
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

export async function clearStats() {
  try {
    await AsyncStorage.removeItem(STATS_KEY);
  } catch {
    // ignore
  }
}

const PREMIUM_KEY = 'xe:premium:v1';

export async function getPremium() {
  try {
    return (await AsyncStorage.getItem(PREMIUM_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setPremium(value) {
  try {
    await AsyncStorage.setItem(PREMIUM_KEY, value ? '1' : '0');
  } catch {
    // ignore
  }
}

export async function isOnboarded() {
  try {
    return (await AsyncStorage.getItem(ONBOARD_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setOnboardedFlag() {
  try {
    await AsyncStorage.setItem(ONBOARD_KEY, '1');
  } catch {
    // ignore
  }
}
