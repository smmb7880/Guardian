import { DatabaseClient } from '@guardian/api-service/dist/db/client';

export function runDbSchemaTest(): boolean {
  console.info('[Test] Running DB Schema & Client Test...');

  const dbClient = DatabaseClient.getInstance();
  const statusBefore = dbClient.getStatus();
  if (statusBefore.connected) {
    throw new Error('DatabaseClient should initially be disconnected.');
  }

  console.info('[Test] DB Schema & Client Test PASSED.');
  return true;
}
