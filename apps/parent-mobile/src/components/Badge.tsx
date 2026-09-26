import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme/theme';

export type BadgeStatus = 'online' | 'offline' | 'active' | 'blocked' | 'pending' | 'warning';

export interface BadgeProps {
  label: string;
  status?: BadgeStatus;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, status = 'active', style }) => {
  return (
    <View style={[styles.badge, styles[`status_${status}`], style]}>
      <View style={[styles.dot, styles[`dot_${status}`]]} />
      <Text style={[styles.text, styles[`text_${status}`]]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
    alignSelf: 'flex-start',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
  },
  status_online: { backgroundColor: theme.colors.secondaryGlow },
  dot_online: { backgroundColor: theme.colors.secondary },
  text_online: { color: theme.colors.secondary },

  status_active: { backgroundColor: theme.colors.secondaryGlow },
  dot_active: { backgroundColor: theme.colors.secondary },
  text_active: { color: theme.colors.secondary },

  status_offline: { backgroundColor: 'rgba(148, 163, 184, 0.15)' },
  dot_offline: { backgroundColor: theme.colors.textMuted },
  text_offline: { color: theme.colors.textMuted },

  status_blocked: { backgroundColor: theme.colors.dangerGlow },
  dot_blocked: { backgroundColor: theme.colors.danger },
  text_blocked: { color: theme.colors.danger },

  status_pending: { backgroundColor: theme.colors.warningGlow },
  dot_pending: { backgroundColor: theme.colors.warning },
  text_pending: { color: theme.colors.warning },

  status_warning: { backgroundColor: theme.colors.warningGlow },
  dot_warning: { backgroundColor: theme.colors.warning },
  text_warning: { color: theme.colors.warning },
});
