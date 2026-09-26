import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal } from 'react-native';
import { theme } from '../theme/theme';
import { Button, Card, Badge, LoadingSpinner, ErrorState, Input } from '../components';
import { useAuth } from '../context/AuthProvider';
import { useNavigation } from '../navigation/NavigationContext';
import { ApiClient } from '../services/apiClient';
import { Child } from '@guardian/shared-types';
import { loadChildrenList, createChild, deleteChild } from './ChildrenListScreenLogic';

export const ChildrenListScreen: React.FC = () => {
  const { state: authState } = useAuth();
  const { navigate } = useNavigation();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add child modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildDob, setNewChildDob] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const familyId = authState.user?.familyId;

  const fetchChildren = async () => {
    if (!familyId) return;
    setLoading(true);
    setError(null);
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      const data = await loadChildrenList(client, familyId);
      setChildren(data);
    } catch (err) {
      setError('Failed to load children list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, [familyId]);

  const handleAddChild = async () => {
    if (!familyId || !newChildName.trim() || !newChildDob.trim()) return;
    setIsAdding(true);
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      await createChild(client, familyId, newChildName, newChildDob);
      setShowAddModal(false);
      setNewChildName('');
      setNewChildDob('');
      fetchChildren();
    } catch (err) {
      setError('Failed to add child');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteChild = async (childId: string) => {
    if (!familyId) return;
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      await deleteChild(client, familyId, childId);
      fetchChildren();
    } catch (err) {
      setError('Failed to delete child');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>Children</Text>
        <Button
          title="+ Add Child"
          onPress={() => setShowAddModal(true)}
          size="sm"
        />
      </View>

      {error && <ErrorState message={error} onRetry={fetchChildren} />}

      {loading ? (
        <LoadingSpinner message="Loading children..." fullScreen={false} />
      ) : children.length === 0 ? (
        <Card variant="glass" style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>👶</Text>
          <Text style={styles.emptyTitle}>No Children Added</Text>
          <Text style={styles.emptySubtitle}>Add your first child profile to begin setting screen time rules.</Text>
          <Button
            title="Add Child Now"
            onPress={() => setShowAddModal(true)}
            style={{ marginTop: 12 }}
          />
        </Card>
      ) : (
        <FlatList
          data={children}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card
              variant="default"
              style={styles.childCard}
              headerAction={
                <Badge label="Active" status="online" />
              }
            >
              <TouchableOpacity
                onPress={() => navigate('ChildProfile', { childId: item.id })}
                style={styles.cardContent}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.childName}>{item.name}</Text>
                  <Text style={styles.dobText}>DOB: {item.dateOfBirth}</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.cardFooter}>
                <Button
                  title="View Dashboard"
                  onPress={() => navigate('Dashboard', { childId: item.id })}
                  variant="outline"
                  size="sm"
                />
                <Button
                  title="Delete"
                  onPress={() => handleDeleteChild(item.id)}
                  variant="danger"
                  size="sm"
                />
              </View>
            </Card>
          )}
        />
      )}

      {/* Add Child Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card variant="highlight" title="Add Child Profile" style={styles.modalCard}>
            <Input
              label="Child's Full Name"
              placeholder="e.g. Leo Smith"
              value={newChildName}
              onChangeText={setNewChildName}
            />
            <Input
              label="Date of Birth"
              placeholder="YYYY-MM-DD"
              value={newChildDob}
              onChangeText={setNewChildDob}
            />
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setShowAddModal(false)}
                variant="ghost"
              />
              <Button
                title="Save Child"
                onPress={handleAddChild}
                isLoading={isAdding}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  childCard: {
    marginBottom: theme.spacing.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
  },
  info: {
    flex: 1,
  },
  childName: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
  },
  dobText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.xs,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    width: '100%',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
});
