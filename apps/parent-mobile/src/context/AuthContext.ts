import { UserRole } from '@guardian/shared-types';
import { StorageService } from '../services/storageService';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  familyId?: string;
}

export interface AuthState {
  user: AuthenticatedUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; user: AuthenticatedUser; accessToken: string; refreshToken: string }
  | { type: 'LOGIN_ERROR'; error: string }
  | { type: 'LOGOUT' }
  | { type: 'TOKEN_REFRESHED'; accessToken: string; refreshToken: string }
  | { type: 'RESTORE_SESSION'; user: AuthenticatedUser; accessToken: string; refreshToken: string };

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true, error: null };

    case 'LOGIN_SUCCESS':
      StorageService.setItem('accessToken', action.accessToken);
      StorageService.setItem('refreshToken', action.refreshToken);
      StorageService.setItem('user', JSON.stringify(action.user));
      return {
        user: action.user,
        accessToken: action.accessToken,
        refreshToken: action.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case 'LOGIN_ERROR':
      return { ...state, isLoading: false, error: action.error };

    case 'LOGOUT':
      StorageService.removeItem('accessToken');
      StorageService.removeItem('refreshToken');
      StorageService.removeItem('user');
      return {
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };

    case 'TOKEN_REFRESHED':
      StorageService.setItem('accessToken', action.accessToken);
      StorageService.setItem('refreshToken', action.refreshToken);
      return { ...state, accessToken: action.accessToken, refreshToken: action.refreshToken };

    case 'RESTORE_SESSION':
      return {
        user: action.user,
        accessToken: action.accessToken,
        refreshToken: action.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    default:
      return state;
  }
}

export const initialAuthState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

export function restoreSessionFromStorage(): AuthState {
  const token = StorageService.getItem('accessToken');
  const refreshToken = StorageService.getItem('refreshToken');
  const userJson = StorageService.getItem('user');

  if (token && refreshToken && userJson) {
    const user = JSON.parse(userJson) as AuthenticatedUser;
    return {
      user,
      accessToken: token,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    };
  }
  return { ...initialAuthState, isLoading: false };
}
