export class StorageService {
  private static memoryStore: Map<string, string> = new Map();

  public static setItem(key: string, value: string): void {
    this.memoryStore.set(key, value);
  }

  public static getItem(key: string): string | null {
    return this.memoryStore.get(key) || null;
  }

  public static removeItem(key: string): void {
    this.memoryStore.delete(key);
  }

  public static clear(): void {
    this.memoryStore.clear();
  }
}
