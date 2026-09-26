export interface SyncOperationalMetrics {
  syncAttemptCount: number;
  syncSuccessCount: number;
  syncFailureCount: number;
  backoffDelayMs: number;
  cacheHitRatio: number;
  corruptionDetectedCount: number;
  revocationDetectedCount: number;
  lastSyncDurationMs: number | null;
}

export class SyncTelemetryService {
  private static metrics: SyncOperationalMetrics = {
    syncAttemptCount: 0,
    syncSuccessCount: 0,
    syncFailureCount: 0,
    backoffDelayMs: 0,
    cacheHitRatio: 1.0,
    corruptionDetectedCount: 0,
    revocationDetectedCount: 0,
    lastSyncDurationMs: null,
  };

  public static recordSyncAttempt(): void {
    this.metrics.syncAttemptCount++;
  }

  public static recordSyncSuccess(durationMs: number): void {
    this.metrics.syncSuccessCount++;
    this.metrics.lastSyncDurationMs = durationMs;
  }

  public static recordSyncFailure(backoffDelayMs: number): void {
    this.metrics.syncFailureCount++;
    this.metrics.backoffDelayMs = backoffDelayMs;
  }

  public static recordCorruptionDetected(): void {
    this.metrics.corruptionDetectedCount++;
  }

  public static recordRevocationDetected(): void {
    this.metrics.revocationDetectedCount++;
  }

  public static getMetrics(): Readonly<SyncOperationalMetrics> {
    return { ...this.metrics };
  }

  public static clearForTest(): void {
    this.metrics = {
      syncAttemptCount: 0,
      syncSuccessCount: 0,
      syncFailureCount: 0,
      backoffDelayMs: 0,
      cacheHitRatio: 1.0,
      corruptionDetectedCount: 0,
      revocationDetectedCount: 0,
      lastSyncDurationMs: null,
    };
  }
}
