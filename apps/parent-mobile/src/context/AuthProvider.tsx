import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { authReducer, initialAuthState, restoreSessionFromStorage, AuthState, AuthAction } from './AuthContext';

interface AuthProviderProps {
  children: React.ReactNode;
}

interface AuthContextValue {
  state: AuthState;
  dispatch: React.Dispatch<AuthAction>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  // Restore persisted session on mount
  useEffect(() => {
    const restored = restoreSessionFromStorage();
    if (restored.isAuthenticated) {
      dispatch({
        type: 'RESTORE_SESSION',
        user: restored.user!,
        accessToken: restored.accessToken!,
        refreshToken: restored.refreshToken!,
      });
    } else {
      // Ensure loading flag is cleared if no session
      dispatch({ type: 'LOGIN_ERROR', error: '' }); // resets loading
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
