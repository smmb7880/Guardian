import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Modal } from 'react-native';
import { theme } from '../theme/theme';
import { Button, Card, Badge, LoadingSpinner, ErrorState } from '../components';
import { useAuth } from '../context/AuthProvider';
import { useNavigation } from '../navigation/NavigationContext';
import { ApiClient } from '../services/apiClient';
import { Device } from '@guardian/shared-types';
import {
  loadDevices,
  generatePairingCode,
  revokeDevice,
  unpairDevice,
  formatPairingCodeForDisplay,
  PairingCodeResponse,
} from './DeviceListScreenLogic';

export const DeviceListScreen: React.FC = () => {
  const { state: authState } = useAuth();
  const { state: navState, navigate } = useNavigation();
  const childId = (navState.params?.childId as string) || '';

  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pairing code modal state
  const [pairingCodeData, setPairingCodeData] = useState<PairingCodeResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchDevices = async () => {
    if (!childId) return;
    setLoading(true);
    setError(null);
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      const data = await loadDevices(client, childId);
      setDevices(data);
    } catch (err) {
      setError('Failed to load child devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [childId]);

  const handleGenerateCode = async () => {
    if (!childId) return;
    setIsGenerating(true);
    setError(null);
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      const codeData = await generatePairingCode(client, childId);
      setPairingCodeData(codeData);
    } catch (err) {
      setError('Failed to generate pairing code');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = async (deviceId: string) => {
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      await revokeDevice(client, deviceId);
      fetchDevices();
    } catch (err) {
      setError('Failed to revoke device');
    }
  };

  const handleUnpair = async (deviceId: string) => {
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      await unpairDevice(client, deviceId);
      fetchDevices();
    } catch (err) {
      setError('Failed to unpair device');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Button title="← Dashboard" onPress={() => navigate('Dashboard')} variant="ghost" size="sm" />
        <Text style={styles.screenTitle}>Child Devices</Text>
        <Button
          title="+ Pair Device"
          onPress={handleGenerateCode}
          isLoading={isGenerating}
          size="sm"
        />
      </View>

      {error && <ErrorState message={error} onRetry={fetchDevices} />}

      {loading ? (
        <LoadingSpinner message="Loading devices..." />
      ) : devices.length === 0 ? (
        <Card variant="glass" style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📱</Text>
          <Text style={styles.emptyTitle}>No Devices Paired</Text>
          <Text style={styles.emptySubtitle}>Generate a single-use code to pair any Android or iOS child device.</Text>
          <Button
            title="Generate Pairing Code"
            onPress={handleGenerateCode}
            style={{ marginTop: 16 }}
          />
        </Card>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isIOS = item.platform === 'IOS';
            const mechanismLabel = isIOS ? 'Apple ManagedSettings Shields' : 'Android System Alert Overlays';

            return (
              <Card
                variant="default"
                style={styles.deviceCard}
                headerAction={
                  <Badge
                    label={item.isPaired ? 'Paired' : 'Unpaired'}
                    status={item.isPaired ? 'active' : 'offline'}
                  />
                }
              >
                <View style={styles.deviceRow}>
                  <Text style={styles.deviceIcon}>{isIOS ? '🍎' : '🤖'}</Text>
                  <View style={styles.deviceMeta}>
                    <View style={styles.titleRow}>
                      <Text style={styles.deviceName}>{item.name}</Text>
                      <Badge label={item.platform} status={isIOS ? 'active' : 'warning'} />
                    </View>
                    <Text style={styles.devicePlatform}>{item.platformVersion || item.platform} • ID: {item.platformDeviceId}</Text>
                    <Text style={styles.capabilityText}>Enforcement Mode: {mechanismLabel}</Text>
                    {item.lastActiveAt && (
                      <Text style={styles.lastActive}>Last active: {new Date(item.lastActiveAt).toLocaleString()}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.actionRow}>
                  <Button title="Unpair" onPress={() => handleUnpair(item.id)} variant="ghost" size="sm" />
                  <Button title="Revoke Access" onPress={() => handleRevoke(item.id)} variant="danger" size="sm" />
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* Pairing Code Modal */}
      <Modal visible={!!pairingCodeData} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card variant="highlight" title="Pair Child Device" style={styles.modalCard}>
            <Text style={styles.modalInstructions}>Enter this single-use 6-character code on the child's device (Android or iOS):</Text>
            
            <View style={styles.codeContainer}>
              <Text style={styles.codeText}>
                {pairingCodeData ? formatPairingCodeForDisplay(pairingCodeData.pairingCode) : ''}
              </Text>
            </View>

            <Text style={styles.expiryText}>Expires at: {pairingCodeData ? new Date(pairingCodeData.expiresAt).toLocaleTimeString() : ''}</Text>

            <Button
              title="Done"
              onPress={() => setPairingCodeData(null)}
              style={{ marginTop: 16 }}
            />
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
    fontSize: theme.typography.sizes.lg,
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
  deviceCard: {
    marginBottom: theme.spacing.sm,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  deviceIcon: {
    fontSize: 32,
  },
  deviceMeta: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  deviceName: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
  },
  devicePlatform: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.xs,
    marginTop: 2,
  },
  capabilityText: {
    color: theme.colors.primaryLight,
    fontSize: theme.typography.sizes.xs,
    marginTop: 2,
    fontStyle: 'italic',
  },
  lastActive: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    width: '100%',
    alignItems: 'center',
  },
  modalInstructions: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  codeContainer: {
    backgroundColor: theme.colors.inputBg,
    borderColor: theme.colors.primary,
    borderWidth: 2,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    marginVertical: theme.spacing.sm,
  },
  codeText: {
    color: theme.colors.primaryLight,
    fontSize: 36,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 6,
  },
  expiryText: {
    color: theme.colors.warning,
    fontSize: theme.typography.sizes.xs,
    marginTop: 4,
  },
});
