import { ApiClient, ApiError } from '../services/apiClient';
import { AuthAction } from '../context/AuthContext';

export interface AccountSettings {
  displayName: string;
  email: string;
}

export interface SettingsState {
  account: AccountSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  successMessage: string | null;
}

export const initialSettingsState: SettingsState = {
  account: null,
  isLoading: false,
  isSaving: false,
  error: null,
  successMessage: null,
};

export async function loadAccountSettings(client: ApiClient): Promise<AccountSettings> {
  return client.get<AccountSettings>('/auth/me');
}

export async function updateDisplayName(
  client: ApiClient,
  displayName: string,
): Promise<AccountSettings> {
  return client.patch<AccountSettings>('/auth/me', { displayName });
}

export async function changePassword(
  client: ApiClient,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await client.post('/auth/change-password', { currentPassword, newPassword });
}

export function validatePasswordChange(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): string | null {
  if (!currentPassword) return 'Current password is required';
  if (!newPassword) return 'New password is required';
  if (newPassword.length < 8) return 'Password must be at least 8 characters';
  if (newPassword !== confirmPassword) return 'Passwords do not match';
  if (currentPassword === newPassword) return 'New password must differ from current password';
  return null;
}

export async function performLogout(
  client: ApiClient,
  refreshToken: string,
  dispatch: (action: AuthAction) => void,
): Promise<void> {
  try {
    await client.post('/auth/logout', { refreshToken });
  } finally {
    // Always clear local session regardless of server response
    dispatch({ type: 'LOGOUT' });
  }
}

export async function requestAccountDeletion(
  client: ApiClient,
  password: string,
): Promise<void> {
  // Requires password confirmation before deletion
  await client.post('/auth/delete-account', { password });
}

export function handleSettingsError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Settings operation failed. Please try again.';
}
