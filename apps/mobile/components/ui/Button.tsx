import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BRAND_GRADIENT, COLORS } from '../../lib/config';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

type Props = {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: 'md' | 'sm';
  style?: ViewStyle;
  textStyle?: TextStyle;
};

const color: Record<Variant, string> = {
  primary: COLORS.primaryText,
  secondary: COLORS.text,
  danger: COLORS.primaryText,
  ghost: COLORS.muted,
};

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  icon,
  size = 'md',
  style,
  textStyle,
}: Props) {
  const isDisabled = disabled || loading;
  const height = size === 'sm' ? 38 : 48;

  const content = loading ? (
    <ActivityIndicator color={color[variant]} />
  ) : (
    <View style={styles.row}>
      {icon ? <Ionicons name={icon} size={size === 'sm' ? 15 : 18} color={color[variant]} /> : null}
      <Text style={[styles.text, size === 'sm' && styles.textSm, { color: color[variant] }, textStyle]}>{title}</Text>
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { minHeight: height, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={[...BRAND_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.radius]}
        />
      ) : null}
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  radius: { borderRadius: 14 },
  secondary: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: 'rgba(47,123,255,0.1)' },
  danger: { backgroundColor: COLORS.danger },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontSize: 15, fontWeight: '700' },
  textSm: { fontSize: 13 },
});
