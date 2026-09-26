import { ApiClient, ApiError } from '../services/apiClient';
import { Device } from '@guardian/shared-types';

export interface PairingCodeResponse {
  pairingCode: string;
  expiresAt: string;
}

export interface DeviceListState {
  devices: Device[];
  activePairingCode: PairingCodeResponse | null;
  isLoading: boolean;
  isGeneratingCode: boolean;
  error: string | null;
}

export const initialDeviceListState: DeviceListState = {
  devices: [],
  activePairingCode: null,
  isLoading: false,
  isGeneratingCode: false,
  error: null,
};

export async function loadDevices(
  client: ApiClient,
  childId: string,
): Promise<Device[]> {
  return client.get<Device[]>(`/children/${childId}/devices`);
}

export async function generatePairingCode(
  client: ApiClient,
  childId: string,
): Promise<PairingCodeResponse> {
  return client.post<PairingCodeResponse>(`/devices/pairing/generate`, { childId });
}

export async function revokeDevice(client: ApiClient, deviceId: string): Promise<void> {
  await client.post(`/devices/${deviceId}/revoke`, {});
}

export async function unpairDevice(client: ApiClient, deviceId: string): Promise<void> {
  await client.delete(`/devices/${deviceId}`);
}

export function formatPairingCodeForDisplay(code: string): string {
  // Display as "XXX-XXX" for readability
  if (code.length === 6) return `${code.slice(0, 3)}-${code.slice(3)}`;
  return code;
}

export function isPairingCodeExpired(expiresAt: string): boolean {
  return new Date(expiresAt) <= new Date();
}

export function secondsUntilExpiry(expiresAt: string): number {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

export function handleDeviceListError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Device operation failed. Please try again.';
}
