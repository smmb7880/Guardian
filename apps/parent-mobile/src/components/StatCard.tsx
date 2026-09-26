import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme/theme';

export interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  subtitle?: string;
  icon?: string;
  accentColor?: string;
  style?: ViewStyle;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  subtitle,
  icon,
  accentColor = theme.colors.primary,
  style,
}) => {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {icon && <Text style={styles.icon}>{icon}</Text>}
      </View>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flex: 1,
    minWidth: 140,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  icon: {
    fontSize: 16,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
  },
  unit: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
    marginTop: 4,
  },
});
