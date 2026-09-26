import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './context/AuthProvider';
import { NavigationProvider } from './navigation/NavigationContext';
import { ScreenRouter } from './navigation/ScreenRouter';
import { theme } from './theme/theme';

const AppInner: React.FC = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <ScreenRouter />
    </SafeAreaView>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <NavigationProvider isAuthenticated={false} hasFamilyId={false}>
        <AppInner />
      </NavigationProvider>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
