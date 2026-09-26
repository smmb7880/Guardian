import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '../theme/theme';
import { Button, Card, StatCard, Badge, LoadingSpinner, ErrorState } from '../components';
import { useAuth } from '../context/AuthProvider';
import { useNavigation } from '../navigation/NavigationContext';
import { ApiClient } from '../services/apiClient';
import { Child, Device } from '@guardian/shared-types';
import {
  formatMinutes,
  screenTimePercent,
  formatNextTransition,
} from './DashboardScreenLogic';

export const DashboardScreen: React.FC = () => {
  const { state: authState } = useAuth();
  const { state: navState, navigate } = useNavigation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [child, setChild] = useState<Child | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [todayUsage, setTodayUsage] = useState(75); // mock default for presentation
  const [dailyLimit, setDailyLimit] = useState(120);
  const [currentSchedule, setCurrentSchedule] = useState('Homework Mode');
  const [pendingRequestsCount, setPendingRequestsCount] = useState(1);

  const familyId = authState.user?.familyId;
  const targetChildId = navState.params?.childId as string;

  const fetchDashboardData = async () => {
    if (!familyId) return;
    setLoading(true);
    setError(null);
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      // Fetch children list if no target child specified
      const children = await client.get<Child[]>(`/families/${familyId}/children`);
      if (children.length > 0) {
        const activeChild = targetChildId
          ? children.find((c) => c.id === targetChildId) || children[0]
          : children[0];
        setChild(activeChild);

        const childDevices = await client.get<Device[]>(`/children/${activeChild.id}/devices`).catch(() => []);
        setDevices(childDevices);
      }
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [familyId, targetChildId]);

  if (loading) return <LoadingSpinner message="Loading Dashboard..." fullScreen />;

  const isOnline = devices.some((d) => d.isPaired);
  const percentUsed = screenTimePercent(todayUsage, dailyLimit);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {/* Top Bar Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.greeting}>Parent Control</Text>
          <Text style={styles.childHeaderName}>
            {child ? child.name : 'All Children'}
          </Text>
        </View>
        <Badge
          label={isOnline ? 'Device Online' : 'Offline'}
          status={isOnline ? 'online' : 'offline'}
        />
      </View>

      {error && <ErrorState message={error} onRetry={fetchDashboardData} />}

      {/* Pending Extra Time Request Alert */}
      {pendingRequestsCount > 0 && (
        <TouchableOpacity
          onPress={() => navigate('ExtraTime')}
          style={styles.alertCard}
        >
          <Text style={styles.alertIcon}>⏱️</Text>
          <View style={styles.alertTextContent}>
            <Text style={styles.alertTitle}>1 Pending Extra-Time Request</Text>
            <Text style={styles.alertSub}>Tap to review and approve or reject</Text>
          </View>
          <Text style={styles.alertArrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* Screen Time Usage Overview */}
      <Card variant="glass" title="Today's Screen Time">
        <View style={styles.usageRow}>
          <Text style={styles.usageBig}>{formatMinutes(todayUsage)}</Text>
          <Text style={styles.usageLimit}>of {formatMinutes(dailyLimit)} limit</Text>
        </View>
        {/* Custom Progress Bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percentUsed}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{percentUsed}% of daily limit used</Text>
      </Card>

      {/* Quick Metrics Cards */}
      <View style={styles.metricsGrid}>
        <StatCard
          label="Active Mode"
          value={currentSchedule || 'Standard'}
          icon="📅"
          accentColor={theme.colors.secondary}
          subtitle="Next: Bedtime at 20:00"
        />
        <StatCard
          label="Paired Devices"
          value={devices.length.toString()}
          unit="active"
          icon="📱"
          accentColor={theme.colors.primaryLight}
        />
      </View>

      {/* Navigation Quick Action Tiles */}
      <Text style={styles.sectionHeading}>Management Controls</Text>

      <View style={styles.actionGrid}>
        <TouchableOpacity style={styles.actionTile} onPress={() => navigate('ScreenTime')}>
          <Text style={styles.tileIcon}>📊</Text>
          <Text style={styles.tileTitle}>Screen Time</Text>
          <Text style={styles.tileSub}>Daily limits & app usage analytics</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionTile} onPress={() => navigate('AppRules')}>
          <Text style={styles.tileIcon}>🚫</Text>
          <Text style={styles.tileTitle}>App Rules</Text>
          <Text style={styles.tileSub}>Block apps & web restrictions</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionTile} onPress={() => navigate('Schedules')}>
          <Text style={styles.tileIcon}>⏰</Text>
          <Text style={styles.tileTitle}>Schedules</Text>
          <Text style={styles.tileSub}>School, Bedtime & Homework</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionTile} onPress={() => navigate('DeviceList')}>
          <Text style={styles.tileIcon}>📲</Text>
          <Text style={styles.tileTitle}>Devices</Text>
          <Text style={styles.tileSub}>Pairing codes & device security</Text>
        </TouchableOpacity>
      </View>

      {/* Footer Navigation bar */}
      <View style={styles.bottomNav}>
        <Button title="Children" onPress={() => navigate('ChildrenList')} variant="ghost" size="sm" />
        <Button title="Alerts" onPress={() => navigate('Notifications')} variant="ghost" size="sm" />
        <Button title="Settings" onPress={() => navigate('Settings')} variant="ghost" size="sm" />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    minHeight: '100%',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  greeting: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  childHeaderName: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
  },
  alertCard: {
    backgroundColor: theme.colors.warningGlow,
    borderColor: theme.colors.warning,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  alertIcon: {
    fontSize: 24,
  },
  alertTextContent: {
    flex: 1,
  },
  alertTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
  },
  alertSub: {
    color: theme.colors.warning,
    fontSize: theme.typography.sizes.xs,
    marginTop: 2,
  },
  alertArrow: {
    color: theme.colors.warning,
    fontSize: 18,
    fontWeight: 'bold',
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  usageBig: {
    color: theme.colors.primaryLight,
    fontSize: 36,
    fontWeight: theme.typography.weights.bold,
  },
  usageLimit: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.md,
  },
  progressTrack: {
    height: 10,
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    marginVertical: theme.spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
  },
  progressLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginVertical: theme.spacing.md,
  },
  sectionHeading: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    marginVertical: theme.spacing.sm,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  actionTile: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    width: '47%',
  },
  tileIcon: {
    fontSize: 28,
    marginBottom: theme.spacing.xs,
  },
  tileTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
  },
  tileSub: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
    marginTop: 2,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
});
