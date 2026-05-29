import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import UPNG from 'upng-js';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64ToUint8Array(b64) {
  const out = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < b64.length; i++) {
    const v = B64.indexOf(b64[i]);
    if (v < 0) continue; // skip '=', whitespace, newlines
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

function binToHex(bin) {
  let hex = '';
  for (let i = 0; i < bin.length; i += 4) {
    hex += parseInt(bin.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

function popcount32(n) {
  n = n - ((n >> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
  n = (n + (n >> 4)) & 0x0f0f0f0f;
  return (n * 0x01010101) >> 24;
}

// Hamming distance between two 16-char (64-bit) hex hashes. Range 0..64.
export function hamming(a, b) {
  if (!a || !b || a.length !== 16 || b.length !== 16) return 64;
  const a1 = parseInt(a.slice(0, 8), 16) >>> 0;
  const a2 = parseInt(a.slice(8, 16), 16) >>> 0;
  const b1 = parseInt(b.slice(0, 8), 16) >>> 0;
  const b2 = parseInt(b.slice(8, 16), 16) >>> 0;
  return popcount32(a1 ^ b1) + popcount32(a2 ^ b2);
}

// Difference hash: resize to 9x8, compare horizontally adjacent luminance.
// Returns a 16-char hex string (64 bits), or null on failure.
export async function computeDHash(fileUri) {
  const context = ImageManipulator.manipulate(fileUri);
  context.resize({ width: 9, height: 8 });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.PNG, base64: true });
  if (!result.base64) return null;

  const bytes = base64ToUint8Array(result.base64);
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const img = UPNG.decode(ab);
  const rgba = new Uint8Array(UPNG.toRGBA8(img)[0]);
  const w = img.width || 9;

  let bin = '';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const i1 = (y * w + x) * 4;
      const i2 = (y * w + x + 1) * 4;
      const l1 = 0.299 * rgba[i1] + 0.587 * rgba[i1 + 1] + 0.114 * rgba[i1 + 2];
      const l2 = 0.299 * rgba[i2] + 0.587 * rgba[i2 + 1] + 0.114 * rgba[i2 + 2];
      bin += l1 > l2 ? '1' : '0';
    }
  }
  return binToHex(bin);
}

// Sharpness estimate: mean absolute luminance gradient on a 32x32 grayscale
// downscale. Higher = sharper; low values indicate a blurry/soft image.
export async function computeSharpness(fileUri) {
  const context = ImageManipulator.manipulate(fileUri);
  context.resize({ width: 32, height: 32 });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.PNG, base64: true });
  if (!result.base64) return null;

  const bytes = base64ToUint8Array(result.base64);
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const img = UPNG.decode(ab);
  const rgba = new Uint8Array(UPNG.toRGBA8(img)[0]);
  const w = img.width || 32;
  const h = img.height || 32;

  const luma = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    luma[i] = 0.299 * rgba[o] + 0.587 * rgba[o + 1] + 0.114 * rgba[o + 2];
  }
  let sum = 0;
  let n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (x + 1 < w) {
        sum += Math.abs(luma[idx] - luma[idx + 1]);
        n += 1;
      }
      if (y + 1 < h) {
        sum += Math.abs(luma[idx] - luma[idx + w]);
        n += 1;
      }
    }
  }
  return n ? sum / n : 0;
}
