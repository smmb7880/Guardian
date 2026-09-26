import { createSuccessResponse, ApiResponse } from '@guardian/shared-api';
import { Device, DevicePlatform } from '@guardian/shared-types';
import { validateRequiredFields } from '../middleware/validateRequest';
import { RequestUserContext } from '../middleware/authMiddleware';
import { DeviceService, DevicePairingResponse } from '../services/deviceService';
import { PairingService, PairingCodeRecord } from '../services/pairingService';

export function handleGeneratePairingCode(
  context: RequestUserContext,
  payload: { childId?: string; familyId?: string },
): ApiResponse<PairingCodeRecord> {
  validateRequiredFields(payload, ['childId', 'familyId']);
  const record = PairingService.createPairingCode(context, payload.childId!, payload.familyId!);
  return createSuccessResponse(record);
}

export function handlePairDeviceWithCode(payload: {
  pairingCode?: string;
  name?: string;
  platform?: DevicePlatform;
  platformDeviceId?: string;
  pushToken?: string;
}): ApiResponse<DevicePairingResponse> {
  validateRequiredFields(payload, ['pairingCode', 'name', 'platform', 'platformDeviceId']);
  const result = DeviceService.pairDeviceWithCode({
    pairingCode: payload.pairingCode!,
    name: payload.name!,
    platform: payload.platform!,
    platformDeviceId: payload.platformDeviceId!,
    pushToken: payload.pushToken,
  });
  return createSuccessResponse(result);
}

export function handleUnpairDevice(
  context: RequestUserContext,
  payload: { deviceId?: string },
): ApiResponse<{ unpaired: boolean }> {
  validateRequiredFields(payload, ['deviceId']);
  DeviceService.unpairDevice(context, payload.deviceId!);
  return createSuccessResponse({ unpaired: true });
}

export function handleRevokeDevice(
  context: RequestUserContext,
  payload: { deviceId?: string },
): ApiResponse<{ revoked: boolean }> {
  validateRequiredFields(payload, ['deviceId']);
  DeviceService.revokeDevice(context, payload.deviceId!);
  return createSuccessResponse({ revoked: true });
}

export function handleListChildDevices(
  context: RequestUserContext,
  childId: string,
): ApiResponse<Device[]> {
  const devices = DeviceService.listChildDevices(context, childId);
  return createSuccessResponse(devices);
}

export function handleListFamilyDevices(
  context: RequestUserContext,
  familyId: string,
): ApiResponse<Device[]> {
  const devices = DeviceService.listFamilyDevices(context, familyId);
  return createSuccessResponse(devices);
}
