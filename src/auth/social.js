import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

// Set EXPO_PUBLIC_GOOGLE_CLIENT_ID at build time (or paste an OAuth Web client
// ID here) to enable the "Continue with Google" button. Without it the button
// shows a friendly setup message instead of failing silently.
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

export const googleConfigured = Boolean(GOOGLE_WEB_CLIENT_ID || GOOGLE_IOS_CLIENT_ID);

// Native iOS Apple Sign-In availability (iOS 13+ on a real device).
export async function isAppleAvailable() {
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

// Trigger the native Apple Sign-In sheet. Throws on user cancel.
export async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  const fullName = credential.fullName
    ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ').trim()
    : '';
  return {
    provider: 'apple',
    id: credential.user, // stable Apple user id
    email: credential.email || `${credential.user.split('.')[0]}@privaterelay.appleid.com`,
    name: fullName || 'Apple user',
  };
}

// React hook for the Google OAuth flow (expo-auth-session). Returns the prompt
// function and a `configured` flag the UI can use to gate the button.
export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID || undefined,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
  });
  return { request, response, promptAsync, configured: googleConfigured };
}

// After Google returns an access token, fetch the user's profile from Google's
// userinfo endpoint so we can store a local user record.
export async function fetchGoogleUser(accessToken) {
  try {
    const r = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) return null;
    const data = await r.json();
    return {
      provider: 'google',
      id: data.id,
      email: (data.email || '').toLowerCase(),
      name: data.name || data.given_name || 'Google user',
    };
  } catch {
    return null;
  }
}
