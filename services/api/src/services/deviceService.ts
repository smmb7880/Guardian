import { Device, DevicePlatform, DeviceCapabilities, getDefaultCapabilities, UserRole } from '@guardian/shared-types';
import { HashService } from '../auth/hashService';
import { TokenService } from '../auth/tokenService';
import { AppError } from '../middleware/errorHandler';
import { verifyFamilyOwnership, verifyUserRole, RequestUserContext } from '../middleware/authMiddleware';
import { AuditService } from './auditService';
import { PairingService } from './pairingService';

export interface DevicePairingResponse {
  device: Device;
  deviceToken: string;
  childId: string;
  familyId: string;
}

export class DeviceService {
  private static devices: Map<string, Device> = new Map();
  private static revokedDevices: Set<string> = new Set();

  public static pairDeviceWithCode(payload: {
    pairingCode: string;
    name: string;
    platform: DevicePlatform;
    platformDeviceId: string;
    platformVersion?: string;
    appVersion?: string;
    capabilities?: DeviceCapabilities;
    pushToken?: string;
  }): DevicePairingResponse {
    // 1. Consume & validate pairing code
    const consumed = PairingService.validateAndConsumeCode(payload.pairingCode, payload.platformDeviceId);

    // 2. Check for duplicate/existing device registration
    let existingDevice: Device | null = null;
    for (const dev of this.devices.values()) {
      if (dev.platform === payload.platform && dev.platformDeviceId === payload.platformDeviceId) {
        existingDevice = dev;
        break;
      }
    }

    const now = new Date().toISOString();
    const capabilities = payload.capabilities || getDefaultCapabilities(payload.platform);
    let device: Device;

    if (existingDevice) {
      existingDevice.childId = consumed.childId;
      existingDevice.familyId = consumed.familyId;
      existingDevice.name = payload.name;
      existingDevice.platformVersion = payload.platformVersion || (payload.platform === DevicePlatform.IOS ? 'iOS 17.2' : 'Android 14');
      existingDevice.appVersion = payload.appVersion || '1.0.0';
      existingDevice.capabilities = capabilities;
      existingDevice.pushToken = payload.pushToken;
      existingDevice.isPaired = true;
      existingDevice.isOnline = true;
      existingDevice.updatedAt = now;
      existingDevice.lastSyncAt = now;
      existingDevice.lastActiveAt = now;
      device = existingDevice;
      this.revokedDevices.delete(device.id);
    } else {
      const deviceId = `device-${HashService.generateRandomToken(8)}`;
      device = {
        id: deviceId,
        childId: consumed.childId,
        familyId: consumed.familyId,
        name: payload.name,
        platform: payload.platform,
        platformDeviceId: payload.platformDeviceId,
        platformVersion: payload.platformVersion || (payload.platform === DevicePlatform.IOS ? 'iOS 17.2' : 'Android 14'),
        appVersion: payload.appVersion || '1.0.0',
        capabilities,
        pushToken: payload.pushToken,
        isPaired: true,
        isOnline: true,
        lastSyncAt: now,
        createdAt: now,
        updatedAt: now,
        lastActiveAt: now,
      };
      this.devices.set(deviceId, device);
    }

    // 3. Issue secure JWT device access token
    const deviceToken = TokenService.signAccessToken(
      device.id,
      `${device.id}@device.guardian.local`,
      UserRole.CHILD,
      device.familyId,
      2592000, // 30 days for device session
    );

    AuditService.logEvent('DEVICE_PAIRED', 'DEVICE', {
      familyId: device.familyId,
      actorId: device.id,
      entityId: device.id,
      details: { childId: device.childId, deviceName: device.name, platform: device.platform },
    });

    return {
      device,
      deviceToken,
      childId: device.childId,
      familyId: device.familyId,
    };
  }

  public static getDevice(context: RequestUserContext, deviceId: string): Device {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new AppError(404, 'DEVICE_NOT_FOUND', 'Requested device does not exist.');
    }
    verifyFamilyOwnership(context, device.familyId);
    return device;
  }

  public static unpairDevice(context: RequestUserContext, deviceId: string): void {
    const device = this.getDevice(context, deviceId);
    device.isPaired = false;
    device.updatedAt = new Date().toISOString();

    AuditService.logEvent('DEVICE_UNPAIRED', 'DEVICE', {
      familyId: device.familyId,
      actorId: context.userId,
      entityId: deviceId,
      details: { deviceName: device.name },
    });
  }

  public static revokeDevice(context: RequestUserContext, deviceId: string): void {
    verifyUserRole(context, [UserRole.PARENT]);
    const device = this.getDevice(context, deviceId);

    device.isPaired = false;
    device.isOnline = false;
    device.updatedAt = new Date().toISOString();
    this.revokedDevices.add(deviceId);

    AuditService.logEvent('DEVICE_REVOKED', 'DEVICE', {
      familyId: device.familyId,
      actorId: context.userId,
      entityId: deviceId,
      details: { deviceName: device.name, reason: 'Parent revoked access' },
    });
  }

  public static isDeviceRevoked(deviceId: string): boolean {
    return this.revokedDevices.has(deviceId);
  }

  public static listChildDevices(context: RequestUserContext, childId: string): Device[] {
    const list: Device[] = [];
    for (const dev of this.devices.values()) {
      if (dev.childId === childId && dev.isPaired) {
        verifyFamilyOwnership(context, dev.familyId);
        list.push(dev);
      }
    }
    return list;
  }

  public static listFamilyDevices(context: RequestUserContext, familyId: string): Device[] {
    verifyFamilyOwnership(context, familyId);
    const list: Device[] = [];
    for (const dev of this.devices.values()) {
      if (dev.familyId === familyId && dev.isPaired) {
        list.push(dev);
      }
    }
    return list;
  }

  public static registerDevice(
    context: RequestUserContext,
    payload: {
      childId: string;
      deviceName: string;
      platform: DevicePlatform;
      osVersion?: string;
      appVersion?: string;
    },
  ): Device {
    verifyUserRole(context, [UserRole.PARENT]);
    verifyFamilyOwnership(context, context.familyId);

    const now = new Date().toISOString();
    const deviceId = `device-${HashService.generateRandomToken(8)}`;
    const capabilities = getDefaultCapabilities(payload.platform);

    const device: Device = {
      id: deviceId,
      childId: payload.childId,
      familyId: context.familyId,
      name: payload.deviceName,
      platform: payload.platform,
      platformDeviceId: `pdev-${HashService.generateRandomToken(8)}`,
      platformVersion: payload.osVersion || (payload.platform === DevicePlatform.IOS ? 'iOS 17.2' : 'Android 14'),
      appVersion: payload.appVersion || '1.0.0',
      capabilities,
      isPaired: true,
      isOnline: true,
      lastSyncAt: now,
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
    };

    this.devices.set(deviceId, device);
    return device;
  }

  public static deleteChildDevices(childId: string): void {
    for (const [id, dev] of this.devices.entries()) {
      if (dev.childId === childId) {
        this.devices.delete(id);
        this.revokedDevices.add(id);
      }
    }
  }

  public static clearForTest(): void {
    this.devices.clear();
    this.revokedDevices.clear();
  }
}
