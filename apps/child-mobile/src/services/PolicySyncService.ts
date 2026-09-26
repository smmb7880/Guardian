import { Policy } from '@guardian/shared-types';
import { AtomicStorage, StorageCorruptionError, SyncTelemetryService } from '@guardian/shared-utils';

const OFFLINE_POLICY_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours
const STORAGE_KEY = 'local_policy_cache';

export interface PolicyCacheEntry {
  policy: Policy;
  cachedAt: string; // ISO string
  offlineSince: string | null; // ISO string when device went offline, null = online
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncAt: string | null;
  offlineDurationMs: number;
  isPolicyExpired: boolean;
  hasCorruptedStorage: boolean;
  isRevoked: boolean;
}

export class PolicySyncService {
  private cacheEntry: PolicyCacheEntry | null = null;
  private _isOnline = true;
  private _hasCorruptedStorage = false;
  private _isRevoked = false;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load cache from AtomicStorage with corruption recovery.
   */
  public loadFromStorage(): void {
    try {
      const entry = AtomicStorage.readAtomic<PolicyCacheEntry>(STORAGE_KEY);
      this.cacheEntry = entry;
      this._hasCorruptedStorage = false;
    } catch (err) {
      if (err instanceof StorageCorruptionError) {
        console.error('[PolicySyncService] Corrupted local storage detected! Clearing cache and entering safe fallback mode.');
        SyncTelemetryService.recordCorruptionDetected();
        AtomicStorage.removeAtomic(STORAGE_KEY);
        this.cacheEntry = null;
        this._hasCorruptedStorage = true;
      } else {
        throw err;
      }
    }
  }

  // ---------- Core cache operations ----------

  getCachedPolicy(): Policy | null {
    if (this._hasCorruptedStorage || this._isRevoked) {
      return null; // Force safe fallback
    }
    return this.cacheEntry?.policy ?? null;
  }

  savePolicyToCache(policy: Policy): void {
    if (!policy || typeof policy !== 'object' || !policy.id || typeof policy.version !== 'number') {
      throw new Error('Invalid policy schema passed to savePolicyToCache');
    }

    const entry: PolicyCacheEntry = {
      policy,
      cachedAt: new Date().toISOString(),
      offlineSince: this.cacheEntry?.offlineSince ?? null,
    };

    // Atomic storage commit
    AtomicStorage.writeAtomic(STORAGE_KEY, entry);
    this.cacheEntry = entry;
    this._hasCorruptedStorage = false;
  }

  clearCache(): void {
    AtomicStorage.removeAtomic(STORAGE_KEY);
    this.cacheEntry = null;
  }

  markRevoked(): void {
    this._isRevoked = true;
    this.clearCache();
    SyncTelemetryService.recordRevocationDetected();
  }

  isPolicyUpdated(newVersion: number): boolean {
    if (!this.cacheEntry) return true;
    return newVersion > this.cacheEntry.policy.version;
  }

  // ---------- Offline mode ----------

  markDeviceOffline(): void {
    if (this._isOnline) {
      this._isOnline = false;
      if (this.cacheEntry) {
        this.cacheEntry = {
          ...this.cacheEntry,
          offlineSince: this.cacheEntry.offlineSince ?? new Date().toISOString(),
        };
        AtomicStorage.writeAtomic(STORAGE_KEY, this.cacheEntry);
      }
      console.info('[PolicySyncService] Device is now offline. Using cached policy.');
    }
  }

  markDeviceOnline(): void {
    this._isOnline = true;
    if (this.cacheEntry && this.cacheEntry.offlineSince !== null) {
      this.cacheEntry = { ...this.cacheEntry, offlineSince: null };
      AtomicStorage.writeAtomic(STORAGE_KEY, this.cacheEntry);
    }
    console.info('[PolicySyncService] Device is back online.');
  }

  get isOnline(): boolean {
    return this._isOnline;
  }

  // ---------- Expiry & Sync status ----------

  isPolicyCacheExpired(now: Date = new Date()): boolean {
    if (!this.cacheEntry) return false;
    if (this._isOnline) return false;
    const cachedAt = new Date(this.cacheEntry.cachedAt).getTime();
    return now.getTime() - cachedAt > OFFLINE_POLICY_TTL_MS;
  }

  getSyncStatus(now: Date = new Date()): SyncStatus {
    const lastSyncAt = this.cacheEntry?.cachedAt ?? null;
    let offlineDurationMs = 0;
    if (!this._isOnline && this.cacheEntry?.offlineSince) {
      offlineDurationMs = now.getTime() - new Date(this.cacheEntry.offlineSince).getTime();
    }
    return {
      isOnline: this._isOnline,
      lastSyncAt,
      offlineDurationMs,
      isPolicyExpired: this.isPolicyCacheExpired(now),
      hasCorruptedStorage: this._hasCorruptedStorage,
      isRevoked: this._isRevoked,
    };
  }

  // ---------- Allowance pruning ----------

  pruneExpiredAllowances(now: Date = new Date()): number {
    if (!this.cacheEntry) return 0;
    const before = this.cacheEntry.policy.temporaryAllowances.length;
    const active = this.cacheEntry.policy.temporaryAllowances.filter(
      (a) => new Date(a.expiresAt).getTime() > now.getTime(),
    );
    if (active.length < before) {
      const updatedPolicy = { ...this.cacheEntry.policy, temporaryAllowances: active };
      this.savePolicyToCache(updatedPolicy);
    }
    return before - active.length;
  }
}
