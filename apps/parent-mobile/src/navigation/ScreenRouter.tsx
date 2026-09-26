import React from 'react';
import { useNavigation } from './NavigationContext';
import { Screen } from './AppNavigator';
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { FamilySetupScreen } from '../screens/FamilySetupScreen';
import { ChildrenListScreen } from '../screens/ChildrenListScreen';
import { ChildProfileScreen } from '../screens/ChildProfileScreen';
import { DeviceListScreen } from '../screens/DeviceListScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ScreenTimeScreen } from '../screens/ScreenTimeScreen';
import { AppRulesScreen } from '../screens/AppRulesScreen';
import { SchedulesScreen } from '../screens/SchedulesScreen';
import { ExtraTimeScreen } from '../screens/ExtraTimeScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

export const ScreenRouter: React.FC = () => {
  const { state: navState } = useNavigation();
  const { currentScreen } = navState;

  switch (currentScreen as Screen) {
    case 'Splash':
      return <SplashScreen />;
    case 'Login':
      return <LoginScreen />;
    case 'Register':
      return <RegisterScreen />;
    case 'FamilySetup':
      return <FamilySetupScreen />;
    case 'ChildrenList':
      return <ChildrenListScreen />;
    case 'ChildProfile':
      return <ChildProfileScreen />;
    case 'DeviceList':
      return <DeviceListScreen />;
    case 'Dashboard':
      return <DashboardScreen />;
    case 'ScreenTime':
      return <ScreenTimeScreen />;
    case 'AppRules':
      return <AppRulesScreen />;
    case 'Schedules':
      return <SchedulesScreen />;
    case 'ExtraTime':
      return <ExtraTimeScreen />;
    case 'Notifications':
      return <NotificationsScreen />;
    case 'Settings':
      return <SettingsScreen />;
    default:
      return <DashboardScreen />;
  }
};
