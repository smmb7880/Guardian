import { getEnv } from '../config/env';
import { ConsoleLogger } from '@guardian/shared-utils';

const logger = new ConsoleLogger();

export class DatabaseClient {
  private static instance: DatabaseClient;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  public async connect(): Promise<boolean> {
    const env = getEnv();
    logger.info(`Connecting to PostgreSQL database at ${env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
    this.isConnected = true;
    return true;
  }

  public async disconnect(): Promise<void> {
    logger.info('Disconnecting PostgreSQL database client pool.');
    this.isConnected = false;
  }

  public getStatus(): { connected: boolean; url: string } {
    const env = getEnv();
    return {
      connected: this.isConnected,
      url: env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'),
    };
  }
}
