import { DevicePlatform } from './Device';

export interface DeviceCapabilities {
  dailyLimit: boolean;
  bedtime: boolean;
  schedules: boolean;
  appBlocking: boolean;
  domainBlocking: boolean;
  usageStatistics: boolean;
  overlayBlocking: boolean;
  temporaryAllowance: boolean;
}

export function getDefaultCapabilities(platform: DevicePlatform): DeviceCapabilities {
  if (platform === DevicePlatform.IOS) {
    return {
      dailyLimit: true,
      bedtime: true,
      schedules: true,
      appBlocking: true,
      domainBlocking: true,
      usageStatistics: true,
      overlayBlocking: false, // iOS uses native ManagedSettingsStore shields instead of window overlays
      temporaryAllowance: true,
    };
  }

  // Default Android Capabilities
  return {
    dailyLimit: true,
    bedtime: true,
    schedules: true,
    appBlocking: true,
    domainBlocking: true,
    usageStatistics: true,
    overlayBlocking: true, // Android uses SYSTEM_ALERT_WINDOW floating overlays
    temporaryAllowance: true,
  };
}
