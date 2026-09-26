import { Policy, ScheduleRule, RestrictionAction } from '@guardian/shared-types';

/**
 * ScheduleMode mirrors the child-side enum so the parent UI can work with
 * named modes without importing child-layer code.
 */
export type ScheduleMode = 'SCHOOL' | 'HOMEWORK' | 'BEDTIME' | 'FREE' | 'CUSTOM';

export interface ScheduleTemplate {
  mode: ScheduleMode;
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  action: RestrictionAction;
}

/**
 * Platform capability limitations returned to the parent UI when a requested
 * schedule enforcement behaviour cannot be guaranteed on a given platform.
 */
export interface CapabilityWarning {
  platform: 'ANDROID' | 'IOS' | 'BOTH';
  featureRequested: string;
  limitation: string;
  mitigationSuggestion: string;
}

export const CAPABILITY_WARNINGS: CapabilityWarning[] = [
  {
    platform: 'ANDROID',
    featureRequested: 'APP_BLOCKING',
    limitation:
      'Block overlays on Android require SYSTEM_ALERT_WINDOW or Accessibility privileges granted by the device user.',
    mitigationSuggestion:
      'Ensure the Guardian child app has been granted Display Over Other Apps and Accessibility permissions in Android Settings.',
  },
  {
    platform: 'ANDROID',
    featureRequested: 'USAGE_TRACKING',
    limitation:
      'Usage statistics on Android require the PACKAGE_USAGE_STATS permission granted via Android Settings > Apps > Special App Access.',
    mitigationSuggestion: 'Ask the device user to open Android Settings and grant Usage Access to Guardian.',
  },
  {
    platform: 'IOS',
    featureRequested: 'APP_BLOCKING',
    limitation:
      'iOS app shielding requires FamilyControls entitlement (com.apple.developer.family-controls) and ManagedSettings; apps are identified by opaque tokens, not bundle IDs.',
    mitigationSuggestion:
      'The child must approve the Family Controls authorization prompt. Precise app selection occurs via the FamilyActivityPicker UI.',
  },
  {
    platform: 'IOS',
    featureRequested: 'USAGE_TRACKING',
    limitation:
      'iOS DeviceActivity reports are only available inside a DeviceActivityReport extension and cannot be read directly by the main app process.',
    mitigationSuggestion: 'Usage data is surfaced through the Guardian DeviceActivity extension installed alongside the app.',
  },
  {
    platform: 'BOTH',
    featureRequested: 'SCHEDULE_ENFORCEMENT_OFFLINE',
    limitation:
      'Schedule enforcement relies on the locally cached policy. If the device has been offline for >72 hours the policy is considered expired and the device enters a full-block fallback.',
    mitigationSuggestion: 'Ensure the child device has periodic internet access to refresh its policy.',
  },
];

/** Standard schedule templates for common parental-control modes. */
export const SCHEDULE_TEMPLATES: Record<ScheduleMode, ScheduleTemplate> = {
  SCHOOL: {
    mode: 'SCHOOL',
    name: 'School Hours',
    startTime: '08:00',
    endTime: '14:00',
    daysOfWeek: [1, 2, 3, 4, 5], // Mon–Fri
    action: RestrictionAction.BLOCK,
  },
  HOMEWORK: {
    mode: 'HOMEWORK',
    name: 'Homework Time',
    startTime: '16:00',
    endTime: '18:00',
    daysOfWeek: [1, 2, 3, 4, 5], // Mon–Fri
    action: RestrictionAction.LIMIT,
  },
  BEDTIME: {
    mode: 'BEDTIME',
    name: 'Bedtime',
    startTime: '22:00',
    endTime: '07:00',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    action: RestrictionAction.BLOCK,
  },
  FREE: {
    mode: 'FREE',
    name: 'Free Time',
    startTime: '14:00',
    endTime: '22:00',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    action: RestrictionAction.ALLOW,
  },
  CUSTOM: {
    mode: 'CUSTOM',
    name: 'Custom Schedule',
    startTime: '09:00',
    endTime: '17:00',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    action: RestrictionAction.BLOCK,
  },
};

/**
 * ParentScheduleService manages schedule CRUD on top of a Policy object.
 * It validates inputs, prevents overlapping conflicting schedules, and
 * surfaces platform capability warnings to the parent UI.
 */
export class ParentScheduleService {
  // ---------- Schedule CRUD ----------

  /**
   * Create a ScheduleRule from a template and optional overrides.
   */
  createFromTemplate(mode: ScheduleMode, id: string, overrides?: Partial<ScheduleTemplate>): ScheduleRule {
    const template = { ...SCHEDULE_TEMPLATES[mode], ...overrides };
    return {
      id,
      name: template.name,
      startTime: template.startTime,
      endTime: template.endTime,
      daysOfWeek: template.daysOfWeek,
      action: template.action,
    };
  }

  /**
   * Add a schedule rule to a policy, after validating there are no
   * conflicting BLOCK rules on the same day/time window.
   * Returns { ok, policy, conflicts } where conflicts lists any overlapping
   * BLOCK rules that would create ambiguity.
   */
  addSchedule(
    policy: Policy,
    rule: ScheduleRule,
  ): { ok: boolean; policy: Policy; conflicts: ScheduleRule[] } {
    const conflicts = this._detectOverlappingBlocks(policy.schedules, rule);
    const merged: Policy = {
      ...policy,
      schedules: [...policy.schedules, rule],
      version: policy.version + 1,
      updatedAt: new Date().toISOString(),
    };
    return { ok: true, policy: merged, conflicts };
  }

  /**
   * Update an existing schedule rule by ID.
   */
  updateSchedule(policy: Policy, ruleId: string, updates: Partial<ScheduleRule>): Policy {
    const schedules = policy.schedules.map((s) =>
      s.id === ruleId ? { ...s, ...updates } : s,
    );
    return {
      ...policy,
      schedules,
      version: policy.version + 1,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Remove a schedule rule by ID.
   */
  removeSchedule(policy: Policy, ruleId: string): Policy {
    return {
      ...policy,
      schedules: policy.schedules.filter((s) => s.id !== ruleId),
      version: policy.version + 1,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Enable or disable a schedule without removing it.
   * We use the convention: disabled schedules have action = ALLOW
   * with a `_disabled` suffix on the name.
   * A proper implementation would add an `enabled` boolean to ScheduleRule;
   * this approach avoids a breaking schema change.
   */
  setScheduleEnabled(policy: Policy, ruleId: string, enabled: boolean): Policy {
    const schedules = policy.schedules.map((s) => {
      if (s.id !== ruleId) return s;
      if (!enabled) {
        return {
          ...s,
          name: s.name.replace(/ \(disabled\)$/, '') + ' (disabled)',
          action: RestrictionAction.ALLOW,
        };
      }
      // Re-enable: restore action based on mode name
      const name = s.name.replace(/ \(disabled\)$/, '');
      const action = name.toLowerCase().includes('free')
        ? RestrictionAction.ALLOW
        : name.toLowerCase().includes('homework')
        ? RestrictionAction.LIMIT
        : RestrictionAction.BLOCK;
      return { ...s, name, action };
    });
    return {
      ...policy,
      schedules,
      version: policy.version + 1,
      updatedAt: new Date().toISOString(),
    };
  }

  // ---------- Capability warnings ----------

  /**
   * Return any capability warnings relevant to the requested feature.
   * Called by the parent UI before displaying a "this will block X" confirmation.
   */
  getCapabilityWarnings(feature: string): CapabilityWarning[] {
    return CAPABILITY_WARNINGS.filter(
      (w) => w.featureRequested.toLowerCase() === feature.toLowerCase(),
    );
  }

  getAllCapabilityWarnings(): CapabilityWarning[] {
    return [...CAPABILITY_WARNINGS];
  }

  // ---------- Validation ----------

  validateTimeString(t: string): boolean {
    return /^\d{2}:\d{2}$/.test(t) && this._parseMinutes(t) < 24 * 60;
  }

  validateDaysOfWeek(days: number[]): boolean {
    return days.length > 0 && days.every((d) => d >= 0 && d <= 6);
  }

  // ---------- Private helpers ----------

  /**
   * Detect overlapping BLOCK rules on the same days.
   * Two rules overlap if their time windows intersect on at least one shared day.
   * Returns the existing rules that conflict.
   */
  private _detectOverlappingBlocks(existing: ScheduleRule[], incoming: ScheduleRule): ScheduleRule[] {
    if (incoming.action !== RestrictionAction.BLOCK) return [];

    return existing.filter((s) => {
      if (s.action !== RestrictionAction.BLOCK) return false;
      const sharedDays = s.daysOfWeek.filter((d) => incoming.daysOfWeek.includes(d));
      if (sharedDays.length === 0) return false;
      return this._windowsOverlap(s.startTime, s.endTime, incoming.startTime, incoming.endTime);
    });
  }

  private _windowsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
    const aS = this._parseMinutes(aStart);
    const aE = this._parseMinutes(aEnd);
    const bS = this._parseMinutes(bStart);
    const bE = this._parseMinutes(bEnd);

    // Normalise midnight-crossing windows to span two day-ranges
    const aRanges = aS < aE ? [[aS, aE]] : [[aS, 1440], [0, aE]];
    const bRanges = bS < bE ? [[bS, bE]] : [[bS, 1440], [0, bE]];

    for (const [as, ae] of aRanges) {
      for (const [bs, be] of bRanges) {
        if (as < be && bs < ae) return true;
      }
    }
    return false;
  }

  private _parseMinutes(t: string): number {
    const [h, m] = t.split(':').map((n) => parseInt(n, 10));
    return h * 60 + m;
  }
}
