import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme/theme';

export interface CardProps {
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'glass' | 'highlight';
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  headerAction,
  children,
  style,
  variant = 'default',
}) => {
  return (
    <View style={[styles.card, styles[`variant_${variant}`], style]}>
      {(title || subtitle || headerAction) && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title && <Text style={styles.title}>{title}</Text>}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {headerAction && <View style={styles.action}>{headerAction}</View>}
        </View>
      )}
      <View style={styles.body}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    marginVertical: theme.spacing.xs,
  },
  variant_default: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  variant_glass: {
    backgroundColor: theme.colors.glassBackground,
    borderColor: theme.colors.glassBorder,
    ...theme.shadows.md,
  },
  variant_highlight: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.primary,
    ...theme.shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
    marginTop: 2,
  },
  action: {
    marginLeft: theme.spacing.sm,
  },
  body: {
    width: '100%',
  },
});
