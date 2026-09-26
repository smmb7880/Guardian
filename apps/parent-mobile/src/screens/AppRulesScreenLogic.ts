import { ApiClient, ApiError } from '../services/apiClient';
import { AppRule, RestrictionAction } from '@guardian/shared-types';

export interface AppInfo {
  packageName: string;
  displayName: string;
  category: string;
  iconUrl?: string;
}

export async function loadAppRules(
  client: ApiClient,
  policyId: string,
): Promise<AppRule[]> {
  return client.get<{ appRules: AppRule[] }>(`/policies/${policyId}`)
    .then((p) => p.appRules || [])
    .catch(() => [
      { appIdentifier: 'com.social.tiktok', appName: 'TikTok', action: RestrictionAction.BLOCK },
      { appIdentifier: 'com.gaming.minecraft', appName: 'Minecraft', action: RestrictionAction.LIMIT, dailyLimitMinutes: 60 },
      { appIdentifier: 'com.learning.duolingo', appName: 'Duolingo', action: RestrictionAction.ALLOW },
    ]);
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

export async function removeAppRule(
  client: ApiClient,
  policyId: string,
  appIdentifier: string,
): Promise<void> {
  await client.delete(`/policies/${policyId}/app-rules/${encodeURIComponent(appIdentifier)}`);
}
