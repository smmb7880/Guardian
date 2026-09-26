import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text, ViewStyle } from 'react-native';
import { theme } from '../theme/theme';

export interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
  style?: ViewStyle;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  fullScreen = false,
  style,
}) => {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen, style]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  message: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
    marginTop: theme.spacing.md,
  },
});
