import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ErrorBox, Logo } from '../components/ui/Bits';
import { GradientBackground } from '../components/ui/Screen';
import { SavedAccount, useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';
import { confirmPhoneOwner } from '../lib/device';
import { BRAND_GRADIENT, COLORS, formatDate } from '../lib/config';

export default function LoginScreen() {
  const { login, signup, savedAccounts, continueAs } = useAuth();
  const router = useRouter();
  const [accounts, setAccounts] = useState<SavedAccount[] | null>(null);
  const [mode, setMode] = useState<'accounts' | 'form'>('form');
  const [continuing, setContinuing] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'login' | 'signup' | null>(null);

  // A reinstall wipes the saved session, but the server still knows this phone.
  useEffect(() => {
    savedAccounts().then((list) => {
      setAccounts(list);
      if (list.length) setMode('accounts');
    });
  }, [savedAccounts]);

  const onContinue = async (account: SavedAccount) => {
    setServerError(null);
    const ok = await confirmPhoneOwner(`Continue as ${account.name || account.email}`);
    if (!ok) return;
    setContinuing(account.userId);
    try {
      await continueAs(account.userId);
      router.replace('/(tabs)');
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Could not continue. Please sign in with your password.');
      setMode('form');
    } finally {
      setContinuing(null);
    }
  };

  const validate = () => {
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Invalid email address';
    if (!password) next.password = 'Password is required';
    else if (password.length < 6) next.password = 'Password must be at least 6 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (kind: 'login' | 'signup') => {
    setServerError(null);
    if (!validate()) return;
    setLoading(kind);
    try {
      if (kind === 'login') await login(email.trim(), password);
      else await signup(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.safe}>
      <GradientBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
              <Logo size={88} />
              <Text style={styles.brand}>WealthGuard</Text>
              <LinearGradient colors={[...BRAND_GRADIENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.underline} />
              <Text style={styles.subtitle}>
                {mode === 'accounts' ? 'Welcome back! Pick your account to continue.' : 'Sign in to manage loans, expenses, and income'}
              </Text>
            </View>

            <ErrorBox message={serverError} />

            {accounts === null ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : mode === 'accounts' ? (
              <View style={styles.form}>
                {accounts.map((a) => (
                  <Pressable
                    key={a.userId}
                    onPress={() => onContinue(a)}
                    disabled={!!continuing}
                    style={({ pressed }) => [styles.account, { opacity: pressed || (continuing && continuing !== a.userId) ? 0.7 : 1 }]}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{(a.name || a.email).charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.accountName}>{a.name || a.email}</Text>
                      {a.name ? <Text style={styles.accountMeta}>{a.email}</Text> : null}
                      <Text style={styles.accountMeta}>Last used {formatDate(a.lastUsedAt)}</Text>
                    </View>
                    {continuing === a.userId ? (
                      <ActivityIndicator color={COLORS.primary} />
                    ) : (
                      <View style={styles.continuePill}>
                        <Ionicons name="finger-print" size={16} color={COLORS.primaryText} />
                        <Text style={styles.continueText}>Continue</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
                <Button title="Use another account" icon="person-add-outline" variant="secondary" onPress={() => setMode('form')} />
              </View>
            ) : (
              <View style={styles.form}>
                <Input
                  label="Email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                  error={errors.email}
                  placeholder="you@example.com"
                />
                <View>
                  <Input
                    label="Password"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    error={errors.password}
                    placeholder="••••••••"
                  />
                  <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eye} hitSlop={10}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.muted} />
                  </Pressable>
                </View>

                <Button title="Sign In" onPress={() => submit('login')} loading={loading === 'login'} disabled={!!loading} />
                <Button
                  title="Create Account"
                  variant="secondary"
                  onPress={() => submit('signup')}
                  loading={loading === 'signup'}
                  disabled={!!loading}
                />
                {accounts.length ? (
                  <Button title="Back to saved accounts" variant="ghost" icon="people-outline" onPress={() => setMode('accounts')} />
                ) : null}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  wrap: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 24 },
  hero: { gap: 10, alignItems: 'center' },
  underline: { width: 64, height: 4, borderRadius: 999 },
  brand: { color: COLORS.text, fontSize: 34, fontWeight: '900' },
  subtitle: { color: COLORS.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  form: { gap: 14 },
  eye: { position: 'absolute', right: 14, top: 40 },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(47,123,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.text, fontSize: 18, fontWeight: '900' },
  accountName: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  accountMeta: { color: COLORS.muted, fontSize: 12 },
  continuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  continueText: { color: COLORS.primaryText, fontSize: 12, fontWeight: '800' },
});
