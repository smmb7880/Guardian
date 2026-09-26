import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '../theme/theme';
import { Button, Card, Badge, LoadingSpinner, ErrorState } from '../components';
import { useAuth } from '../context/AuthProvider';
import { useNavigation } from '../navigation/NavigationContext';
import { ApiClient } from '../services/apiClient';
import { loadNotifications, markNotificationRead, AppNotification } from './NotificationsScreenLogic';

export const NotificationsScreen: React.FC = () => {
  const { state: authState } = useAuth();
  const { navigate } = useNavigation();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      const data = await loadNotifications(client);
      setNotifications(data);
    } catch (err) {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      await markNotificationRead(client, id);
      fetchNotifications();
    } catch (err) {
      setError('Failed to mark read');
    }
  };

  if (loading) return <LoadingSpinner message="Loading notifications..." fullScreen />;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.topBar}>
        <Button title="← Dashboard" onPress={() => navigate('Dashboard')} variant="ghost" size="sm" />
        <Text style={styles.screenTitle}>Push Notifications</Text>
      </View>

      {error && <ErrorState message={error} onRetry={fetchNotifications} />}

      {notifications.map((item) => (
        <Card
          key={item.id}
          variant={item.readAt ? 'default' : 'highlight'}
          style={styles.notifCard}
        >
          <TouchableOpacity onPress={() => handleMarkRead(item.id)}>
            <View style={styles.notifHeader}>
              <Text style={styles.notifTitle}>{item.title}</Text>
              {!item.readAt && <Badge label="New" status="warning" />}
            </View>
            <Text style={styles.notifBody}>{item.body}</Text>
            <Text style={styles.notifTime}>{new Date(item.createdAt).toLocaleString()}</Text>
          </TouchableOpacity>
        </Card>
      ))}
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
  notifCard: {
    marginBottom: theme.spacing.sm,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notifTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
  },
  notifBody: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
    marginBottom: theme.spacing.xs,
  },
  notifTime: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
  },
});
