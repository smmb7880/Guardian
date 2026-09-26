import { AndroidParentalControlAdapter, IOSParentalControlAdapter, DevicePlatform } from '@guardian/shared';

export function initializeNativeAdapter(platform: DevicePlatform) {
  if (platform === DevicePlatform.ANDROID) {
    return new AndroidParentalControlAdapter();
  }
  return new IOSParentalControlAdapter();
}

console.info('Guardian Mobile Workspace Shell Initialized.');
