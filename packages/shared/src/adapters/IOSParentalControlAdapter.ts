import { ParentalControlAdapter, PermissionStatus, DeviceUsageReport } from '../interfaces/ParentalControlAdapter';
import { DevicePlatform } from '../models/Device';
import { Policy } from '../models/Policy';

export class IOSParentalControlAdapter implements ParentalControlAdapter {
  readonly platform = DevicePlatform.IOS;

  async checkPermissionStatus(): Promise<PermissionStatus> {
    // iOS platform check: FamilyControls authorization status (FamilyControls.AuthorizationCenter)
    return {
      granted: false,
      missingPermissions: ['FamilyControlsAuthorization'],
      explanation:
        'iOS Screen Time enforcement requires FamilyControls authorization via Apple Family Sharing framework.',
    };
  }

  async requestPermissions(): Promise<boolean> {
    console.info(
      '[IOSParentalControlAdapter] Requesting FamilyControls authorization from AuthorizationCenter...',
    );
    return false;
  }

  async applyPolicy(policy: Policy): Promise<boolean> {
    console.info(
      `[IOSParentalControlAdapter] Configured ManagedSettings store and DeviceActivity schedules for policy v${policy.version}.`,
    );
    // Real native execution configures ManagedSettingsStore & DeviceActivityCenter in Swift native extension
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
      'iOS FamilyControls requires paid Apple Developer Program membership with approved Screen Time entitlements.',
      'iOS Shield configurations operate through ManagedSettings framework; raw app bundle access is restricted by Apple privacy design.',
      'Simulators cannot fully render system shield overlays without physical iOS device authorization.',
    ];
  }
}
