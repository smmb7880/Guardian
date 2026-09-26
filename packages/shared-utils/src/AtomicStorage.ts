export class StorageCorruptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageCorruptionError';
  }
}

export interface StorageRecord<T> {
  checksum: string;
  payload: T;
  updatedAt: string;
}

export class AtomicStorage {
  private static store: Map<string, string> = new Map();

  /**
   * Calculate a deterministic checksum string for data.
   */
  public static calculateChecksum(data: unknown): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return `chk-${Math.abs(hash).toString(16)}`;
  }

  /**
   * Atomically write data to storage.
   * Serializes payload, attaches checksum, and performs an atomic swap.
   */
  public static writeAtomic<T>(key: string, data: T): void {
    if (data === undefined || data === null) {
      throw new Error('AtomicStorage: Cannot write null or undefined payload.');
    }

    const checksum = this.calculateChecksum(data);
    const record: StorageRecord<T> = {
      checksum,
      payload: data,
      updatedAt: new Date().toISOString(),
    };

    const serialized = JSON.stringify(record);

    // Atomic swap simulation: staged serialized string is stored in single operation
    this.store.set(key, serialized);
  }

  /**
   * Read data from atomic storage.
   * Verifies JSON structure and checksum. Throws StorageCorruptionError if corrupted.
   */
  public static readAtomic<T>(key: string): T | null {
    const raw = this.store.get(key);
    if (!raw) return null;

    let record: StorageRecord<T>;
    try {
      record = JSON.parse(raw);
    } catch {
      throw new StorageCorruptionError(`AtomicStorage: Corrupted JSON data for key '${key}'`);
    }

    if (!record || typeof record !== 'object' || !record.checksum || record.payload === undefined) {
      throw new StorageCorruptionError(`AtomicStorage: Invalid record structure for key '${key}'`);
    }

    const expectedChecksum = this.calculateChecksum(record.payload);
    if (record.checksum !== expectedChecksum) {
      throw new StorageCorruptionError(
        `AtomicStorage: Checksum mismatch for key '${key}' (stored: ${record.checksum}, calculated: ${expectedChecksum})`,
      );
    }

    return record.payload;
  }

  /**
   * Remove key from storage.
   */
  public static removeAtomic(key: string): void {
    this.store.delete(key);
  }

  /**
   * Corrupt storage key for testing failure recovery.
   */
  public static corruptKeyForTest(key: string): void {
    this.store.set(key, '{ "checksum": "bad-check", "payload": { "corrupted": true }');
  }

  /**
   * Clear all storage records for test isolation.
   */
  public static clearForTest(): void {
    this.store.clear();
  }
}
