import { StyleSheet } from 'react-native';
import { COLORS } from '../../lib/config';

export const inputStyles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 15,
  },
  inputError: { borderColor: COLORS.danger },
  error: { color: COLORS.danger, fontSize: 12 },
});
