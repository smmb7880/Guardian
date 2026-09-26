import { DeviceCapabilities } from './DeviceCapabilities';

export enum DevicePlatform {
  ANDROID = 'ANDROID',
  IOS = 'IOS',
}

export interface Device {
  id: string;
  childId: string;
  familyId: string;
  name: string;
  platform: DevicePlatform;
  platformDeviceId: string;
  platformVersion?: string;
  appVersion?: string;
  policyVersion?: number;
  capabilities?: DeviceCapabilities;
  isOnline?: boolean;
  pushToken?: string;
  isPaired: boolean;
  lastSyncAt?: string;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}
