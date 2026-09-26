import { DevicePlatform } from '@guardian/shared-types';

export enum EnforcementFeature {
  DAILY_SCREEN_TIME_LIMIT = 'DAILY_SCREEN_TIME_LIMIT',
  BEDTIME_SHIELD = 'BEDTIME_SHIELD',
  SCHEDULED_SHIELDS = 'SCHEDULED_SHIELDS',
  EXPLICIT_APP_BLOCKING = 'EXPLICIT_APP_BLOCKING',
  APP_USAGE_LIMITS = 'APP_USAGE_LIMITS',
  WEBSITE_FILTERING = 'WEBSITE_FILTERING',
  CATEGORY_RESTRICTIONS = 'CATEGORY_RESTRICTIONS',
  TEMPORARY_ALLOWANCE_OVERRIDE = 'TEMPORARY_ALLOWANCE_OVERRIDE',
}

export interface PlatformCapability {
  platform: DevicePlatform;
  supportedFeatures: EnforcementFeature[];
  notes: string[];
}

export const PLATFORM_CAPABILITIES: Record<DevicePlatform, PlatformCapability> = {
  [DevicePlatform.ANDROID]: {
    platform: DevicePlatform.ANDROID,
    supportedFeatures: [
      EnforcementFeature.DAILY_SCREEN_TIME_LIMIT,
      EnforcementFeature.BEDTIME_SHIELD,
      EnforcementFeature.SCHEDULED_SHIELDS,
      EnforcementFeature.EXPLICIT_APP_BLOCKING,
      EnforcementFeature.APP_USAGE_LIMITS,
      EnforcementFeature.WEBSITE_FILTERING,
      EnforcementFeature.CATEGORY_RESTRICTIONS,
      EnforcementFeature.TEMPORARY_ALLOWANCE_OVERRIDE,
    ],
    notes: [
      'Requires PACKAGE_USAGE_STATS permission for usage monitoring.',
      'Overlay shield rendering requires SYSTEM_ALERT_WINDOW permission.',
    ],
  },
  [DevicePlatform.IOS]: {
    platform: DevicePlatform.IOS,
    supportedFeatures: [
      EnforcementFeature.DAILY_SCREEN_TIME_LIMIT,
      EnforcementFeature.BEDTIME_SHIELD,
      EnforcementFeature.SCHEDULED_SHIELDS,
      EnforcementFeature.EXPLICIT_APP_BLOCKING,
      EnforcementFeature.WEBSITE_FILTERING,
      EnforcementFeature.CATEGORY_RESTRICTIONS,
      EnforcementFeature.TEMPORARY_ALLOWANCE_OVERRIDE,
    ],
    notes: [
      'Requires Apple FamilyControls authorization and ManagedSettings framework.',
      'App usage shields operate via system ManagedSettingsStore.',
    ],
  },
};

export function isFeatureSupportedOnPlatform(
  platform: DevicePlatform,
  feature: EnforcementFeature,
): boolean {
  return PLATFORM_CAPABILITIES[platform].supportedFeatures.includes(feature);
}
