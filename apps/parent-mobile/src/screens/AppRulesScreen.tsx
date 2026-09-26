import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal } from 'react-native';
import { theme } from '../theme/theme';
import { Button, Card, Badge, Input, LoadingSpinner, ErrorState } from '../components';
import { useAuth } from '../context/AuthProvider';
import { useNavigation } from '../navigation/NavigationContext';
import { ApiClient } from '../services/apiClient';
import { AppRule, RestrictionAction } from '@guardian/shared-types';
import { loadAppRules, addAppRule, removeAppRule } from './AppRulesScreenLogic';

export const AppRulesScreen: React.FC = () => {
  const { state: authState } = useAuth();
  const { navigate } = useNavigation();

  const [rules, setRules] = useState<AppRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add rule modal
  const [showModal, setShowModal] = useState(false);
  const [appId, setAppId] = useState('');
  const [appName, setAppName] = useState('');
  const [action, setAction] = useState<RestrictionAction>(RestrictionAction.BLOCK);
  const [isSaving, setIsSaving] = useState(false);

  const policyId = 'default-policy-id';

  const fetchRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      const data = await loadAppRules(client, policyId);
      setRules(data);
    } catch (err) {
      setError('Failed to load application rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleAddRule = async () => {
    if (!appId.trim() || !appName.trim()) return;
    setIsSaving(true);
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      await addAppRule(client, policyId, appId, appName, action);
      setShowModal(false);
      setAppId('');
      setAppName('');
      fetchRules();
    } catch (err) {
      setError('Failed to add app rule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveRule = async (appIdentifier: string) => {
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      await removeAppRule(client, policyId, appIdentifier);
      fetchRules();
    } catch (err) {
      setError('Failed to remove app rule');
    }
  };

  if (loading) return <LoadingSpinner message="Loading application rules..." fullScreen />;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.topBar}>
        <Button title="← Dashboard" onPress={() => navigate('Dashboard')} variant="ghost" size="sm" />
        <Text style={styles.screenTitle}>App & Web Rules</Text>
        <Button title="+ Add Rule" onPress={() => setShowModal(true)} size="sm" />
      </View>

      {error && <ErrorState message={error} onRetry={fetchRules} />}

      <Card variant="glass" title="Category Restrictions">
        <View style={styles.categoryRow}>
          <Text style={styles.catLabel}>🔞 Adult / Explicit Content</Text>
          <Badge label="Always Blocked" status="blocked" />
        </View>
        <View style={styles.categoryRow}>
          <Text style={styles.catLabel}>🎮 Social Media & Gaming</Text>
          <Badge label="Schedule Restricted" status="pending" />
        </View>
      </Card>

      <Text style={styles.sectionHeading}>App-Specific Rules</Text>

      {rules.map((rule) => (
        <Card key={rule.appIdentifier} variant="default" style={styles.ruleCard}>
          <View style={styles.ruleHeader}>
            <View style={styles.ruleInfo}>
              <Text style={styles.ruleName}>{rule.appName}</Text>
              <Text style={styles.ruleId}>{rule.appIdentifier}</Text>
            </View>
            <Badge
              label={rule.action}
              status={
                rule.action === RestrictionAction.BLOCK
                  ? 'blocked'
                  : rule.action === RestrictionAction.ALLOW
                  ? 'active'
                  : 'warning'
              }
            />
          </View>
          <View style={styles.ruleFooter}>
            <Button
              title="Remove Rule"
              onPress={() => handleRemoveRule(rule.appIdentifier)}
              variant="ghost"
              size="sm"
            />
          </View>
        </Card>
      ))}

      {/* Add Rule Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card variant="highlight" title="Add App Rule" style={{ width: '100%' }}>
            <Input label="App Name" placeholder="e.g. TikTok" value={appName} onChangeText={setAppName} />
            <Input label="Package Name / Bundle ID" placeholder="e.g. com.social.tiktok" value={appId} onChangeText={setAppId} />
            
            <Text style={styles.actionSelectLabel}>Rule Action:</Text>
            <View style={styles.actionBtnRow}>
              <Button
                title="BLOCK"
                onPress={() => setAction(RestrictionAction.BLOCK)}
                variant={action === RestrictionAction.BLOCK ? 'danger' : 'secondary'}
                size="sm"
              />
              <Button
                title="ALLOW"
                onPress={() => setAction(RestrictionAction.ALLOW)}
                variant={action === RestrictionAction.ALLOW ? 'primary' : 'secondary'}
                size="sm"
              />
              <Button
                title="LIMIT"
                onPress={() => setAction(RestrictionAction.LIMIT)}
                variant={action === RestrictionAction.LIMIT ? 'outline' : 'secondary'}
                size="sm"
              />
            </View>

            <View style={styles.modalActions}>
              <Button title="Cancel" onPress={() => setShowModal(false)} variant="ghost" />
              <Button title="Save Rule" onPress={handleAddRule} isLoading={isSaving} />
            </View>
          </Card>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  screenTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  catLabel: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.sm,
  },
  sectionHeading: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    marginVertical: theme.spacing.md,
  },
  ruleCard: {
    marginBottom: theme.spacing.xs,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ruleInfo: { flex: 1 },
  ruleName: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
  },
  ruleId: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
  },
  ruleFooter: {
    alignItems: 'flex-end',
    marginTop: theme.spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  actionSelectLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
    marginTop: theme.spacing.sm,
    marginBottom: 4,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
});
