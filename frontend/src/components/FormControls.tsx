import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors, radii, spacing } from '../theme';

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'email-address';
  testID?: string;
  multiline?: boolean;
}

export function Field({ label, value, onChangeText, placeholder, keyboardType, testID, multiline }: FieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType={keyboardType || 'default'}
        testID={testID}
        multiline={multiline}
      />
    </View>
  );
}

interface ChipsSelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  testID?: string;
  renderLabel?: (v: T) => string;
}

export function ChipsSelect<T extends string>({ label, value, options, onChange, testID, renderLabel }: ChipsSelectProps<T>) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {options.map((opt) => {
          const active = opt === value;
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => onChange(opt)}
              style={[styles.chip, active && styles.chipActive]}
              testID={`${testID || 'chip'}-${opt}`}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {renderLabel ? renderLabel(opt) : opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

export function PrimaryButton({ label, onPress, disabled, testID }: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.btn, disabled && styles.btnDisabled]}
      testID={testID}
    >
      <Text style={styles.btnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fieldGroup: { marginBottom: spacing.md },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chipActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  chipText: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  chipTextActive: { color: '#000', fontWeight: '700' },
  btn: {
    backgroundColor: colors.success,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
