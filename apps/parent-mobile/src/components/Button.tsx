import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../theme/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const containerStyles = [
    styles.base,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    (disabled || isLoading) && styles.disabled,
    style,
  ];

  const labelStyles = [
    styles.label,
    styles[`label_${variant}`],
    styles[`labelSize_${size}`],
    disabled && styles.disabledLabel,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={containerStyles}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? theme.colors.primary : '#FFFFFF'}
        />
      ) : (
        <>
          {icon}
          <Text style={labelStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    gap: 8,
  },
  size_sm: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  size_md: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  size_lg: {
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  variant_primary: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.sm,
  },
  variant_secondary: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  variant_danger: {
    backgroundColor: theme.colors.danger,
    ...theme.shadows.sm,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },
  variant_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.weights.semibold,
    textAlign: 'center',
  },
  labelSize_sm: {
    fontSize: theme.typography.sizes.sm,
  },
  labelSize_md: {
    fontSize: theme.typography.sizes.md,
  },
  labelSize_lg: {
    fontSize: theme.typography.sizes.lg,
  },
  label_primary: {
    color: '#FFFFFF',
  },
  label_secondary: {
    color: theme.colors.textPrimary,
  },
  label_danger: {
    color: '#FFFFFF',
  },
  label_ghost: {
    color: theme.colors.primaryLight,
  },
  label_outline: {
    color: theme.colors.primaryLight,
  },
  disabledLabel: {
    color: theme.colors.textMuted,
  },
});
