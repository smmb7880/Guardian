export interface DailyUsageItem {
  date: string; // YYYY-MM-DD
  minutes: number;
}

export interface PolicyViolationItem {
  type: 'BEDTIME_VIOLATION' | 'SCHEDULE_VIOLATION' | 'DAILY_LIMIT_EXCEEDED' | 'BLOCKED_APP_ATTEMPT' | 'TAMPER_ATTEMPT';
  count: number;
  lastTimestamp: string;
}

export interface ScreenTimeReport {
  childId: string;
  period: 'daily' | 'weekly';
  totalMinutes: number;
  previousPeriodMinutes: number;
  trendPercentage: number; // e.g. +10.5, -15.0
  categoryBreakdown: Record<string, number>; // Category name -> usage minutes
  dailyUsage: DailyUsageItem[];
  policyViolations: PolicyViolationItem[];
  deviceStatus: {
    isOnline: boolean;
    lastSyncAt: string | null;
    batteryLevel?: number;
    platform: 'android' | 'ios';
  };
  generatedAt: string; // ISO string
}
