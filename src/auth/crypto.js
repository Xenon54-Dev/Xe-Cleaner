import * as Crypto from 'expo-crypto';

// Random hex salt (16 bytes).
export async function randomSalt() {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Salted, lightly key-stretched SHA-256 hash. Matches the build-time generator
// used for the admin config. NOTE: this is not bcrypt/argon2 — adequate for a
// local client demo, but real auth should hash + verify on a backend.
export async function hashPassword(password, salt) {
  let h = `${salt}:${password}`;
  for (let i = 0; i < 5; i++) {
    h = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, h);
  }
  return h;
}
