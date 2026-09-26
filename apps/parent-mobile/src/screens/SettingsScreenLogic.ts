import { ApiClient, ApiError } from '../services/apiClient';
import { AuthAction } from '../context/AuthContext';

export async function performLogout(
  client: ApiClient,
  refreshToken: string,
  dispatch: (action: AuthAction) => void,
): Promise<void> {
  try {
    await client.post('/auth/logout', { refreshToken });
  } finally {
    dispatch({ type: 'LOGOUT' });
  }
}

export async function requestAccountDeletion(
  client: ApiClient,
  password: string,
): Promise<void> {
  await client.post('/auth/delete-account', { password });
}
