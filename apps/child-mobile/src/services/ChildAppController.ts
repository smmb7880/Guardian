import { Policy, RestrictionAction } from '@guardian/shared-types';
import { AndroidAdapter } from '../adapters/AndroidAdapter';
import { IOSAdapter } from '../adapters/IOSAdapter';
import { ChildDeviceSession, ChildDeviceCredentials } from './ChildDeviceSession';
import { PolicySyncService } from './PolicySyncService';

export interface DevicePairingResponse {
  deviceId: string;
  childId: string;
  familyId: string;
  accessToken: string;
  refreshToken: string;
}

export class ChildAppController {
  private androidAdapter: AndroidAdapter;
  private iosAdapter: IOSAdapter;
  private session: ChildDeviceSession;
  private syncService: PolicySyncService;

  constructor() {
    this.androidAdapter = new AndroidAdapter();
    this.iosAdapter = new IOSAdapter();
    this.session = new ChildDeviceSession();
    this.syncService = new PolicySyncService();
  }

  async pairDeviceWithCode(
    pairingCode: string,
    platformDeviceId: string,
    _deviceName: string,
  ): Promise<ChildDeviceCredentials> {
    console.info(`[ChildAppController] Attempting pairing with code: ${pairingCode}`);

    // Simulates the backend /devices/pairing/pair response.
    const mockResponse: DevicePairingResponse = {
      deviceId: `dev-${Date.now()}`,
      childId: 'c-1',
      familyId: 'f-1',
      accessToken: 'child-access-token-123',
      refreshToken: 'child-refresh-token-123',
    };

    const creds: ChildDeviceCredentials = { ...mockResponse, platformDeviceId };
    this.session.setCredentials(creds);
    return creds;
  }

  async syncAndApplyPolicy(policy: Policy): Promise<boolean> {
    if (this.syncService.isPolicyUpdated(policy.version)) {
      this.syncService.savePolicyToCache(policy);
      return this.androidAdapter.applyPolicy(policy);
    }
    return true;
  }

  /**
   * Determine whether a specific app should be accessible right now.
   * Uses ScheduleEvaluator (via the adapter) to handle bedtime, schedules,
   * and daily limits in a single, midnight-crossing-safe pass.
   */
  evaluateAppAccess(packageName: string, usedMinutesToday = 0): { allowed: boolean; reason?: string } {
    const policy = this.syncService.getCachedPolicy();
    if (!policy) return { allowed: true };

    // Use ScheduleEvaluator for bedtime + schedule + daily limit (handles midnight crossing)
    const scheduleResult = this.androidAdapter.evaluateCurrentSchedule(usedMinutesToday);
    if (scheduleResult && scheduleResult.isBlocked) {
      return { allowed: false, reason: scheduleResult.reason };
    }

    // Per-app rule check
    const appRule = policy.appRules?.find(
      (r) => r.appIdentifier.toLowerCase() === packageName.toLowerCase(),
    );
    if (appRule && appRule.action === RestrictionAction.BLOCK) {
      return { allowed: false, reason: `App ${appRule.appName} is blocked by parent policy` };
    }

    return { allowed: true };
  }

  getCapabilityReport() {
    return this.androidAdapter.getCapabilityReport();
  }

  getIOSCapabilityReport() {
    return this.iosAdapter.getCapabilityReport();
  }

  getAdapter(): AndroidAdapter {
    return this.androidAdapter;
  }

  getIOSAdapter(): IOSAdapter {
    return this.iosAdapter;
  }

  getSession(): ChildDeviceSession {
    return this.session;
  }

  getSyncService(): PolicySyncService {
    return this.syncService;
  }
}
