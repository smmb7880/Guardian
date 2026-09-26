import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList } from 'react-native';
import { theme } from '../theme/theme';
import { Button, Card, Input, LoadingSpinner, ErrorState } from '../components';
import { useAuth } from '../context/AuthProvider';
import { useNavigation } from '../navigation/NavigationContext';
import { ApiClient } from '../services/apiClient';
import { loadScreenTime, updateDailyLimit, ScreenTimeUsageResponse } from './ScreenTimeScreenLogic';
import { formatMinutes } from './DashboardScreenLogic';

export const ScreenTimeScreen: React.FC = () => {
  const { state: authState } = useAuth();
  const { state: navState, navigate } = useNavigation();
  const childId = (navState.params?.childId as string) || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usageData, setUsageData] = useState<ScreenTimeUsageResponse | null>(null);

  // Daily limit editor
  const [newLimitMinutes, setNewLimitMinutes] = useState('180');
  const [isUpdatingLimit, setIsUpdatingLimit] = useState(false);

  const fetchScreenTime = async () => {
    setLoading(true);
    setError(null);
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      const today = new Date().toISOString().split('T')[0];
      const data = await loadScreenTime(client, childId, today);
      setUsageData(data);
      if (data.dailyLimitMinutes) setNewLimitMinutes(data.dailyLimitMinutes.toString());
    } catch (err) {
      setError('Failed to load screen time details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreenTime();
  }, [childId]);

  const handleSaveLimit = async () => {
    const mins = parseInt(newLimitMinutes, 10);
    if (isNaN(mins) || mins < 0) return;
    setIsUpdatingLimit(true);
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      await updateDailyLimit(client, 'default-policy-id', mins);
      fetchScreenTime();
    } catch (err) {
      setError('Failed to save daily limit');
    } finally {
      setIsUpdatingLimit(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading screen time analytics..." fullScreen />;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.topBar}>
        <Button title="← Dashboard" onPress={() => navigate('Dashboard')} variant="ghost" size="sm" />
        <Text style={styles.screenTitle}>Screen Time</Text>
      </View>

      {error && <ErrorState message={error} onRetry={fetchScreenTime} />}

      {usageData && (
        <>
          {/* Summary Card */}
          <Card variant="glass" title="Today's Summary">
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>Total Usage</Text>
                <Text style={styles.summaryValue}>{formatMinutes(usageData.totalMinutes)}</Text>
              </View>
              <View style={styles.divider} />
              <View>
                <Text style={styles.summaryLabel}>Daily Limit</Text>
                <Text style={styles.summaryValue}>{usageData.dailyLimitMinutes ? formatMinutes(usageData.dailyLimitMinutes) : 'None'}</Text>
              </View>
            </View>
          </Card>

          {/* Daily Limit Settings */}
          <Card variant="default" title="Adjust Daily Allowance" style={styles.sectionCard}>
            <Input
              label="Max Daily Screen Time (minutes)"
              value={newLimitMinutes}
              onChangeText={setNewLimitMinutes}
              keyboardType="number-pad"
              helperText="120 mins = 2 hours, 180 mins = 3 hours"
            />
            <Button
              title="Save Daily Limit"
              onPress={handleSaveLimit}
              isLoading={isUpdatingLimit}
              style={{ marginTop: 8 }}
            />
          </Card>

          {/* Top Apps Used */}
          <Text style={styles.sectionHeading}>Top App Usage</Text>
          {usageData.appBreakdown.map((app) => (
            <Card key={app.packageName} variant="default" style={styles.appCard}>
              <View style={styles.appRow}>
                <View style={styles.appIconContainer}>
                  <Text style={styles.appIconText}>📱</Text>
                </View>
                <View style={styles.appInfo}>
                  <Text style={styles.appName}>{app.displayName}</Text>
                  <Text style={styles.appPkg}>{app.packageName}</Text>
                </View>
                <Text style={styles.appTime}>{formatMinutes(app.minutes)}</Text>
              </View>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    minHeight: '100%',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  screenTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.sm,
  },
  summaryLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.xs,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: theme.colors.primaryLight,
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  sectionCard: {
    marginTop: theme.spacing.md,
  },
  sectionHeading: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    marginVertical: theme.spacing.md,
  },
  appCard: {
    marginBottom: theme.spacing.xs,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  appIconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconText: {
    fontSize: 20,
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
  },
  appPkg: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
  },
  appTime: {
    color: theme.colors.secondary,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
  },
});
