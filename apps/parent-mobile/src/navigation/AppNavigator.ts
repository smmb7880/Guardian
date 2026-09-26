export type Screen =
  | 'Splash'
  | 'Login'
  | 'Register'
  | 'FamilySetup'
  | 'ChildrenList'
  | 'ChildProfile'
  | 'DeviceList'
  | 'Dashboard'
  | 'ScreenTime'
  | 'AppRules'
  | 'Schedules'
  | 'ExtraTime'
  | 'Notifications'
  | 'Settings';

export interface NavigationState {
  currentScreen: Screen;
  params?: Record<string, unknown>;
}

export type NavigateFunction = (screen: Screen, params?: Record<string, unknown>) => void;

export function getInitialScreen(isAuthenticated: boolean, hasFamilyId: boolean): Screen {
  if (!isAuthenticated) return 'Login';
  if (!hasFamilyId) return 'FamilySetup';
  return 'Dashboard';
}
