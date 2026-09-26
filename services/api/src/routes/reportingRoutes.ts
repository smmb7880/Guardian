import { createSuccessResponse, ApiResponse } from '@guardian/shared-api';
import { ScreenTimeReport } from '@guardian/shared-types';
import { RequestUserContext } from '../middleware/authMiddleware';
import { ReportingService } from '../services/ReportingService';
import { AccountPrivacyService } from '../services/AccountPrivacyService';

export function handleGetReport(
  context: RequestUserContext,
  childId: string,
  period: 'daily' | 'weekly' = 'daily',
): ApiResponse<ScreenTimeReport> {
  const report = ReportingService.generateReport(context, childId, period);
  return createSuccessResponse(report);
}

export function handleDeleteAccount(
  context: RequestUserContext,
): ApiResponse<{ success: boolean; deletedFamilyId: string }> {
  const result = AccountPrivacyService.deleteParentAccount(context);
  return createSuccessResponse(result);
}

export function handleRemoveChild(
  context: RequestUserContext,
  childId: string,
): ApiResponse<{ removedChildId: string }> {
  AccountPrivacyService.removeChild(context, childId);
  return createSuccessResponse({ removedChildId: childId });
}

export function handleRemoveDevice(
  context: RequestUserContext,
  deviceId: string,
): ApiResponse<{ removedDeviceId: string }> {
  AccountPrivacyService.removeDevice(context, deviceId);
  return createSuccessResponse({ removedDeviceId: deviceId });
}
