import {
  Policy,
  RestrictionAction,
  TemporaryAllowance,
} from '@guardian/shared-types';

export interface EvaluationContext {
  currentTimeUtc: string; // ISO String
  timezone: string;       // e.g. "UTC" or "America/New_York"
  appIdentifier?: string; // package name / bundle id
  domain?: string;        // web domain
  category?: string;      // app/web category
  usageMinutesToday?: number;
}

export interface EvaluationResult {
  action: RestrictionAction;
  reason: string;
  effectiveDailyLimitMinutes: number;
  activeAllowances: TemporaryAllowance[];
}

export class PolicyEvaluator {
  /**
   * Helper to determine if a HH:mm time string falls within a start/end window.
   * Handles midnight crossing (e.g. start "22:00", end "07:00").
   */
  public static isTimeInWindow(currentTimeStr: string, startTimeStr: string, endTimeStr: string): boolean {
    const timeToMinutes = (time: string): number => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const current = timeToMinutes(currentTimeStr);
    const start = timeToMinutes(startTimeStr);
    const end = timeToMinutes(endTimeStr);

    if (start <= end) {
      return current >= start && current <= end;
    } else {
      // Crosses midnight (e.g. 22:00 -> 07:00)
      return current >= start || current <= end;
    }
  }

  /**
   * Converts UTC date to HH:mm and day of week in specified timezone.
   */
  public static getLocalTimeAndDay(
    dateUtc: Date,
    _timezone: string,
  ): { timeString: string; dayOfWeek: number } {
    // Standard ISO time extraction
    const hours = dateUtc.getUTCHours().toString().padStart(2, '0');
    const minutes = dateUtc.getUTCMinutes().toString().padStart(2, '0');
    return {
      timeString: `${hours}:${minutes}`,
      dayOfWeek: dateUtc.getUTCDay(),
    };
  }

  /**
   * Prunes expired temporary allowances and returns active allowances.
   */
  public static getActiveAllowances(allowances: TemporaryAllowance[], nowUtc: Date): TemporaryAllowance[] {
    const nowIso = nowUtc.toISOString();
    return allowances.filter((a) => a.expiresAt > nowIso);
  }

  /**
   * Deterministically evaluates policy rules in priority sequence.
   */
  public static evaluate(policy: Policy, context: EvaluationContext): EvaluationResult {
    const nowUtc = context.currentTimeUtc ? new Date(context.currentTimeUtc) : new Date();
    const activeAllowances = this.getActiveAllowances(policy.temporaryAllowances || [], nowUtc);

    let bonusMinutes = 0;
    for (const allow of activeAllowances) {
      bonusMinutes += allow.durationMinutes;
    }

    const effectiveDailyLimit = policy.dailyLimitMinutes + bonusMinutes;
    const { timeString, dayOfWeek } = this.getLocalTimeAndDay(nowUtc, context.timezone || policy.timezone);

    // -------------------------------------------------------------
    // PRIORITY 1: Explicit App / Website BLOCK Rules
    // -------------------------------------------------------------
    if (context.appIdentifier) {
      const appRule = policy.appRules?.find((r) => r.appIdentifier.toLowerCase() === context.appIdentifier!.toLowerCase());
      if (appRule && appRule.action === RestrictionAction.BLOCK) {
        return {
          action: RestrictionAction.BLOCK,
          reason: `App '${appRule.appName}' is explicitly blocked by parental rule.`,
          effectiveDailyLimitMinutes: effectiveDailyLimit,
          activeAllowances,
        };
      }
    }

    if (context.domain) {
      const webRule = policy.websiteRules?.find((r) => r.domain.toLowerCase() === context.domain!.toLowerCase());
      if (webRule && webRule.action === RestrictionAction.BLOCK) {
        return {
          action: RestrictionAction.BLOCK,
          reason: `Website '${webRule.domain}' is explicitly blocked by parental rule.`,
          effectiveDailyLimitMinutes: effectiveDailyLimit,
          activeAllowances,
        };
      }
    }

    // -------------------------------------------------------------
    // PRIORITY 2: Category Restriction Rules
    // -------------------------------------------------------------
    if (context.category) {
      const catRule = policy.categoryRules?.find((r) => r.category.toLowerCase() === context.category!.toLowerCase());
      if (catRule && catRule.action === RestrictionAction.BLOCK) {
        return {
          action: RestrictionAction.BLOCK,
          reason: `Category '${catRule.category}' is explicitly blocked by parental rule.`,
          effectiveDailyLimitMinutes: effectiveDailyLimit,
          activeAllowances,
        };
      }
    }

    // -------------------------------------------------------------
    // PRIORITY 3: Bedtime & Schedule Restriction Windows
    // -------------------------------------------------------------
    if (policy.bedtime && policy.bedtime.enabled && policy.bedtime.daysOfWeek.includes(dayOfWeek)) {
      if (this.isTimeInWindow(timeString, policy.bedtime.startTime, policy.bedtime.endTime)) {
        return {
          action: RestrictionAction.BLOCK,
          reason: `Bedtime window (${policy.bedtime.startTime} - ${policy.bedtime.endTime}) is currently active.`,
          effectiveDailyLimitMinutes: effectiveDailyLimit,
          activeAllowances,
        };
      }
    }

    if (policy.schedules) {
      for (const sched of policy.schedules) {
        if (sched.daysOfWeek.includes(dayOfWeek) && this.isTimeInWindow(timeString, sched.startTime, sched.endTime)) {
          if (sched.action === RestrictionAction.BLOCK) {
            return {
              action: RestrictionAction.BLOCK,
              reason: `Schedule '${sched.name}' (${sched.startTime} - ${sched.endTime}) is currently active.`,
              effectiveDailyLimitMinutes: effectiveDailyLimit,
              activeAllowances,
            };
          }
        }
      }
    }

    // -------------------------------------------------------------
    // PRIORITY 4: Daily Screen-Time Limit Reached
    // -------------------------------------------------------------
    const currentUsage = context.usageMinutesToday || 0;
    if (currentUsage >= effectiveDailyLimit) {
      return {
        action: RestrictionAction.BLOCK,
        reason: `Daily screen-time limit of ${effectiveDailyLimit} minutes has been reached.`,
        effectiveDailyLimitMinutes: effectiveDailyLimit,
        activeAllowances,
      };
    }

    // -------------------------------------------------------------
    // PRIORITY 5: Default ALLOW
    // -------------------------------------------------------------
    return {
      action: RestrictionAction.ALLOW,
      reason: 'No restrictions active.',
      effectiveDailyLimitMinutes: effectiveDailyLimit,
      activeAllowances,
    };
  }
}
