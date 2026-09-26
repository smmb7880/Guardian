import { ApiClient, ApiError } from '../services/apiClient';
import { AppRule, RestrictionAction, DevicePlatform } from '@guardian/shared-types';

export interface AppInfo {
  packageName: string;
  displayName: string;
  category: string;
  iconUrl?: string;
}

export interface AppRulesState {
  rules: AppRule[];
  installedApps: AppInfo[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

export const initialAppRulesState: AppRulesState = {
  rules: [],
  installedApps: [],
  isLoading: false,
  isSaving: false,
  error: null,
};

export async function loadAppRules(
  client: ApiClient,
  policyId: string,
): Promise<AppRule[]> {
  const policy = await client.get<{ appRules: AppRule[] }>(`/policies/${policyId}`);
  return policy.appRules;
}

export async function loadInstalledApps(
  client: ApiClient,
  deviceId: string,
): Promise<AppInfo[]> {
  return client.get<AppInfo[]>(`/devices/${deviceId}/installed-apps`);
}

export async function addAppRule(
  client: ApiClient,
  policyId: string,
  appIdentifier: string,
  appName: string,
  action: RestrictionAction,
  dailyLimitMinutes?: number,
): Promise<AppRule> {
  return client.post<AppRule>(`/policies/${policyId}/app-rules`, {
    appIdentifier,
    appName,
    action,
    dailyLimitMinutes,
  });
}

export async function updateAppRule(
  client: ApiClient,
  policyId: string,
  appIdentifier: string,
  action: RestrictionAction,
  dailyLimitMinutes?: number,
): Promise<AppRule> {
  return client.patch<AppRule>(`/policies/${policyId}/app-rules/${encodeURIComponent(appIdentifier)}`, {
    action,
    dailyLimitMinutes,
  });
}

export async function removeAppRule(
  client: ApiClient,
  policyId: string,
  appIdentifier: string,
): Promise<void> {
  await client.delete(`/policies/${policyId}/app-rules/${encodeURIComponent(appIdentifier)}`);
}

export function groupRulesByAction(rules: AppRule[]): {
  blocked: AppRule[];
  allowed: AppRule[];
  limited: AppRule[];
} {
  return {
    blocked: rules.filter((r) => r.action === RestrictionAction.BLOCK),
    allowed: rules.filter((r) => r.action === RestrictionAction.ALLOW),
    limited: rules.filter((r) => r.action === RestrictionAction.LIMIT),
  };
}

export function handleAppRulesError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Failed to manage app rules.';
}
