import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../theme/theme';
import { Button, Card, Input, ErrorState } from '../components';
import { useAuth } from '../context/AuthProvider';
import { useNavigation } from '../navigation/NavigationContext';
import { ApiClient } from '../services/apiClient';
import {
  initialFamilySetupFormState,
  validateFamilySetupForm,
  performFamilySetup,
  handleFamilySetupError,
} from './FamilySetupScreenLogic';

export const FamilySetupScreen: React.FC = () => {
  const { state: authState, dispatch } = useAuth();
  const { navigate } = useNavigation();
  const [form, setForm] = useState(initialFamilySetupFormState);

  const handleSubmit = async () => {
    const fieldErrors = validateFamilySetupForm(form);
    if (Object.keys(fieldErrors).length > 0) {
      setForm((prev) => ({ ...prev, fieldErrors }));
      return;
    }

    if (!authState.user) return;

    setForm((prev) => ({ ...prev, isLoading: true, formError: null, fieldErrors: {} }));
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      await performFamilySetup(client, form, authState.user, dispatch);
      navigate('Dashboard');
    } catch (err) {
      const msg = handleFamilySetupError(err);
      setForm((prev) => ({ ...prev, isLoading: false, formError: msg }));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.badgeIcon}>👨‍👩‍👧‍👦</Text>
        <Text style={styles.title}>Family Setup</Text>
        <Text style={styles.subtitle}>Set up your family profile and add your first child</Text>
      </View>

      {form.formError && <ErrorState message={form.formError} />}

      <Card variant="glass" title="1. Family Details">
        <Input
          label="Family Name"
          placeholder="e.g. The Smith Family"
          value={form.familyName}
          onChangeText={(text) => setForm((p) => ({ ...p, familyName: text, fieldErrors: { ...p.fieldErrors, familyName: undefined } }))}
          error={form.fieldErrors.familyName}
        />
      </Card>

      <Card variant="glass" title="2. First Child Profile" style={styles.cardMargin}>
        <Input
          label="Child's Full Name"
          placeholder="e.g. Alex Smith"
          value={form.firstChildName}
          onChangeText={(text) => setForm((p) => ({ ...p, firstChildName: text, fieldErrors: { ...p.fieldErrors, firstChildName: undefined } }))}
          error={form.fieldErrors.firstChildName}
        />

        <Input
          label="Date of Birth"
          placeholder="YYYY-MM-DD (e.g. 2012-05-15)"
          value={form.firstChildDateOfBirth}
          onChangeText={(text) => setForm((p) => ({ ...p, firstChildDateOfBirth: text, fieldErrors: { ...p.fieldErrors, firstChildDateOfBirth: undefined } }))}
          error={form.fieldErrors.firstChildDateOfBirth}
          helperText="Used to calculate appropriate default safety rules"
        />
      </Card>

      <Button
        title="Complete Setup"
        onPress={handleSubmit}
        isLoading={form.isLoading}
        style={styles.submitBtn}
        size="lg"
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginVertical: theme.spacing.xl,
  },
  badgeIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.xs,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
    marginTop: 4,
    textAlign: 'center',
  },
  cardMargin: {
    marginTop: theme.spacing.md,
  },
  submitBtn: {
    marginTop: theme.spacing.xl,
  },
});
