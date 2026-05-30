import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import Svg, { Path } from 'react-native-svg';
import Logo from '../Logo';
import { colors, fonts, radius, shadow } from '../theme';
import { tapSuccess, tapWarning, tapLight } from '../haptics';
import { signIn, signUp, signInFromProvider, validateEmail, validatePassword } from './authStore';
import { authenticateWithBiometric } from './biometric';
import { isAppleAvailable, signInWithApple, useGoogleAuth, fetchGoogleUser } from './social';

// Multicolor Google "G" — official brand path.
function GoogleG({ size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </Svg>
  );
}

function Field({ label, focused, error, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputWrapFocus, error && styles.inputWrapError]}>{children}</View>
    </View>
  );
}

export default function AuthScreen({ onAuthed, onGuest, savedSession, biometricInfo, onBiometricUnlock }) {
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [focus, setFocus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [usePassword, setUsePassword] = useState(false);

  const isSignup = mode === 'signup';
  const lockedToBiometric = Boolean(savedSession) && biometricInfo?.available && !usePassword;

  // Entrance choreography — one driver, staggered via interpolation start points.
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  const fadeUp = (start) => ({
    opacity: enter.interpolate({ inputRange: [start, Math.min(start + 0.35, 1)], outputRange: [0, 1], extrapolate: 'clamp' }),
    transform: [
      {
        translateY: enter.interpolate({
          inputRange: [start, Math.min(start + 0.35, 1)],
          outputRange: [18, 0],
          extrapolate: 'clamp',
        }),
      },
    ],
  });

  useEffect(() => {
    isAppleAvailable().then(setAppleAvailable);
  }, []);

  // Google OAuth hook (no-op until clientId is configured).
  const { promptAsync, response, configured: googleConfigured } = useGoogleAuth();
  useEffect(() => {
    if (response?.type !== 'success') return;
    (async () => {
      const token = response.authentication?.accessToken;
      if (!token) return;
      try {
        setLoading(true);
        const profile = await fetchGoogleUser(token);
        if (!profile) throw new Error('Could not read Google profile.');
        const session = await signInFromProvider({ ...profile, remember: true });
        tapSuccess();
        onAuthed(session);
      } catch (e) {
        tapWarning();
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [response]);

  function switchMode() {
    tapLight();
    setError(null);
    setMode(isSignup ? 'signin' : 'signup');
  }

  async function handleApple() {
    try {
      setError(null);
      const profile = await signInWithApple();
      const session = await signInFromProvider({ ...profile, remember: true });
      tapSuccess();
      onAuthed(session);
    } catch (e) {
      // Apple throws ERR_REQUEST_CANCELED on cancel — ignore.
      if (e?.code === 'ERR_REQUEST_CANCELED') return;
      tapWarning();
      setError(e.message || 'Apple sign-in failed.');
    }
  }

  async function handleGoogle() {
    setError(null);
    if (!googleConfigured) {
      Alert.alert(
        'Google Sign-In needs setup',
        "Create a free Google Cloud OAuth client and set EXPO_PUBLIC_GOOGLE_CLIENT_ID (or EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID), then reload. The button is wired and ready — it just needs your client ID.",
        [{ text: 'OK' }]
      );
      return;
    }
    try {
      await promptAsync();
    } catch (e) {
      setError(e.message || 'Google sign-in failed.');
    }
  }

  async function handleBiometric() {
    const label = biometricInfo?.label || 'Biometrics';
    const ok = await authenticateWithBiometric(label);
    if (ok) {
      tapSuccess();
      onBiometricUnlock(savedSession);
    } else {
      tapWarning();
    }
  }

  async function submit() {
    setError(null);
    if (isSignup && !name.trim()) return setError('Please enter your name.');
    if (!validateEmail(email)) return setError('Enter a valid email address.');
    if (!validatePassword(password)) return setError('Password must be at least 6 characters.');
    if (isSignup && password !== confirm) return setError('Passwords do not match.');

    setLoading(true);
    try {
      if (isSignup) await signUp({ name, email, password });
      const session = await signIn({ email, password, remember: isSignup ? true : remember });
      tapSuccess();
      onAuthed(session);
    } catch (e) {
      tapWarning();
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const heading = isSignup ? 'Create your account' : lockedToBiometric ? 'Welcome back' : 'Welcome back';
  const sub = lockedToBiometric
    ? `Quick sign-in for ${savedSession?.name?.split(' ')[0] || 'you'}.`
    : isSignup
    ? 'Start cleaning up your space.'
    : 'Sign in to continue.';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.header, fadeUp(0)]}>
          <Logo size={52} />
        </Animated.View>
        <Animated.Text style={[styles.title, fadeUp(0.05)]}>{heading}</Animated.Text>
        <Animated.Text style={[styles.subtitle, fadeUp(0.1)]}>{sub}</Animated.Text>

        {lockedToBiometric ? (
          <Animated.View style={[styles.bioWrap, fadeUp(0.18)]}>
            <Pressable onPress={handleBiometric} style={({ pressed }) => [pressed && styles.pressed]}>
              <LinearGradient colors={[colors.mint, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bioBtn}>
                <Text style={styles.bioGlyph}>{biometricInfo?.label === 'Touch ID' ? '◉' : '⌖'}</Text>
                <Text style={styles.bioText}>Sign in with {biometricInfo?.label || 'Biometrics'}</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => setUsePassword(true)} hitSlop={10} style={styles.bioAlt}>
              <Text style={styles.bioAltText}>Use password instead</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <>
            <Animated.View style={[styles.socials, fadeUp(0.18)]}>
              {appleAvailable && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                  cornerRadius={26}
                  style={styles.appleBtn}
                  onPress={handleApple}
                />
              )}
              <Pressable onPress={handleGoogle} style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed]}>
                <GoogleG size={18} />
                <Text style={styles.googleText}>Continue with Google</Text>
              </Pressable>
            </Animated.View>

            <Animated.View style={[styles.dividerRow, fadeUp(0.25)]}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or with email</Text>
              <View style={styles.dividerLine} />
            </Animated.View>

            <Animated.View style={fadeUp(0.3)}>
              <BlurView intensity={28} tint="light" style={styles.card}>
                {isSignup && (
                  <Field label="Name" focused={focus === 'name'}>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Your name"
                      placeholderTextColor={colors.faint}
                      style={styles.input}
                      autoCapitalize="words"
                      onFocus={() => setFocus('name')}
                      onBlur={() => setFocus(null)}
                      returnKeyType="next"
                    />
                  </Field>
                )}

                <Field label="Email" focused={focus === 'email'}>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.faint}
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    onFocus={() => setFocus('email')}
                    onBlur={() => setFocus(null)}
                    returnKeyType="next"
                  />
                </Field>

                <Field label="Password" focused={focus === 'password'}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor={colors.faint}
                    style={[styles.input, { flex: 1 }]}
                    secureTextEntry={!showPw}
                    autoCapitalize="none"
                    onFocus={() => setFocus('password')}
                    onBlur={() => setFocus(null)}
                    returnKeyType={isSignup ? 'next' : 'done'}
                    onSubmitEditing={isSignup ? undefined : submit}
                  />
                  <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={10}>
                    <Text style={styles.showBtn}>{showPw ? 'Hide' : 'Show'}</Text>
                  </Pressable>
                </Field>

                {isSignup && (
                  <Field label="Confirm password" focused={focus === 'confirm'}>
                    <TextInput
                      value={confirm}
                      onChangeText={setConfirm}
                      placeholder="••••••••"
                      placeholderTextColor={colors.faint}
                      style={styles.input}
                      secureTextEntry={!showPw}
                      autoCapitalize="none"
                      onFocus={() => setFocus('confirm')}
                      onBlur={() => setFocus(null)}
                      returnKeyType="done"
                      onSubmitEditing={submit}
                    />
                  </Field>
                )}

                {!isSignup && (
                  <Pressable
                    style={styles.rememberRow}
                    onPress={() => {
                      tapLight();
                      setRemember((v) => !v);
                    }}
                  >
                    <View style={[styles.switch, remember && styles.switchOn]}>
                      <View style={[styles.knob, remember && styles.knobOn]} />
                    </View>
                    <Text style={styles.rememberText}>Remember me</Text>
                  </Pressable>
                )}

                {error && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <Pressable onPress={submit} disabled={loading} style={({ pressed }) => [pressed && styles.pressed, { marginTop: 6 }]}>
                  <LinearGradient colors={[colors.mint, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submit}>
                    {loading ? <ActivityIndicator color="#06140F" /> : <Text style={styles.submitText}>{isSignup ? 'Create account' : 'Sign in'}</Text>}
                  </LinearGradient>
                </Pressable>
              </BlurView>
            </Animated.View>

            <Animated.View style={[styles.switchRow, fadeUp(0.42)]}>
              <Pressable onPress={switchMode} hitSlop={10}>
                <Text style={styles.switchText}>
                  {isSignup ? 'Already have an account? ' : "Don't have an account? "}
                  <Text style={styles.switchLink}>{isSignup ? 'Sign in' : 'Sign up'}</Text>
                </Text>
              </Pressable>
            </Animated.View>

            <Animated.View style={[styles.guestRow, fadeUp(0.48)]}>
              <Pressable onPress={onGuest} hitSlop={10}>
                <Text style={styles.guestText}>Continue without an account</Text>
              </Pressable>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 56 },
  header: { alignItems: 'center', marginBottom: 14 },
  title: { fontFamily: fonts.displayX, fontSize: 26, color: colors.text, textAlign: 'center' },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.dim, textAlign: 'center', marginTop: 6, marginBottom: 24 },

  socials: { gap: 12, marginBottom: 22 },
  appleBtn: { width: '100%', height: 50 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#FFFFFF', height: 50, borderRadius: radius.pill, paddingHorizontal: 18,
    ...shadow.sm,
  },
  googleText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#1F1F1F' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.faint, letterSpacing: 1.2, textTransform: 'uppercase' },

  card: { borderRadius: radius.lg, padding: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder, ...shadow.md },
  field: { marginBottom: 14 },
  fieldLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.dim, marginBottom: 7, letterSpacing: 0.3 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 14,
  },
  inputWrapFocus: { borderColor: colors.mint, backgroundColor: 'rgba(103,232,195,0.07)' },
  inputWrapError: { borderColor: colors.danger },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text, paddingVertical: 13 },
  showBtn: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.mint, paddingLeft: 10 },

  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2, marginBottom: 4 },
  switch: { width: 42, height: 25, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.12)', padding: 3, justifyContent: 'center' },
  switchOn: { backgroundColor: colors.mint },
  knob: { width: 19, height: 19, borderRadius: 10, backgroundColor: '#fff' },
  knobOn: { alignSelf: 'flex-end' },
  rememberText: { fontFamily: fonts.body, fontSize: 14, color: colors.dim },

  errorBox: { backgroundColor: 'rgba(255,92,106,0.12)', borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(255,92,106,0.4)', padding: 11, marginTop: 4, marginBottom: 6 },
  errorText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.danger, textAlign: 'center' },

  submit: { paddingVertical: 16, borderRadius: radius.pill, alignItems: 'center' },
  submitText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#06140F' },

  switchRow: { alignItems: 'center', marginTop: 22 },
  switchText: { fontFamily: fonts.body, fontSize: 14, color: colors.dim },
  switchLink: { fontFamily: fonts.bodyBold, color: colors.mint },

  guestRow: { alignItems: 'center', marginTop: 16 },
  guestText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.faint },

  bioWrap: { marginTop: 10 },
  bioBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 18, borderRadius: radius.pill, ...shadow.glow },
  bioGlyph: { fontSize: 22, color: '#06140F' },
  bioText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#06140F' },
  bioAlt: { alignItems: 'center', marginTop: 18 },
  bioAltText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.dim },

  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
