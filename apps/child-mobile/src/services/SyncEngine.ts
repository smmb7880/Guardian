import { Policy } from '@guardian/shared-types';
import { SyncTelemetryService } from '@guardian/shared-utils';
import { PolicySyncService } from './PolicySyncService';

export type SyncState = 'IDLE' | 'SYNCING' | 'UP_TO_DATE' | 'BACKOFF_RETRY' | 'PAUSED_COOLDOWN' | 'EXPIRED_CREDENTIALS' | 'REVOKED';

export interface SyncEngineConfig {
  baseDelayMs?: number;
  maxDelayMs?: number;
  maxAttempts?: number;
  backoffFactor?: number;
}

export class SyncEngine {
  private syncService: PolicySyncService;
  private state: SyncState = 'IDLE';
  private attemptCount = 0;
  private baseDelayMs: number;
  private maxDelayMs: number;
  private maxAttempts: number;
  private backoffFactor: number;

  constructor(syncService: PolicySyncService, config: SyncEngineConfig = {}) {
    this.syncService = syncService;
    this.baseDelayMs = config.baseDelayMs ?? 1000;
    this.maxDelayMs = config.maxDelayMs ?? 60000;
    this.maxAttempts = config.maxAttempts ?? 5;
    this.backoffFactor = config.backoffFactor ?? 2;
  }

  public getSyncState(): SyncState {
    return this.state;
  }

  public getAttemptCount(): number {
    return this.attemptCount;
  }

  /**
   * Calculate exponential backoff delay with jitter.
   */
  public calculateBackoffDelay(attempt: number): number {
    const rawDelay = this.baseDelayMs * Math.pow(this.backoffFactor, attempt - 1);
    const jitter = Math.floor(Math.random() * 200);
    return Math.min(rawDelay + jitter, this.maxDelayMs);
  }

  /**
   * Execute full synchronization protocol against server API mock / transport handler.
   */
  public async performSync(
    serverTransport: {
      checkSync: (version: number) => Promise<{ status: number; data?: { upToDate?: boolean; policy?: Policy; error?: string } }>;
      acknowledgeSync: (version: number) => Promise<boolean>;
      refreshToken?: () => Promise<boolean>;
    },
  ): Promise<boolean> {
    if (!this.syncService.isOnline) {
      console.info('[SyncEngine] Cannot sync while device is offline.');
      return false;
    }

    if (this.state === 'REVOKED') {
      console.warn('[SyncEngine] Device is revoked. Sync blocked.');
      return false;
    }

    this.state = 'SYNCING';
    SyncTelemetryService.recordSyncAttempt();
    const startTime = Date.now();

    const cachedPolicy = this.syncService.getCachedPolicy();
    const currentVersion = cachedPolicy ? cachedPolicy.version : 0;

    try {
      const response = await serverTransport.checkSync(currentVersion);

      // --- 1. Handle HTTP Error Statuses ---
      if (response.status === 401) {
        // Expired credentials
        this.state = 'EXPIRED_CREDENTIALS';
        console.warn('[SyncEngine] 401 Expired credentials detected.');
        if (serverTransport.refreshToken) {
          const refreshed = await serverTransport.refreshToken();
          if (refreshed) {
            this.state = 'IDLE';
            return this.performSync(serverTransport); // Retry once after token refresh
          }
        }
        return false;
      }

      if (response.status === 403 || response.status === 404) {
        // Revoked device
        this.state = 'REVOKED';
        this.syncService.markRevoked();
        console.error('[SyncEngine] Device has been revoked by server (403/404). Wiping local cache.');
        return false;
      }

      if (response.status >= 500 || response.status === 0) {
        // Server unavailable or network error
        return this.handleSyncFailure(serverTransport, `Server error ${response.status}`);
      }

      // --- 2. Handle Success Responses ---
      if (response.status === 200 || response.status === 304) {
        const payload = response.data;

        if (!payload) {
          return this.handleSyncFailure(serverTransport, 'Empty payload received');
        }

        if (payload.upToDate) {
          this.state = 'UP_TO_DATE';
          this.attemptCount = 0;
          SyncTelemetryService.recordSyncSuccess(Date.now() - startTime);
          return true;
        }

        if (payload.policy) {
          const newPolicy = payload.policy;

          // Schema validation: reject invalid payload
          if (!newPolicy || typeof newPolicy !== 'object' || !newPolicy.id || typeof newPolicy.version !== 'number') {
            return this.handleSyncFailure(serverTransport, 'Invalid policy payload schema');
          }

          // Conflict check: ignore outdated version returned
          if (cachedPolicy && newPolicy.version < cachedPolicy.version) {
            console.warn(`[SyncEngine] Conflict: Server returned older version (${newPolicy.version}) than local (${cachedPolicy.version}). Retaining local cache.`);
            this.state = 'UP_TO_DATE';
            return false;
          }

          // Atomic store
          this.syncService.savePolicyToCache(newPolicy);

          // Acknowledge version
          await serverTransport.acknowledgeSync(newPolicy.version);

          this.state = 'UP_TO_DATE';
          this.attemptCount = 0;
          SyncTelemetryService.recordSyncSuccess(Date.now() - startTime);
          return true;
        }
      }

      return this.handleSyncFailure(serverTransport, 'Unexpected server response');
    } catch (err: any) {
      return this.handleSyncFailure(serverTransport, err?.message || 'Network exception');
    }
  }

  /**
   * Handle sync failure with exponential backoff and max attempts cap.
   */
  private async handleSyncFailure(
    serverTransport: any,
    reason: string,
  ): Promise<boolean> {
    this.attemptCount++;
    const backoffDelay = this.calculateBackoffDelay(this.attemptCount);
    SyncTelemetryService.recordSyncFailure(backoffDelay);

    if (this.attemptCount >= this.maxAttempts) {
      this.state = 'PAUSED_COOLDOWN';
      console.warn(`[SyncEngine] Max sync attempts (${this.maxAttempts}) reached. Entering cooldown state. Reason: ${reason}`);
      return false;
    }

    this.state = 'BACKOFF_RETRY';
    console.info(`[SyncEngine] Sync failed (${reason}). Scheduling retry attempt ${this.attemptCount}/${this.maxAttempts} in ${backoffDelay}ms.`);
    return false;
  }

  /**
   * Reset retry state when network reconnects or user triggers manual refresh.
   */
  public resetRetryState(): void {
    this.attemptCount = 0;
    if (this.state !== 'REVOKED') {
      this.state = 'IDLE';
    }
  }
}
