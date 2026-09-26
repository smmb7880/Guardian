import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';
import { useAuth } from '../context/AuthProvider';
import { useNavigation } from '../navigation/NavigationContext';
import { initializeSplashScreen } from './SplashScreenLogic';

export const SplashScreen: React.FC = () => {
  const { dispatch } = useAuth();
  const { navigate } = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => {
      const { nextScreen, restoredAuth } = initializeSplashScreen();
      if (restoredAuth.isAuthenticated && restoredAuth.user) {
        dispatch({
          type: 'RESTORE_SESSION',
          user: restoredAuth.user,
          accessToken: restoredAuth.accessToken || '',
          refreshToken: restoredAuth.refreshToken || '',
        });
      }
      navigate(nextScreen);
    }, 1000);

    return () => clearTimeout(timer);
  }, [dispatch, navigate]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoIcon}>🛡️</Text>
        <Text style={styles.title}>GUARDIAN</Text>
        <Text style={styles.tagline}>Parental Control & Safety</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 72,
    marginBottom: theme.spacing.md,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.hero,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 4,
  },
  tagline: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.md,
    marginTop: theme.spacing.xs,
  },
});
