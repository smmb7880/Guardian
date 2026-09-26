import { AuthState, restoreSessionFromStorage } from '../context/AuthContext';
import { getInitialScreen, Screen } from '../navigation/AppNavigator';

export interface SplashScreenResult {
  nextScreen: Screen;
  restoredAuth: AuthState;
}

export function initializeSplashScreen(): SplashScreenResult {
  const restoredAuth = restoreSessionFromStorage();
  const nextScreen = getInitialScreen(
    restoredAuth.isAuthenticated,
    !!restoredAuth.user?.familyId,
  );
  return { nextScreen, restoredAuth };
}
