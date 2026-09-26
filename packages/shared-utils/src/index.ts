export function getUtcTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

export function parseMinutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export * from './ScheduleEvaluator';
export * from './AtomicStorage';
export * from './SyncTelemetryService';

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
}

export class ConsoleLogger implements Logger {
  info(message: string, meta?: Record<string, unknown>): void {
    console.info(`[INFO] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    console.error(
      `[ERROR] ${new Date().toISOString()} - ${message}`,
      error ? error.message : '',
      meta ? JSON.stringify(meta) : '',
    );
  }
}
