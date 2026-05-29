import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { hashPassword, randomSalt } from './crypto';
import { ADMIN_CONFIG } from './adminConfig';

const USERS_KEY = 'xe:users:v1';
const SESSION_KEY = 'xe_session_v1'; // SecureStore keys: alphanumeric . _ - only

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
}
export function validatePassword(pw) {
  return (pw || '').length >= 6;
}

async function getUsers() {
  try {
    const s = await AsyncStorage.getItem(USERS_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}
async function saveUsers(users) {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export async function getUserCount() {
  return (await getUsers()).length;
}

async function persistSession(session) {
  try {
    const token = await randomSalt();
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ ...session, token, issuedAt: Date.now() }));
  } catch {
    // Keychain unavailable — session simply won't persist.
  }
}

export async function restoreSession() {
  try {
    const s = await SecureStore.getItemAsync(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export async function signOut() {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    // ignore
  }
}

export async function signUp({ name, email, password }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!name || !name.trim()) throw new Error('Please enter your name.');
  if (!validateEmail(cleanEmail)) throw new Error('Enter a valid email address.');
  if (!validatePassword(password)) throw new Error('Password must be at least 6 characters.');
  if (cleanEmail === ADMIN_CONFIG.email) throw new Error('That email is reserved.');

  const users = await getUsers();
  if (users.some((u) => u.email === cleanEmail)) throw new Error('An account with this email already exists.');

  const salt = await randomSalt();
  const hash = await hashPassword(password, salt);
  users.push({ email: cleanEmail, name: name.trim(), salt, hash, createdAt: Date.now() });
  await saveUsers(users);
  return { email: cleanEmail, name: name.trim(), role: 'user' };
}

export async function signIn({ email, password, remember }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!validateEmail(cleanEmail)) throw new Error('Enter a valid email address.');
  if (!password) throw new Error('Please enter your password.');

  // --- Admin flow (separated from user records) ---
  if (cleanEmail === ADMIN_CONFIG.email) {
    const h = await hashPassword(password, ADMIN_CONFIG.salt);
    if (h !== ADMIN_CONFIG.hash) throw new Error('Incorrect email or password.');
    const session = { email: cleanEmail, name: ADMIN_CONFIG.name, role: 'admin' };
    if (remember) await persistSession(session);
    return session;
  }

  // --- Normal user flow ---
  const users = await getUsers();
  const user = users.find((u) => u.email === cleanEmail);
  if (!user) throw new Error('Incorrect email or password.');
  const h = await hashPassword(password, user.salt);
  if (h !== user.hash) throw new Error('Incorrect email or password.');
  const session = { email: cleanEmail, name: user.name, role: 'user' };
  if (remember) await persistSession(session);
  return session;
}
