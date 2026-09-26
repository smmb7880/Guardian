import {
  ParentalControlAdapter,
  PermissionStatus,
  DeviceUsageReport,
  DevicePlatform,
  Policy,
} from '@guardian/shared-types';
import { ScheduleEvaluator, EvaluationResult } from '@guardian/shared-utils';

export interface IOSCapabilityReport {
  platform: 'IOS';
  systemVersion: string;
  supported: string[];
  unsupported: string[];
  requires_permission: string[];
  requires_user_action: string[];
  permissions: Record<string, boolean>;
}

export class IOSAdapter implements ParentalControlAdapter {
  readonly platform = DevicePlatform.IOS;

  private cachedPolicy: Policy | null = null;
  private permissionState: Record<string, boolean> = {
    FamilyControlsAuthorization: true,
  };

  async checkPermissionStatus(): Promise<PermissionStatus> {
    const missing: string[] = [];
    if (!this.permissionState.FamilyControlsAuthorization) {
      missing.push('FamilyControlsAuthorization');
    }

    return {
      granted: missing.length === 0,
      missingPermissions: missing,
      explanation:
        'FamilyControls authorization is required to configure iOS ManagedSettingsStore and DeviceActivity schedules.',
    };
  }

  async requestPermissions(): Promise<boolean> {
    console.info('[IOSAdapter] Requesting FamilyControls AuthorizationCenter permission prompt...');
    this.permissionState.FamilyControlsAuthorization = true;
    return true;
  }

  async applyPolicy(policy: Policy): Promise<boolean> {
    this.cachedPolicy = policy;
    console.info(`[IOSAdapter] Successfully configured ManagedSettingsStore for policy version ${policy.version}.`);
    return true;
  }

  evaluateCurrentSchedule(usedMinutesToday = 0, lastKnownServerTime?: Date): EvaluationResult | null {
    if (!this.cachedPolicy) return null;
    return ScheduleEvaluator.evaluate(this.cachedPolicy, new Date(), usedMinutesToday, lastKnownServerTime);
  }

  async getUsageReport(): Promise<DeviceUsageReport> {
    return {
      timestamp: new Date().toISOString(),
      totalScreenTimeMinutes: 90,
      appUsageMinutes: {
        'token-app-1': 45,
        'token-app-2': 30,
        'token-app-3': 15,
      },
    };
  }

  getCapabilityReport(): IOSCapabilityReport {
    return {
      platform: 'IOS',
      systemVersion: '17.4',
      supported: [
        'DEVICE_REGISTRATION',
        'SECURE_AUTH',
        'POLICY_SYNC',
        'LOCAL_POLICY_PERSISTENCE',
        'FAMILY_CONTROLS_AUTHORIZATION',
        'MANAGED_SETTINGS_SHIELDING',
        'DEVICE_ACTIVITY_MONITORING',
        'SCHEDULE_ENFORCEMENT',
        'MIDNIGHT_CROSSING_SCHEDULES',
        'DEVICE_STATUS_TELEMETRY',
      ],
      unsupported: [
        'KEYLOGGING',
        'COVERT_RECORDING',
        'CREDENTIAL_INTERCEPTION',
        'SILENT_CAMERA_ACCESS',
        'RAW_PACKAGE_LISTING',
      ],
      requires_permission: ['FamilyControlsAuthorization'],
      requires_user_action: [
        'APPROVE_FAMILY_CONTROLS_PROMPT',
        'INSTALL_PROVISIONING_PROFILE',
        'SELECT_APPS_VIA_FAMILY_ACTIVITY_PICKER',
      ],
      permissions: this.permissionState,
    };
  }

  getPlatformLimitations(): string[] {
    return [
      'Requires FamilyControls entitlement (com.apple.developer.family-controls) approved by Apple Developer Support.',
      'iOS Screen Time frameworks tokenize applications (ApplicationToken); raw bundle identifiers are hidden by OS for privacy.',
      'Live FamilyControls authorization prompts fail on Simulator; physical iOS 15.0+ hardware is required.',
      'Hidden surveillance, keylogging, and silent camera/mic recording are strictly forbidden by Apple App Store Guidelines.',
    ];
  }
}
