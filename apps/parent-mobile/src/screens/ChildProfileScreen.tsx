import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../theme/theme';
import { Button, Card, Input, Badge, LoadingSpinner, ErrorState } from '../components';
import { useAuth } from '../context/AuthProvider';
import { useNavigation } from '../navigation/NavigationContext';
import { ApiClient } from '../services/apiClient';
import { Child, Device } from '@guardian/shared-types';
import { loadChildProfile, updateChildProfile, unpairDevice, revokeDevice } from './ChildProfileScreenLogic';

export const ChildProfileScreen: React.FC = () => {
  const { state: authState } = useAuth();
  const { state: navState, navigate } = useNavigation();
  const childId = navState.params?.childId as string;
  const familyId = authState.user?.familyId;

  const [child, setChild] = useState<Child | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit form
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfile = async () => {
    if (!familyId || !childId) return;
    setLoading(true);
    setError(null);
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      const data = await loadChildProfile(client, familyId, childId);
      setChild(data.child);
      setDevices(data.devices);
      setName(data.child.name);
      setDob(data.child.dateOfBirth);
    } catch (err) {
      setError('Failed to load child profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [familyId, childId]);

  const handleUpdate = async () => {
    if (!familyId || !childId) return;
    setIsSaving(true);
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      const updated = await updateChildProfile(client, familyId, childId, { name, dateOfBirth: dob });
      setChild(updated);
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnpair = async (deviceId: string) => {
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      await unpairDevice(client, deviceId);
      fetchProfile();
    } catch (err) {
      setError('Failed to unpair device');
    }
  };

  const handleRevoke = async (deviceId: string) => {
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      await revokeDevice(client, deviceId);
      fetchProfile();
    } catch (err) {
      setError('Failed to revoke device');
    }
  };

  if (loading) return <LoadingSpinner message="Loading profile..." fullScreen />;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.topBar}>
        <Button title="← Back" onPress={() => navigate('ChildrenList')} variant="ghost" size="sm" />
        <Text style={styles.screenTitle}>Child Profile</Text>
      </View>

      {error && <ErrorState message={error} onRetry={fetchProfile} />}

      {child && (
        <>
          <Card variant="glass" title="Personal Details">
            <Input label="Full Name" value={name} onChangeText={setName} />
            <Input label="Date of Birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" />
            <Button
              title="Save Changes"
              onPress={handleUpdate}
              isLoading={isSaving}
              style={{ marginTop: 12 }}
            />
          </Card>

          <Card variant="glass" title="Paired Devices" style={styles.sectionCard}>
            {devices.length === 0 ? (
              <View style={styles.noDevices}>
                <Text style={styles.noDevicesText}>No devices paired to this child profile.</Text>
                <Button
                  title="+ Pair New Device"
                  onPress={() => navigate('DeviceList', { childId })}
                  variant="outline"
                  size="sm"
                  style={{ marginTop: 8 }}
                />
              </View>
            ) : (
              devices.map((device) => (
                <View key={device.id} style={styles.deviceRow}>
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.devicePlatform}>{device.platform} • {device.isPaired ? 'Paired' : 'Unpaired'}</Text>
                  </View>
                  <Badge label={device.isPaired ? 'Paired' : 'Revoked'} status={device.isPaired ? 'active' : 'offline'} />
                  <View style={styles.deviceActions}>
                    <Button title="Unpair" onPress={() => handleUnpair(device.id)} variant="ghost" size="sm" />
                    <Button title="Revoke" onPress={() => handleRevoke(device.id)} variant="danger" size="sm" />
                  </View>
                </View>
              ))
            )}
          </Card>
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
    marginBottom: theme.spacing.lg,
  },
  screenTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
  },
  sectionCard: {
    marginTop: theme.spacing.md,
  },
  noDevices: {
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  noDevicesText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  deviceInfo: {
    flex: 1,
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
  deviceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
