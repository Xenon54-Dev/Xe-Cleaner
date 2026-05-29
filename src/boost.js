import * as FS from 'expo-file-system/legacy';

// Recursively sum the byte size of a directory's contents.
async function dirSize(uri) {
  let total = 0;
  try {
    const entries = await FS.readDirectoryAsync(uri);
    for (const name of entries) {
      const path = (uri.endsWith('/') ? uri : uri + '/') + name;
      try {
        const info = await FS.getInfoAsync(path, { size: true });
        if (info.isDirectory) total += await dirSize(path);
        else total += info.size || 0;
      } catch {
        // skip unreadable entry
      }
    }
  } catch {
    // unreadable dir
  }
  return total;
}

// Real, on-device app cache size (Xe Cleaner's own cache — safe to clear).
export async function getAppCacheBytes() {
  try {
    const dir = FS.cacheDirectory;
    if (!dir) return 0;
    return await dirSize(dir);
  } catch {
    return 0;
  }
}

// Clears Xe Cleaner's own cache directory. Returns bytes freed.
export async function clearAppCache() {
  try {
    const dir = FS.cacheDirectory;
    if (!dir) return 0;
    const freed = await dirSize(dir);
    const entries = await FS.readDirectoryAsync(dir);
    for (const name of entries) {
      try {
        await FS.deleteAsync((dir.endsWith('/') ? dir : dir + '/') + name, { idempotent: true });
      } catch {
        // skip locked entry
      }
    }
    return freed;
  } catch {
    return 0;
  }
}
