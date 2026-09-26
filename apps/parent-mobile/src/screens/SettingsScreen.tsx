import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal } from 'react-native';
import { theme } from '../theme/theme';
import { Button, Card, Input, ErrorState } from '../components';
import { useAuth } from '../context/AuthProvider';
import { useNavigation } from '../navigation/NavigationContext';
import { ApiClient } from '../services/apiClient';
import { performLogout, requestAccountDeletion } from './SettingsScreenLogic';

export const SettingsScreen: React.FC = () => {
  const { state: authState, dispatch } = useAuth();
  const { navigate } = useNavigation();

  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const user = authState.user;

  const handleLogout = async () => {
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      await performLogout(client, authState.refreshToken || '', dispatch);
      navigate('Login');
    } catch (err) {
      dispatch({ type: 'LOGOUT' });
      navigate('Login');
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirmPassword) return;
    setIsDeleting(true);
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      await requestAccountDeletion(client, confirmPassword);
      dispatch({ type: 'LOGOUT' });
      navigate('Login');
    } catch (err) {
      setError('Failed to delete account. Check password.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.topBar}>
        <Button title="← Dashboard" onPress={() => navigate('Dashboard')} variant="ghost" size="sm" />
        <Text style={styles.screenTitle}>Parent Settings</Text>
      </View>

      {error && <ErrorState message={error} />}

      {/* Account Info */}
      <Card variant="glass" title="Account Details">
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{user?.role || 'PARENT'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Family ID</Text>
          <Text style={styles.value}>{user?.familyId || 'Not connected'}</Text>
        </View>
      </Card>

      {/* Security & Actions */}
      <Card variant="default" title="Security & Session" style={styles.sectionCard}>
        <Button title="Sign Out" onPress={handleLogout} variant="secondary" style={styles.actionBtn} />
      </Card>

      {/* Danger Zone */}
      <Card variant="default" title="Danger Zone" style={styles.dangerCard}>
        <Text style={styles.dangerText}>Deleting your account will permanently remove all family, child profiles, and device pairing data.</Text>
        <Button
          title="Delete Parent Account"
          onPress={() => setShowDeleteModal(true)}
          variant="danger"
          style={{ marginTop: 12 }}
        />
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card variant="highlight" title="Confirm Account Deletion" style={{ width: '100%' }}>
            <Text style={styles.modalText}>Enter your password to confirm permanent account deletion:</Text>
            <Input
              label="Password"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" onPress={() => setShowDeleteModal(false)} variant="ghost" />
              <Button title="Permanently Delete" onPress={handleDeleteAccount} variant="danger" isLoading={isDeleting} />
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
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  screenTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
  },
  value: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  sectionCard: {
    marginTop: theme.spacing.md,
  },
  actionBtn: {
    marginVertical: theme.spacing.xs,
  },
  dangerCard: {
    marginTop: theme.spacing.xl,
    borderColor: theme.colors.danger,
  },
  dangerText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
    marginBottom: theme.spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
});
