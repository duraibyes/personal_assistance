import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/ui/Screen';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ErrorBox } from '../components/ui/Bits';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';
import { COLORS } from '../lib/config';

type Field = 'current' | 'next' | 'confirm';

export default function ChangePasswordScreen() {
  const { changePassword } = useAuth();
  const router = useRouter();
  const [values, setValues] = useState<Record<Field, string>>({ current: '', next: '', confirm: '' });
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key: Field) => (value: string) => setValues((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    const next: Partial<Record<Field, string>> = {};
    if (!values.current) next.current = 'Current password is required';
    if (values.next.length < 6) next.next = 'New password must be at least 6 characters';
    else if (values.next === values.current) next.next = 'New password must be different from the current one';
    if (values.confirm !== values.next) next.confirm = 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    setServerError(null);
    if (!validate()) return;
    setSaving(true);
    try {
      await changePassword(values.current, values.next);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && /current password/i.test(err.message)) {
        setErrors({ current: err.message });
      } else {
        setServerError(err instanceof ApiError ? err.message : 'Failed to change password');
      }
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <Screen title="Change Password" back>
        <Card>
          <View style={styles.success}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
            <Text style={styles.successTitle}>Password changed</Text>
            <Text style={styles.muted}>
              Use your new password next time you sign in. Other phones that were remembered will need the new password.
            </Text>
          </View>
          <Button title="Done" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Change Password" subtitle="Keep your account secure" back>
      <ErrorBox message={serverError} />
      <Card>
        <Input label="Current password" value={values.current} onChangeText={set('current')} secureTextEntry={!visible} error={errors.current} />
        <Input label="New password" value={values.next} onChangeText={set('next')} secureTextEntry={!visible} error={errors.next} />
        <Input label="Confirm new password" value={values.confirm} onChangeText={set('confirm')} secureTextEntry={!visible} error={errors.confirm} />
        <Pressable onPress={() => setVisible((v) => !v)} style={styles.toggle} hitSlop={8}>
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.muted} />
          <Text style={styles.muted}>{visible ? 'Hide passwords' : 'Show passwords'}</Text>
        </Pressable>
      </Card>
      <Button title="Change password" icon="key-outline" onPress={onSubmit} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: COLORS.muted, fontSize: 13, textAlign: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  success: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  successTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
});
