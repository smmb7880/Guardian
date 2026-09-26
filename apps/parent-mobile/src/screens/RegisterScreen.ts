import { ApiClient, ApiError } from '../services/apiClient';
import { AuthAction, AuthenticatedUser } from '../context/AuthContext';
import { UserRole } from '@guardian/shared-types';

export interface RegisterFormState {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  isLoading: boolean;
  fieldErrors: { displayName?: string; email?: string; password?: string; confirmPassword?: string };
  formError: string | null;
}

export const initialRegisterFormState: RegisterFormState = {
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
  isLoading: false,
  fieldErrors: {},
  formError: null,
};

export interface RegisterRequest {
  displayName: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  userId: string;
  email: string;
  role: string;
  familyId?: string;
  accessToken: string;
  refreshToken: string;
}

export function validateRegisterForm(
  state: RegisterFormState,
): RegisterFormState['fieldErrors'] {
  const errors: RegisterFormState['fieldErrors'] = {};
  if (!state.displayName.trim()) errors.displayName = 'Display name is required';
  if (!state.email.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) errors.email = 'Invalid email';
  if (!state.password) errors.password = 'Password is required';
  else if (state.password.length < 8) errors.password = 'Password must be at least 8 characters';
  if (state.password !== state.confirmPassword) errors.confirmPassword = 'Passwords do not match';
  return errors;
}

export async function performRegistration(
  client: ApiClient,
  form: Pick<RegisterFormState, 'displayName' | 'email' | 'password'>,
  dispatch: (action: AuthAction) => void,
): Promise<void> {
  dispatch({ type: 'LOGIN_START' });
  const resp = await client.post<RegisterResponse>('/auth/register', {
    displayName: form.displayName,
    email: form.email,
    password: form.password,
  });
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

export function handleRegisterError(err: unknown, dispatch: (action: AuthAction) => void): string {
  if (err instanceof ApiError) {
    const msg = err.statusCode === 409
      ? 'An account with this email already exists.'
      : err.message;
    dispatch({ type: 'LOGIN_ERROR', error: msg });
    return msg;
  }
  const msg = 'Unable to connect. Check your network and try again.';
  dispatch({ type: 'LOGIN_ERROR', error: msg });
  return msg;
}
