import { Policy, RestrictionAction } from '@guardian/shared-types';
import { ScheduleEvaluator, EvaluationResult } from '@guardian/shared-utils';
import { ParentalControlAdapter } from '@guardian/shared-types';
import { PolicySyncService } from './PolicySyncService';

/**
 * ScheduleMode mirrors the schedule-type enum used in the parent UI
 * (SchedulesScreen.ts: ScheduleMode). Repeated here to keep the engine
 * self-contained without importing parent-layer code.
 */
export type ScheduleMode = 'SCHOOL' | 'HOMEWORK' | 'BEDTIME' | 'FREE' | 'CUSTOM' | 'DAILY_LIMIT';

export interface EnforcementResult {
  /** Whether device/apps should be blocked right now. */
  shouldBlock: boolean;
  /** Human-readable reason shown on the block screen. */
  reason: string;
  /** Active mode, if any. */
  activeMode: ScheduleMode | null;
  /** Raw evaluation detail from the schedule evaluator. */
  evaluationDetail: EvaluationResult;
  /** Whether the device is operating on an offline/expired cache. */
  isOfflineFallback: boolean;
  /** Whether the platform can actually enforce this result. */
  platformCanEnforce: boolean;
  /** Capability limitations string[] when enforcement is partial. */
  platformLimitations: string[];
  /** Minutes of screen-time remaining today, or null if unlimited. */
  remainingMinutesToday: number | null;
}

/**
 * ScreenTimeEngine integrates:
 * - ScheduleEvaluator (deterministic schedule logic)
 * - PolicySyncService (local persistence + offline mode + TTL)
 * - ParentalControlAdapter (platform enforcement layer)
 *
 * It is the single source-of-truth for "should this device be restricted right now?"
 */
export class ScreenTimeEngine {
  private syncService: PolicySyncService;
  private adapter: ParentalControlAdapter;
  /** UTC timestamp of the last known-good server time for tamper detection. */
  private lastKnownServerTime: Date | undefined;

  constructor(adapter: ParentalControlAdapter, syncService: PolicySyncService) {
    this.adapter = adapter;
    this.syncService = syncService;
  }

  // ---------- Server time sync ----------

  /**
   * Called whenever the device successfully contacts the server.
   * Stores the server time for clock-tamper detection.
   */
  updateServerTime(serverTime: Date): void {
    this.lastKnownServerTime = serverTime;
  }

  // ---------- Policy application ----------

  async applyPolicy(policy: Policy): Promise<boolean> {
    this.syncService.savePolicyToCache(policy);
    const applied = await this.adapter.applyPolicy(policy);
    if (applied) {
      console.info(`[ScreenTimeEngine] Policy version ${policy.version} applied successfully.`);
    } else {
      console.warn(`[ScreenTimeEngine] Platform adapter could not fully apply policy version ${policy.version}.`);
    }
    return applied;
  }

  // ---------- Core evaluation ----------

  /**
   * Evaluate the current enforcement state.
   *
   * Evaluation priority (highest → lowest):
   * 1. Offline expired cache → BLOCK (safety fallback)
   * 2. Clock tampering detected → BLOCK
   * 3. Active temporary allowance → ALLOW (overrides all schedules)
   * 4. Bedtime schedule → BLOCK
   * 5. Explicit named schedules (School > Homework > Custom; BLOCK > LIMIT > ALLOW)
   * 6. Daily screen-time limit reached → BLOCK
   * 7. Free time (within limit) → ALLOW
   */
  evaluate(usedMinutesToday = 0, now: Date = new Date()): EnforcementResult {
    const syncStatus = this.syncService.getSyncStatus(now);
    const policy = this.syncService.getCachedPolicy();
    const limitations = this.adapter.getPlatformLimitations();

    // --- Offline expired cache fallback ---
    if (syncStatus.isPolicyExpired) {
      return this._blockedResult(
        'DAILY_LIMIT',
        'Device has been offline for an extended period. Restricting device until policy is refreshed.',
        true,
        limitations,
      );
    }

    // --- No policy available ---
    if (!policy) {
      return this._allowResult(null, 'No policy loaded yet. Device is unrestricted.', syncStatus.isPolicyExpired, limitations, null);
    }

    // Prune expired allowances before evaluating
    this.syncService.pruneExpiredAllowances(now);
    // Re-fetch pruned policy
    const freshPolicy = this.syncService.getCachedPolicy()!;

    const evalResult = ScheduleEvaluator.evaluate(freshPolicy, now, usedMinutesToday, this.lastKnownServerTime);

    const activeMode = this._modeFromResult(evalResult, freshPolicy);
    const platformCanEnforce = limitations.length === 0;

    if (evalResult.isBlocked) {
      return {
        shouldBlock: true,
        reason: evalResult.reason,
        activeMode,
        evaluationDetail: evalResult,
        isOfflineFallback: !syncStatus.isOnline,
        platformCanEnforce,
        platformLimitations: limitations,
        remainingMinutesToday: null,
      };
    }

    return {
      shouldBlock: false,
      reason: evalResult.reason,
      activeMode,
      evaluationDetail: evalResult,
      isOfflineFallback: !syncStatus.isOnline,
      platformCanEnforce,
      platformLimitations: limitations,
      remainingMinutesToday: evalResult.remainingMinutes,
    };
  }

  // ---------- Timezone-aware evaluation ----------

  /**
   * Evaluate enforcement using the policy's declared timezone.
   * Converts the current wall-clock time to the policy timezone before
   * passing it to ScheduleEvaluator, so parent-configured schedules
   * apply in the child's local time regardless of where the device is.
   *
   * Uses Intl.DateTimeFormat which is available in V8/JavaScriptCore
   * (Node ≥ 13, iOS/Android JS engines) and does NOT require a
   * third-party timezone database.
   */
  evaluateInPolicyTimezone(usedMinutesToday = 0, wallClock: Date = new Date()): EnforcementResult {
    const policy = this.syncService.getCachedPolicy();
    if (!policy || !policy.timezone) {
      return this.evaluate(usedMinutesToday, wallClock);
    }

    try {
      // Build a fake Date that represents "what time it is in the policy timezone"
      const tzDate = ScreenTimeEngine.toTimezoneDate(wallClock, policy.timezone);
      return this.evaluate(usedMinutesToday, tzDate);
    } catch {
      // If the timezone is invalid, fall back to UTC evaluation.
      console.warn(`[ScreenTimeEngine] Unknown timezone '${policy.timezone}'; falling back to UTC.`);
      return this.evaluate(usedMinutesToday, wallClock);
    }
  }

  /**
   * Convert a UTC Date to a synthetic Date whose getHours()/getMinutes()/getDay()
   * return the local time in the given IANA timezone string.
   * The resulting Date is *not* semantically a valid absolute timestamp —
   * it is only used for hour/minute/dayOfWeek extraction inside ScheduleEvaluator.
   */
  static toTimezoneDate(utcDate: Date, timezone: string): Date {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(utcDate);
    const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);

    const year = get('year');
    const month = get('month') - 1;
    const day = get('day');
    const hour = get('hour') === 24 ? 0 : get('hour'); // handle 24:00 edge case
    const minute = get('minute');
    const second = get('second');

    // Local Date constructor – gives us correct getDay(), getHours(), etc.
    return new Date(year, month, day, hour, minute, second);
  }

  // ---------- Capability surface ----------

  /**
   * Returns whether a specific schedule mode is enforceable on the current platform.
   * Surfaces the limitation rather than silently pretending enforcement occurred.
   */
  canEnforceMode(mode: ScheduleMode): { enforceable: boolean; limitations: string[] } {
    const limitations = this.adapter.getPlatformLimitations();
    if (limitations.length === 0) return { enforceable: true, limitations: [] };

    // ALL known modes are partially supported on both platforms.
    // Platform limitations describe *how*, not *whether* enforcement works.
    return {
      enforceable: true,
      limitations,
    };
  }

  // ---------- Private helpers ----------

  private _modeFromResult(result: EvaluationResult, policy: Policy): ScheduleMode | null {
    if (!result.activePeriodName) return null;
    if (result.activePeriodName === 'Bedtime') return 'BEDTIME';
    if (result.activePeriodName === 'Free Time') return 'FREE';
    if (result.activePeriodName === 'Daily Limit Reached') return 'DAILY_LIMIT';
    if (result.activePeriodName === 'Temporary Allowance') return 'FREE';
    if (result.activePeriodName === 'Tamper Protection') return null;

    // Match against named schedule rules
    const rule = policy.schedules.find((s) => s.name === result.activePeriodName);
    if (!rule) return 'CUSTOM';

    const nameLower = rule.name.toLowerCase();
    if (nameLower.includes('school')) return 'SCHOOL';
    if (nameLower.includes('homework')) return 'HOMEWORK';
    if (nameLower.includes('bedtime')) return 'BEDTIME';
    return 'CUSTOM';
  }

  private _blockedResult(
    mode: ScheduleMode,
    reason: string,
    isOfflineFallback: boolean,
    limitations: string[],
  ): EnforcementResult {
    return {
      shouldBlock: true,
      reason,
      activeMode: mode,
      evaluationDetail: {
        isBlocked: true,
        activePeriodName: mode,
        action: RestrictionAction.BLOCK,
        reason,
        remainingMinutes: 0,
        clockTamperingDetected: false,
        activeAllowance: null,
      },
      isOfflineFallback,
      platformCanEnforce: limitations.length === 0,
      platformLimitations: limitations,
      remainingMinutesToday: null,
    };
  }

  private _allowResult(
    mode: ScheduleMode | null,
    reason: string,
    isOfflineFallback: boolean,
    limitations: string[],
    remainingMinutes: number | null,
  ): EnforcementResult {
    return {
      shouldBlock: false,
      reason,
      activeMode: mode,
      evaluationDetail: {
        isBlocked: false,
        activePeriodName: mode,
        action: RestrictionAction.ALLOW,
        reason,
        remainingMinutes,
        clockTamperingDetected: false,
        activeAllowance: null,
      },
      isOfflineFallback,
      platformCanEnforce: limitations.length === 0,
      platformLimitations: limitations,
      remainingMinutesToday: remainingMinutes,
    };
  }
}
