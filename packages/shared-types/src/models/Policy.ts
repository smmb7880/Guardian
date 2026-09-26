export enum RestrictionAction {
  ALLOW = 'ALLOW',
  BLOCK = 'BLOCK',
  LIMIT = 'LIMIT',
}

export interface BedtimeSchedule {
  enabled: boolean;
  startTime: string; // HH:mm 24-hour format
  endTime: string;   // HH:mm 24-hour format
  daysOfWeek: number[]; // 0 = Sunday, 6 = Saturday
}

export interface ScheduleRule {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  action: RestrictionAction;
}

export interface AppRule {
  appIdentifier: string; // package name (Android) or bundle ID (iOS)
  appName: string;
  action: RestrictionAction;
  dailyLimitMinutes?: number;
}

export interface WebsiteRule {
  domain: string;
  action: RestrictionAction;
}

export interface CategoryRule {
  category: string;
  action: RestrictionAction;
  dailyLimitMinutes?: number;
}

export interface TemporaryAllowance {
  id: string;
  durationMinutes: number;
  grantedAt: string;
  expiresAt: string;
  reason?: string;
}

export interface Policy {
  id: string;
  childId: string;
  deviceId?: string;
  version: number;
  timezone: string;
  dailyLimitMinutes: number;
  bedtime: BedtimeSchedule;
  schedules: ScheduleRule[];
  appRules: AppRule[];
  websiteRules: WebsiteRule[];
  categoryRules: CategoryRule[];
  temporaryAllowances: TemporaryAllowance[];
  updatedAt: string;
}
