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
  checkPermissionStatus(): Promise<PermissionStatus>;
  requestPermissions(): Promise<boolean>;
  applyPolicy(policy: Policy): Promise<boolean>;
  getUsageReport(): Promise<DeviceUsageReport>;
  getPlatformLimitations(): string[];
}
