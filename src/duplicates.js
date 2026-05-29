import * as MediaLibrary from 'expo-media-library';
import { computeDHash, hamming } from './hash';
import { getCachedHashes, mergeCachedHashes } from './storage';

// Scan the user's recent photos for exact + near-duplicate images.
// Returns { groups, extras, scanned, hashed, computed, fromCache, failed, log }.
export async function scanDuplicates({ depth = 400, threshold = 8, onProgress, onLog } = {}) {
  const logLines = [];
  const log = (m) => {
    logLines.push(m);
    if (onLog) onLog(m);
    console.log('[duplicates]', m);
  };

  // 1. Fetch recent photos up to `depth`.
  const photos = [];
  let after;
  while (photos.length < depth) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: 'photo',
      first: Math.min(200, depth - photos.length),
      after,
      sortBy: [['creationTime', false]],
    });
    photos.push(...page.assets);
    if (!page.hasNextPage || page.assets.length === 0) break;
    after = page.endCursor;
  }
  log(`Fetched ${photos.length} recent photos (depth ${depth}, threshold ${threshold}).`);

  // 2. Hash each photo (cache by id + modificationTime).
  const cache = await getCachedHashes();
  const fresh = {};
  const items = [];
  let computed = 0;
  let fromCache = 0;
  let failed = 0;

  for (let i = 0; i < photos.length; i++) {
    const a = photos[i];
    const key = `${a.id}:${a.modificationTime || 0}`;
    let hash = cache[key];
    if (hash) {
      fromCache += 1;
    } else {
      try {
        const info = await MediaLibrary.getAssetInfoAsync(a, { shouldDownloadFromNetwork: false });
        const uri = info.localUri || info.uri;
        if (uri && uri.startsWith('file://')) {
          hash = await computeDHash(uri);
          if (hash) {
            fresh[key] = hash;
            computed += 1;
          } else {
            failed += 1;
          }
        } else {
          failed += 1;
        }
      } catch (e) {
        failed += 1;
        log(`Could not hash "${a.filename}": ${e.message}`);
      }
    }
    if (hash) items.push({ id: a.id, uri: a.uri, filename: a.filename, hash });
    if (onProgress) onProgress(i + 1, photos.length);
  }
  if (Object.keys(fresh).length) await mergeCachedHashes(fresh);
  log(`Hashed ${items.length}: ${computed} new, ${fromCache} cached, ${failed} skipped.`);

  // 3. Union-find: connect photos within the Hamming threshold.
  const n = items.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (x, y) => {
    const rx = find(x);
    const ry = find(y);
    if (rx !== ry) parent[rx] = ry;
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (hamming(items[i].hash, items[j].hash) <= threshold) union(i, j);
    }
  }

  // 4. Build groups of size > 1.
  const buckets = new Map();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!buckets.has(r)) buckets.set(r, []);
    buckets.get(r).push(i);
  }
  const groups = [];
  let extras = 0;
  for (const idxs of buckets.values()) {
    if (idxs.length < 2) continue;
    const rep = items[idxs[0]];
    let maxDist = 0;
    const assets = idxs.map((ix, k) => {
      const it = items[ix];
      const d = hamming(rep.hash, it.hash);
      if (d > maxDist) maxDist = d;
      return { id: it.id, uri: it.uri, filename: it.filename, mediaType: 'photo', distance: d, isExtra: k > 0 };
    });
    extras += assets.length - 1;
    groups.push({ assets, count: assets.length, similarity: Math.round(100 * (1 - maxDist / 64)) });
  }
  groups.sort((a, b) => b.count - a.count || b.similarity - a.similarity);
  log(`Found ${groups.length} duplicate groups, ${extras} removable extras.`);

  return { groups, extras, scanned: photos.length, hashed: items.length, computed, fromCache, failed, log: logLines };
}
