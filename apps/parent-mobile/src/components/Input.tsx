import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { theme } from '../theme/theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  isPassword?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  icon,
  isPassword = false,
  style,
  secureTextEntry,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const containerStyles = [
    styles.inputContainer,
    isFocused && styles.inputFocused,
    !!error && styles.inputError,
  ];

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={containerStyles}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry={isPassword ? !showPassword : secureTextEntry}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.eyeText}>{showPassword ? '👁️' : '🙈'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: theme.spacing.xs,
    width: '100%',
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    marginBottom: theme.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 48,
  },
  inputFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceElevated,
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  iconContainer: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.md,
    height: '100%',
  },
  eyeButton: {
    padding: theme.spacing.xs,
  },
  eyeText: {
    fontSize: 16,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: theme.typography.sizes.xs,
    marginTop: 4,
  },
  helperText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
    marginTop: 4,
  },
});
