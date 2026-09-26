import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { theme } from '../theme/theme';
import { Button, Card, Input, ErrorState } from '../components';
import { useAuth } from '../context/AuthProvider';
import { useNavigation } from '../navigation/NavigationContext';
import { ApiClient } from '../services/apiClient';
import {
  initialRegisterFormState,
  validateRegisterForm,
  performRegistration,
  handleRegisterError,
} from './RegisterScreenLogic';

export const RegisterScreen: React.FC = () => {
  const { dispatch } = useAuth();
  const { navigate } = useNavigation();
  const [form, setForm] = useState(initialRegisterFormState);

  const handleSubmit = async () => {
    const fieldErrors = validateRegisterForm(form);
    if (Object.keys(fieldErrors).length > 0) {
      setForm((prev) => ({ ...prev, fieldErrors }));
      return;
    }

    setForm((prev) => ({ ...prev, isLoading: true, formError: null, fieldErrors: {} }));
    try {
      const client = new ApiClient();
      await performRegistration(client, form, dispatch);
      navigate('FamilySetup');
    } catch (err) {
      const msg = handleRegisterError(err, dispatch);
      setForm((prev) => ({ ...prev, isLoading: false, formError: msg }));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.badgeIcon}>✨</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Set up your Guardian parent profile</Text>
        </View>

        {form.formError && <ErrorState message={form.formError} />}

        <Card variant="glass">
          <Input
            label="Full Name"
            placeholder="Jane Doe"
            value={form.displayName}
            onChangeText={(text) => setForm((p) => ({ ...p, displayName: text, fieldErrors: { ...p.fieldErrors, displayName: undefined } }))}
            error={form.fieldErrors.displayName}
          />

          <Input
            label="Email Address"
            placeholder="parent@example.com"
            value={form.email}
            onChangeText={(text) => setForm((p) => ({ ...p, email: text, fieldErrors: { ...p.fieldErrors, email: undefined } }))}
            error={form.fieldErrors.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Password"
            placeholder="At least 8 characters"
            value={form.password}
            onChangeText={(text) => setForm((p) => ({ ...p, password: text, fieldErrors: { ...p.fieldErrors, password: undefined } }))}
            error={form.fieldErrors.password}
            isPassword
          />

          <Input
            label="Confirm Password"
            placeholder="Re-enter password"
            value={form.confirmPassword}
            onChangeText={(text) => setForm((p) => ({ ...p, confirmPassword: text, fieldErrors: { ...p.fieldErrors, confirmPassword: undefined } }))}
            error={form.fieldErrors.confirmPassword}
            isPassword
          />

          <Button
            title="Create Account"
            onPress={handleSubmit}
            isLoading={form.isLoading}
            style={styles.submitBtn}
          />
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Button
            title="Sign In"
            onPress={() => navigate('Login')}
            variant="ghost"
            size="sm"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
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
  },
  submitBtn: {
    marginTop: theme.spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
    gap: 4,
  },
  footerText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
  },
});
