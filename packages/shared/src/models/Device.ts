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
  pushToken?: string;
  isPaired: boolean;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}
