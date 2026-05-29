import * as MediaLibrary from 'expo-media-library';
import { File } from 'expo-file-system';

export function formatBytes(bytes) {
  if (!bytes || bytes < 1) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, i);
  const decimals = i === 0 || val >= 100 ? 0 : val >= 10 ? 1 : 2;
  return `${val.toFixed(decimals)} ${units[i]}`;
}

export function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Real on-device byte size of an asset (0 if it lives only in iCloud).
export async function measureAsset(asset) {
  try {
    const info = await MediaLibrary.getAssetInfoAsync(asset, { shouldDownloadFromNetwork: false });
    const uri = info.localUri || info.uri;
    if (uri && uri.startsWith('file://')) {
      return new File(uri).size || 0;
    }
  } catch {
    // ignore
  }
  return 0;
}

export async function getOverview() {
  const photos = await MediaLibrary.getAssetsAsync({ mediaType: 'photo', first: 1 });
  const videos = await MediaLibrary.getAssetsAsync({ mediaType: 'video', first: 1 });
  return { photos: photos.totalCount, videos: videos.totalCount };
}

export async function getScreenshots(limit = 120) {
  try {
    const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
    const album = albums.find((a) => a.title === 'Screenshots');
    if (!album) return { count: 0, assets: [] };
    const page = await MediaLibrary.getAssetsAsync({
      album,
      mediaType: 'photo',
      first: limit,
      sortBy: [['creationTime', false]],
    });
    return {
      count: album.assetCount,
      assets: page.assets.map((a) => ({ id: a.id, uri: a.uri, filename: a.filename, mediaType: 'photo' })),
    };
  } catch {
    return { count: 0, assets: [] };
  }
}

export async function getLargeVideos(limit = 18) {
  const page = await MediaLibrary.getAssetsAsync({
    mediaType: 'video',
    sortBy: [['duration', false]],
    first: limit,
  });
  const assets = [];
  for (const a of page.assets) {
    const bytes = await measureAsset(a);
    if (bytes > 0) {
      assets.push({ id: a.id, uri: a.uri, filename: a.filename, bytes, duration: a.duration, mediaType: 'video' });
    }
  }
  assets.sort((x, y) => y.bytes - x.bytes);
  const total = assets.reduce((s, v) => s + v.bytes, 0);
  return { assets, total, skipped: page.assets.length - assets.length };
}

// Largest photos: scan the highest-resolution photos, measure, keep the biggest.
export async function getLargePhotos(scan = 40, keep = 20) {
  const page = await MediaLibrary.getAssetsAsync({
    mediaType: 'photo',
    sortBy: [['width', false]],
    first: scan,
  });
  const measured = [];
  for (const a of page.assets) {
    const bytes = await measureAsset(a);
    if (bytes > 0) measured.push({ id: a.id, uri: a.uri, filename: a.filename, bytes, mediaType: 'photo' });
  }
  measured.sort((x, y) => y.bytes - x.bytes);
  const assets = measured.slice(0, keep);
  const total = assets.reduce((s, v) => s + v.bytes, 0);
  return { assets, total };
}

// Likely duplicates: photos sharing exact capture time + dimensions.
// Within each group the first is kept; the rest are flagged as extras.
export async function getDuplicates(cap = 4000) {
  const groups = new Map();
  let after;
  let fetched = 0;
  while (fetched < cap) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: 'photo',
      first: 200,
      after,
      sortBy: [['creationTime', false]],
    });
    for (const a of page.assets) {
      const key = `${a.creationTime}_${a.width}x${a.height}`;
      const arr = groups.get(key);
      if (arr) arr.push(a);
      else groups.set(key, [a]);
    }
    fetched += page.assets.length;
    if (!page.hasNextPage) break;
    after = page.endCursor;
  }
  const assets = [];
  let groupCount = 0;
  let extras = 0;
  let gi = 0;
  for (const arr of groups.values()) {
    if (arr.length < 2) continue;
    groupCount += 1;
    arr.forEach((a, idx) => {
      assets.push({ id: a.id, uri: a.uri, filename: a.filename, mediaType: 'photo', group: gi, isExtra: idx > 0 });
      if (idx > 0) extras += 1;
    });
    gi += 1;
  }
  return { assets, groupCount, extras };
}

export async function getRecentPhotos(limit = 100) {
  const page = await MediaLibrary.getAssetsAsync({
    mediaType: 'photo',
    first: limit,
    sortBy: [['creationTime', false]],
  });
  return page.assets.map((a) => ({ id: a.id, uri: a.uri, filename: a.filename, mediaType: 'photo' }));
}

// iOS shows its own confirmation dialog; resolves true only on confirmed delete.
export async function deleteAssets(ids) {
  return MediaLibrary.deleteAssetsAsync(ids);
}
