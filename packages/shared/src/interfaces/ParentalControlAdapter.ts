import { Policy } from '../models/Policy';
import { DevicePlatform } from '../models/Device';

export interface PermissionStatus {
  granted: boolean;
  missingPermissions: string[];
  explanation: string;
}

export interface DeviceUsageReport {
  timestamp: string;
  totalScreenTimeMinutes: number;
  appUsageMinutes: Record<string, number>;
}

export interface ParentalControlAdapter {
  readonly platform: DevicePlatform;

  /**
   * Checks current system permission status required for enforcement.
   */
  checkPermissionStatus(): Promise<PermissionStatus>;

  /**
   * Prompts native system dialogs/settings screens to request required enforcement permissions.
   */
  requestPermissions(): Promise<boolean>;

  /**
   * Applies and enforces a versioned parental control policy on the local device.
   */
  applyPolicy(policy: Policy): Promise<boolean>;

  /**
   * Retrieves aggregated device screen-time usage from native platform APIs.
   */
  getUsageReport(): Promise<DeviceUsageReport>;

  /**
   * Returns explicit, documented platform limitations and capability boundaries.
   */
  getPlatformLimitations(): string[];
}
