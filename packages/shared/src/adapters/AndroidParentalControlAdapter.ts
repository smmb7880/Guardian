import { ParentalControlAdapter, PermissionStatus, DeviceUsageReport } from '../interfaces/ParentalControlAdapter';
import { DevicePlatform } from '../models/Device';
import { Policy } from '../models/Policy';

export class AndroidParentalControlAdapter implements ParentalControlAdapter {
  readonly platform = DevicePlatform.ANDROID;

  async checkPermissionStatus(): Promise<PermissionStatus> {
    // Android platform check: requires PACKAGE_USAGE_STATS and overlay or accessibility permissions
    return {
      granted: false,
      missingPermissions: ['PACKAGE_USAGE_STATS', 'SYSTEM_ALERT_WINDOW'],
      explanation:
        'Android requires Usage Access permission to track app usage and Overlay/Accessibility permissions for app restriction shields.',
    };
  }

  async requestPermissions(): Promise<boolean> {
    console.info('[AndroidParentalControlAdapter] Requesting system permissions via Settings intent...');
    return false;
  }

  async applyPolicy(policy: Policy): Promise<boolean> {
    console.info(
      `[AndroidParentalControlAdapter] Applying version ${policy.version} policy to Android device.`,
    );
    // Real native execution calls native Kotlin bridge via React Native NativeModules/TurboModules
    return true;
  }

  async getUsageReport(): Promise<DeviceUsageReport> {
    return {
      timestamp: new Date().toISOString(),
      totalScreenTimeMinutes: 0,
      appUsageMinutes: {},
    };
  }

  getPlatformLimitations(): string[] {
    return [
      'App usage stats require user to manually grant Usage Access in Android Settings.',
      'Blocking non-system apps requires Overlay/Accessibility permissions or Enterprise Device Admin privileges.',
      'OEM specific battery optimization settings (e.g. Samsung, Xiaomi) may delay background sync unless battery optimization is disabled.',
    ];
  }
}
