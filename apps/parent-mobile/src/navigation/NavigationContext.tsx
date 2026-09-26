import React, { createContext, useContext, useReducer } from 'react';
import { NavigationState, NavigateFunction, getInitialScreen, Screen } from './AppNavigator';

interface NavigationContextProps {
  state: NavigationState;
  navigate: NavigateFunction;
}

const NavigationContext = createContext<NavigationContextProps | undefined>(undefined);

const navigationReducer = (state: NavigationState, action: { type: 'NAVIGATE'; screen: Screen; params?: Record<string, unknown> }): NavigationState => {
  if (action.type === 'NAVIGATE') {
    return { currentScreen: action.screen, params: action.params };
  }
  return state;
};

export const NavigationProvider: React.FC<{ isAuthenticated: boolean; hasFamilyId: boolean }> = ({ children, isAuthenticated, hasFamilyId }) => {
  const initialState: NavigationState = {
    currentScreen: getInitialScreen(isAuthenticated, hasFamilyId),
    params: undefined,
  };
  const [state, dispatch] = useReducer(navigationReducer, initialState);

  const navigate: NavigateFunction = (screen, params) => {
    dispatch({ type: 'NAVIGATE', screen, params });
  };

  return (
    <NavigationContext.Provider value={{ state, navigate }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextProps => {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used within NavigationProvider');
  return ctx;
};
