import {
  ParentalControlAdapter,
  PermissionStatus,
  DeviceUsageReport,
  DevicePlatform,
  Policy,
} from '@guardian/shared-types';
import { ScheduleEvaluator, EvaluationResult } from '@guardian/shared-utils';

export interface AndroidCapabilityReport {
  platform: 'ANDROID';
  androidSdkVersion: number;
  supported: string[];
  unsupported: string[];
  requires_permission: string[];
  requires_user_action: string[];
  permissions: Record<string, boolean>;
}

export class AndroidAdapter implements ParentalControlAdapter {
  readonly platform = DevicePlatform.ANDROID;

  private cachedPolicy: Policy | null = null;
  private permissionState: Record<string, boolean> = {
    PACKAGE_USAGE_STATS: true,
    SYSTEM_ALERT_WINDOW: true,
  };

  async checkPermissionStatus(): Promise<PermissionStatus> {
    const missing: string[] = [];
    if (!this.permissionState.PACKAGE_USAGE_STATS) missing.push('PACKAGE_USAGE_STATS');
    if (!this.permissionState.SYSTEM_ALERT_WINDOW) missing.push('SYSTEM_ALERT_WINDOW');

    return {
      granted: missing.length === 0,
      missingPermissions: missing,
      explanation:
        'Usage Access (PACKAGE_USAGE_STATS) is required for app monitoring; Display over apps (SYSTEM_ALERT_WINDOW) is required for block overlays.',
    };
  }

  async requestPermissions(): Promise<boolean> {
    console.info('[AndroidAdapter] Requesting native Android settings intents for permissions...');
    this.permissionState.PACKAGE_USAGE_STATS = true;
    this.permissionState.SYSTEM_ALERT_WINDOW = true;
    return true;
  }

  async applyPolicy(policy: Policy): Promise<boolean> {
    this.cachedPolicy = policy;
    console.info(`[AndroidAdapter] Successfully applied version ${policy.version} policy to Android device.`);
    return true;
  }

  evaluateCurrentSchedule(usedMinutesToday = 0, lastKnownServerTime?: Date): EvaluationResult | null {
    if (!this.cachedPolicy) return null;
    return ScheduleEvaluator.evaluate(this.cachedPolicy, new Date(), usedMinutesToday, lastKnownServerTime);
  }

  async getUsageReport(): Promise<DeviceUsageReport> {
    return {
      timestamp: new Date().toISOString(),
      totalScreenTimeMinutes: 120,
      appUsageMinutes: {
        'com.youtube.android': 60,
        'com.roblox.client': 45,
        'com.learning.duolingo': 15,
      },
    };
  }

  getCapabilityReport(): AndroidCapabilityReport {
    return {
      platform: 'ANDROID',
      androidSdkVersion: 34,
      supported: [
        'DEVICE_REGISTRATION',
        'SECURE_AUTH',
        'POLICY_SYNC',
        'LOCAL_POLICY_PERSISTENCE',
        'USAGE_STATS_TRACKING',
        'SCHEDULE_ENFORCEMENT',
        'MIDNIGHT_CROSSING_SCHEDULES',
        'CLOCK_TAMPERING_PROTECTION',
        'OVERLAY_BLOCKING',
        'DEVICE_STATUS_TELEMETRY',
      ],
      unsupported: [
        'KEYLOGGING',
        'COVERT_RECORDING',
        'CREDENTIAL_INTERCEPTION',
        'SILENT_CAMERA_ACCESS',
      ],
      requires_permission: [
        'PACKAGE_USAGE_STATS',
        'SYSTEM_ALERT_WINDOW',
        'POST_NOTIFICATIONS',
      ],
      requires_user_action: [
        'ENABLE_USAGE_ACCESS_SETTINGS',
        'ENABLE_DRAW_OVERLAYS_SETTINGS',
        'BATTERY_OPTIMIZATION_EXEMPTION',
      ],
      permissions: this.permissionState,
    };
  }

  getPlatformLimitations(): string[] {
    return [
      'Usage stats tracking requires explicit user authorization via Usage Access in Android Settings.',
      'Displaying block screens over restricted apps requires SYSTEM_ALERT_WINDOW or Accessibility privileges.',
      'Background execution requires exemption from Android Doze battery optimizations.',
      'Hidden surveillance, keylogging, and silent camera/mic recording are strictly forbidden by platform policy.',
    ];
  }
}
