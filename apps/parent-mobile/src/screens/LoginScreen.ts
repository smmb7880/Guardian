import { ApiClient, LoginRequest, LoginResponse, ApiError } from '../services/apiClient';
import { AuthAction, AuthenticatedUser } from '../context/AuthContext';
import { UserRole } from '@guardian/shared-types';

export interface LoginFormState {
  email: string;
  password: string;
  isLoading: boolean;
  fieldErrors: { email?: string; password?: string };
  formError: string | null;
}

export const initialLoginFormState: LoginFormState = {
  email: '',
  password: '',
  isLoading: false,
  fieldErrors: {},
  formError: null,
};

export function validateLoginForm(state: LoginFormState): { email?: string; password?: string } {
  const errors: { email?: string; password?: string } = {};
  if (!state.email.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) errors.email = 'Invalid email address';
  if (!state.password) errors.password = 'Password is required';
  return errors;
}

export async function performLogin(
  client: ApiClient,
  email: string,
  password: string,
  dispatch: (action: AuthAction) => void,
): Promise<void> {
  dispatch({ type: 'LOGIN_START' });
  const payload: LoginRequest = { email, password };
  const resp = await client.post<LoginResponse>('/auth/login', payload);
  const user: AuthenticatedUser = {
    userId: resp.userId,
    email: resp.email,
    role: resp.role as UserRole,
    familyId: resp.familyId,
  };
  dispatch({
    type: 'LOGIN_SUCCESS',
    user,
    accessToken: resp.accessToken,
    refreshToken: resp.refreshToken,
  });
}

export function handleLoginError(err: unknown, dispatch: (action: AuthAction) => void): string {
  if (err instanceof ApiError) {
    const msg = err.statusCode === 401
      ? 'Invalid email or password.'
      : err.statusCode === 429
        ? 'Too many attempts. Please wait before trying again.'
        : err.message;
    dispatch({ type: 'LOGIN_ERROR', error: msg });
    return msg;
  }
  const msg = 'Unable to connect. Check your network and try again.';
  dispatch({ type: 'LOGIN_ERROR', error: msg });
  return msg;
}
