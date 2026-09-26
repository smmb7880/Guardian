import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { theme } from '../theme/theme';
import { Button, Card, Badge, LoadingSpinner, ErrorState } from '../components';
import { useAuth } from '../context/AuthProvider';
import { useNavigation } from '../navigation/NavigationContext';
import { ApiClient } from '../services/apiClient';
import { loadExtraTimeRequests, approveRequest, denyRequest, ExtraTimeRequestItem } from './ExtraTimeScreenLogic';

export const ExtraTimeScreen: React.FC = () => {
  const { state: authState } = useAuth();
  const { navigate } = useNavigation();

  const [requests, setRequests] = useState<ExtraTimeRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customMinutesMap, setCustomMinutesMap] = useState<Record<string, string>>({});

  const familyId = authState.user?.familyId;

  const fetchRequests = async () => {
    if (!familyId) return;
    setLoading(true);
    setError(null);
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      const data = await loadExtraTimeRequests(client, familyId);
      setRequests(data);
    } catch (err) {
      setError('Failed to load extra-time requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [familyId]);

  const handleApprove = async (requestId: string, minutes: number, policyVersion?: number) => {
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      await approveRequest(client, requestId, minutes, policyVersion);
      fetchRequests();
    } catch (err: any) {
      setError(err?.message || 'Failed to approve request');
    }
  };

  const handleDeny = async (requestId: string) => {
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      await denyRequest(client, requestId);
      fetchRequests();
    } catch (err: any) {
      setError(err?.message || 'Failed to deny request');
    }
  };

  if (loading) return <LoadingSpinner message="Loading requests..." fullScreen />;

  const pendingList = requests.filter((r) => r.status === 'PENDING');

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.topBar}>
        <Button title="← Dashboard" onPress={() => navigate('Dashboard')} variant="ghost" size="sm" />
        <Text style={styles.screenTitle}>Extra-Time Requests</Text>
      </View>

      {error && <ErrorState message={error} onRetry={fetchRequests} />}

      {pendingList.length === 0 ? (
        <Card variant="glass" style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>No Pending Requests</Text>
          <Text style={styles.emptySubtitle}>Your children have not submitted any extra-time requests right now.</Text>
        </Card>
      ) : (
        pendingList.map((item) => {
          const customMinsStr = customMinutesMap[item.id] || '';
          const customMinsVal = parseInt(customMinsStr, 10);
          const hasValidCustom = !isNaN(customMinsVal) && customMinsVal > 0 && customMinsVal <= 240;

          return (
            <Card key={item.id} variant="highlight" style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <Text style={styles.childName}>{item.childName}</Text>
                <Badge label="Pending" status="warning" />
              </View>

              <View style={styles.minuteBadge}>
                <Text style={styles.minuteText}>+{item.requestedMinutes} Minutes Requested</Text>
              </View>

              {item.reason && <Text style={styles.reasonText}>"{item.reason}"</Text>}

              <Text style={styles.timeText}>Requested: {new Date(item.requestedAt).toLocaleTimeString()}</Text>

              {/* Action Options: +15m, +30m, Custom, Deny */}
              <View style={styles.quickApproveRow}>
                <Button
                  title="+15 min"
                  onPress={() => handleApprove(item.id, 15, item.policyVersionAtRequest)}
                  variant="secondary"
                  size="sm"
                  style={{ flex: 1 }}
                />
                <Button
                  title="+30 min"
                  onPress={() => handleApprove(item.id, 30, item.policyVersionAtRequest)}
                  variant="secondary"
                  size="sm"
                  style={{ flex: 1 }}
                />
                <Button
                  title="Approve Requested"
                  onPress={() => handleApprove(item.id, item.requestedMinutes, item.policyVersionAtRequest)}
                  variant="primary"
                  size="sm"
                  style={{ flex: 1 }}
                />
              </View>

              <View style={styles.customRow}>
                <TextInput
                  style={styles.customInput}
                  placeholder="Custom mins"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                  value={customMinsStr}
                  onChangeText={(txt) => setCustomMinutesMap({ ...customMinutesMap, [item.id]: txt })}
                />
                <Button
                  title="Grant Custom"
                  onPress={() => hasValidCustom && handleApprove(item.id, customMinsVal, item.policyVersionAtRequest)}
                  variant="ghost"
                  size="sm"
                  disabled={!hasValidCustom}
                />
              </View>

              <View style={styles.actionRow}>
                <Button
                  title="Deny Request"
                  onPress={() => handleDeny(item.id)}
                  variant="danger"
                  size="md"
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          );
        })
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
  emptyCard: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    marginTop: theme.spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
  },
  emptySubtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
    textAlign: 'center',
    marginTop: 4,
  },
  requestCard: {
    marginBottom: theme.spacing.md,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  childName: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
  },
  minuteBadge: {
    backgroundColor: theme.colors.primaryGlow,
    borderColor: theme.colors.primary,
    borderWidth: 1,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginVertical: theme.spacing.sm,
  },
  minuteText: {
    color: theme.colors.primaryLight,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
  },
  reasonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.sm,
    fontStyle: 'italic',
    marginBottom: theme.spacing.xs,
  },
  timeText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
    marginBottom: theme.spacing.sm,
  },
  quickApproveRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  customInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.sm,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
});
