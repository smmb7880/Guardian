import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { ApiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthProvider';
import { useNavigation } from '../navigation/NavigationContext';

/** Simple wrapper to show loading/error states and title */
export const ScreenWrapper: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <ScrollView style={styles.content}>{children}</ScrollView>
  </View>
);

/** Example Dashboard component using the dashboard logic */
export const DashboardScreenComponent: React.FC = () => {
  const { state: authState } = useAuth();
  const { navigate } = useNavigation();
  const client = new ApiClient(authState.accessToken ?? undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // assuming familyId and childId are known; placeholders used here
        const familyId = authState.user?.familyId ?? '';
        const childId = '';
        // Load dashboard (logic function) would be imported; using placeholder fetch
        const data = await client.get<any>(`/children/${childId}/dashboard`);
        setDashboardData(data);
      } catch (e) {
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <ActivityIndicator size="large" color="#fff" style={styles.loader} />;
  if (error) return <Text style={styles.error}>{error}</Text>;

  return (
    <ScreenWrapper title="Dashboard">
      <Text style={styles.text}>Dashboard data loaded (placeholder).</Text>
    </ScreenWrapper>
  );
};

// Additional placeholder components can be added similarly for other screens.

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e2d', padding: 16 },
  title: { fontSize: 24, fontWeight: '600', color: '#e0e0ff', marginBottom: 12 },
  content: { flex: 1 },
  text: { color: '#fff', fontSize: 16 },
  error: { color: '#ff6b6b', fontSize: 16 },
  loader: { marginTop: 20 },
});
