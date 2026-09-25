import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Logo } from '../components/ui/Bits';
import { GradientBackground } from '../components/ui/Screen';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';
import { BRAND_GRADIENT, COLORS } from '../lib/config';

export default function LoginScreen() {
  const { login, signup } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'login' | 'signup' | null>(null);

  const validate = () => {
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Invalid email address';
    if (!password) next.password = 'Password is required';
    else if (password.length < 6) next.password = 'Password must be at least 6 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (mode: 'login' | 'signup') => {
    setServerError(null);
    if (!validate()) return;
    setLoading(mode);
    try {
      if (mode === 'login') await login(email.trim(), password);
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <View style={styles.hero}>
          <Logo size={88} />
          <Text style={styles.brand}>WealthGuard</Text>
          <LinearGradient colors={[...BRAND_GRADIENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.underline} />
          <Text style={styles.subtitle}>Sign in to manage loans, expenses, and income</Text>
        </View>

        <View style={styles.form}>
          {serverError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{serverError}</Text>
            </View>
          ) : null}

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
          <Input
            label="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            placeholder="••••••••"
          />

          <Button title="Sign In" onPress={() => submit('login')} loading={loading === 'login'} disabled={!!loading} />
          <Button
            title="Create Account"
            variant="secondary"
            onPress={() => submit('signup')}
            loading={loading === 'signup'}
            disabled={!!loading}
          />
        </View>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  wrap: { flex: 1, justifyContent: 'center', padding: 24, gap: 28 },
  hero: { gap: 10, alignItems: 'center' },
  underline: { width: 64, height: 4, borderRadius: 999 },
  brand: { color: COLORS.text, fontSize: 34, fontWeight: '900' },
  subtitle: { color: COLORS.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  form: { gap: 14 },
  errorBox: {
    backgroundColor: 'rgba(225,29,72,0.15)',
    borderRadius: 12,
    padding: 12,
  },
  errorText: { color: '#fda4af', textAlign: 'center', fontSize: 13 },
});
