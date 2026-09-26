import { Policy, RestrictionAction, TemporaryAllowance } from '@guardian/shared-types';

export interface EvaluationResult {
  isBlocked: boolean;
  activePeriodName: string | null;
  action: RestrictionAction;
  reason: string;
  remainingMinutes: number | null;
  clockTamperingDetected: boolean;
  activeAllowance: TemporaryAllowance | null;
}

export function isTimeInWindow(currentTimeStr: string, startTimeStr: string, endTimeStr: string): boolean {
  const [currH, currM] = currentTimeStr.split(':').map((n) => parseInt(n, 10));
  const [startH, startM] = startTimeStr.split(':').map((n) => parseInt(n, 10));
  const [endH, endM] = endTimeStr.split(':').map((n) => parseInt(n, 10));

  const currTotal = currH * 60 + currM;
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;

  if (startTotal === endTotal) return true;

  if (startTotal < endTotal) {
    // Standard same-day window (e.g. 08:00 - 14:00)
    return currTotal >= startTotal && currTotal < endTotal;
  } else {
    // Midnight crossing window (e.g. 22:00 - 07:00)
    return currTotal >= startTotal || currTotal < endTotal;
  }
}

export class ScheduleEvaluator {
  public static evaluate(
    policy: Policy,
    currentTime: Date = new Date(),
    usedMinutesToday: number = 0,
    lastKnownServerTime?: Date,
  ): EvaluationResult {
    // 1. Clock Tampering Protection Check
    let clockTamperingDetected = false;
    if (lastKnownServerTime && currentTime.getTime() < lastKnownServerTime.getTime() - 60000) {
      clockTamperingDetected = true;
      return {
        isBlocked: true,
        activePeriodName: 'Tamper Protection',
        action: RestrictionAction.BLOCK,
        reason: 'System clock tampering detected. Restricted until time synchronizes.',
        remainingMinutes: 0,
        clockTamperingDetected: true,
        activeAllowance: null,
      };
    }

    // 2. Active Temporary Allowance Check
    const activeAllowances = (policy.temporaryAllowances || []).filter(
      (a) => new Date(a.expiresAt).getTime() > currentTime.getTime(),
    );
    const activeAllowance = activeAllowances.length > 0 ? activeAllowances[0] : null;

    if (activeAllowance) {
      const remainingMs = new Date(activeAllowance.expiresAt).getTime() - currentTime.getTime();
      const remainingMins = Math.max(0, Math.ceil(remainingMs / 60000));
      return {
        isBlocked: false,
        activePeriodName: 'Temporary Allowance',
        action: RestrictionAction.ALLOW,
        reason: `Temporary extra-time allowance active (${activeAllowance.durationMinutes}m granted)`,
        remainingMinutes: remainingMins,
        clockTamperingDetected: false,
        activeAllowance,
      };
    }

    // Current day & time format
    const dayOfWeek = currentTime.getDay(); // 0 = Sunday, 6 = Saturday
    const hours = currentTime.getHours().toString().padStart(2, '0');
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    // 3. Bedtime Rule Check
    if (policy.bedtime && policy.bedtime.enabled) {
      const days = policy.bedtime.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6];
      if (days.includes(dayOfWeek) && isTimeInWindow(timeStr, policy.bedtime.startTime, policy.bedtime.endTime)) {
        return {
          isBlocked: true,
          activePeriodName: 'Bedtime',
          action: RestrictionAction.BLOCK,
          reason: `Bedtime schedule active (${policy.bedtime.startTime} - ${policy.bedtime.endTime})`,
          remainingMinutes: 0,
          clockTamperingDetected: false,
          activeAllowance: null,
        };
      }
    }

    // 4. Explicit Schedule Rules Check (School, Homework, Custom)
    if (policy.schedules && policy.schedules.length > 0) {
      const matchingSchedules = policy.schedules.filter((sched) => {
        const days = sched.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6];
        return days.includes(dayOfWeek) && isTimeInWindow(timeStr, sched.startTime, sched.endTime);
      });

      if (matchingSchedules.length > 0) {
        // Deterministic sort: BLOCK > LIMIT > ALLOW
        matchingSchedules.sort((a, b) => {
          const rank = { BLOCK: 3, LIMIT: 2, ALLOW: 1 };
          return (rank[b.action] || 1) - (rank[a.action] || 1);
        });

        const topRule = matchingSchedules[0];
        const isBlocked = topRule.action === RestrictionAction.BLOCK;
        return {
          isBlocked,
          activePeriodName: topRule.name,
          action: topRule.action,
          reason: `Schedule '${topRule.name}' active (${topRule.startTime} - ${topRule.endTime})`,
          remainingMinutes: isBlocked ? 0 : null,
          clockTamperingDetected: false,
          activeAllowance: null,
        };
      }
    }

    // 5. Daily Screen-Time Limit Check
    if (policy.dailyLimitMinutes && policy.dailyLimitMinutes > 0) {
      if (usedMinutesToday >= policy.dailyLimitMinutes) {
        return {
          isBlocked: true,
          activePeriodName: 'Daily Limit Reached',
          action: RestrictionAction.BLOCK,
          reason: `Daily screen-time limit of ${policy.dailyLimitMinutes} minutes has been used`,
          remainingMinutes: 0,
          clockTamperingDetected: false,
          activeAllowance: null,
        };
      }
    }

    // 6. Default Free Time Behavior
    const remainingLimit = policy.dailyLimitMinutes ? Math.max(0, policy.dailyLimitMinutes - usedMinutesToday) : null;
    return {
      isBlocked: false,
      activePeriodName: 'Free Time',
      action: RestrictionAction.ALLOW,
      reason: 'No active schedule restrictions; within daily limit',
      remainingMinutes: remainingLimit,
      clockTamperingDetected: false,
      activeAllowance: null,
    };
  }
}
