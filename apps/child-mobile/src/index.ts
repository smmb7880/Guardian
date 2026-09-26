import { DevicePlatform } from '@guardian/shared-types';
import { AndroidAdapter } from './adapters/AndroidAdapter';
import { IOSAdapter } from './adapters/IOSAdapter';

export * from './adapters/AndroidAdapter';
export * from './adapters/IOSAdapter';
export * from './services/ChildDeviceSession';
export * from './services/PolicySyncService';
export * from './services/ChildAppController';
export * from './services/ScreenTimeEngine';

export function getNativeAdapter(platform: DevicePlatform) {
  if (platform === DevicePlatform.ANDROID) {
    return new AndroidAdapter();
  }
  return new IOSAdapter();
}

console.info('Guardian Child App Initialized.');
