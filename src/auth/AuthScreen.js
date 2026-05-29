import { useState } from 'react';
import {
  ActivityIndicator,
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
import Logo from '../Logo';
import { colors, fonts, radius, shadow } from '../theme';
import { tapSuccess, tapWarning, tapLight } from '../haptics';
import { signIn, signUp, validateEmail, validatePassword } from './authStore';

function Field({ label, error, focused, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputWrapFocus, error && styles.inputWrapError]}>{children}</View>
    </View>
  );
}

export default function AuthScreen({ onAuthed }) {
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

  const isSignup = mode === 'signup';

  function switchMode() {
    tapLight();
    setError(null);
    setMode(isSignup ? 'signin' : 'signup');
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

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Logo size={48} />
          <Text style={styles.title}>{isSignup ? 'Create your account' : 'Welcome back'}</Text>
          <Text style={styles.subtitle}>{isSignup ? 'Start cleaning up your space.' : 'Sign in to continue.'}</Text>
        </View>

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
            <Pressable style={styles.rememberRow} onPress={() => { tapLight(); setRemember((v) => !v); }}>
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

        <Pressable onPress={switchMode} style={styles.switchRow} hitSlop={10}>
          <Text style={styles.switchText}>
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <Text style={styles.switchLink}>{isSignup ? 'Sign in' : 'Sign up'}</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 60 },
  header: { alignItems: 'center', marginBottom: 26 },
  title: { fontFamily: fonts.displayX, fontSize: 26, color: colors.text, marginTop: 16 },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.dim, marginTop: 6 },
  card: {
    borderRadius: radius.lg, padding: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder, ...shadow.md,
  },
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
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
