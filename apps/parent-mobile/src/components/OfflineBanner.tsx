import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

export interface OfflineBannerProps {
  isOffline?: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOffline = false }) => {
  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.icon}>📡</Text>
      <Text style={styles.text}>You are offline. Policies are cached locally.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: theme.colors.warning,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.md,
    gap: 8,
  },
  icon: {
    fontSize: 14,
  },
  text: {
    color: '#000000',
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
  },
});
