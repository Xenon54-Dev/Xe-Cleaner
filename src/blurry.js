import * as MediaLibrary from 'expo-media-library';
import { computeSharpness } from './hash';

// Photos with a sharpness below this are flagged blurry. Tunable.
const BLUR_THRESHOLD = 7;

export async function scanBlurry({ depth = 150, onProgress } = {}) {
  const photos = [];
  let after;
  while (photos.length < depth) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: 'photo',
      first: Math.min(120, depth - photos.length),
      after,
      sortBy: [['creationTime', false]],
    });
    photos.push(...page.assets);
    if (!page.hasNextPage || page.assets.length === 0) break;
    after = page.endCursor;
  }

  const blurry = [];
  let analyzed = 0;
  let failed = 0;
  for (let i = 0; i < photos.length; i++) {
    const a = photos[i];
    try {
      const info = await MediaLibrary.getAssetInfoAsync(a, { shouldDownloadFromNetwork: false });
      const uri = info.localUri || info.uri;
      if (uri && uri.startsWith('file://')) {
        const sharpness = await computeSharpness(uri);
        analyzed += 1;
        if (sharpness != null && sharpness < BLUR_THRESHOLD) {
          // Map sharpness (0..BLUR_THRESHOLD) to a 0..100 "blur" confidence.
          const blur = Math.round(100 - (sharpness / BLUR_THRESHOLD) * 100);
          blurry.push({ id: a.id, uri: a.uri, filename: a.filename, mediaType: 'photo', sharpness, blur });
        }
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }
    if (onProgress) onProgress(i + 1, photos.length);
  }
  blurry.sort((x, y) => x.sharpness - y.sharpness); // blurriest first
  return { blurry, scanned: photos.length, analyzed, failed };
}
