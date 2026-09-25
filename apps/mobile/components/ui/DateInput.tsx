import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { inputStyles as styles } from './styles';
import { COLORS, formatDate } from '../../lib/config';

type Props = {
  label: string;
  /** YYYY-MM-DD, or '' when empty. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  optional?: boolean;
};

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** A tappable field that opens the native calendar instead of asking for typed dates. */
export function DateInput({ label, value, onChange, error, optional }: Props) {
  const [open, setOpen] = useState(false);
  const current = value ? new Date(`${value}T00:00:00`) : new Date();

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.input, { flexDirection: 'row', alignItems: 'center', gap: 10 }, error ? styles.inputError : null]}
      >
        <Ionicons name="calendar-outline" size={18} color={COLORS.muted} />
        <Text style={{ color: value ? COLORS.text : COLORS.muted, fontSize: 15, flex: 1 }}>
          {value ? formatDate(value) : 'Select date'}
        </Text>
        {optional && value ? (
          <Pressable onPress={() => onChange('')} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={COLORS.muted} />
          </Pressable>
        ) : null}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {open ? (
        <DateTimePicker
          value={current}
          mode="date"
          onChange={(event, date) => {
            setOpen(false);
            if (event.type === 'set' && date) onChange(toISO(date));
          }}
        />
      ) : null}
    </View>
  );
}
