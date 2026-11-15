import React, { createContext, useContext, useState, useCallback } from 'react';
import * as Linking from 'expo-linking';

export interface User {
  sub?: string;
  name?: string;
  nickname?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
  [key: string]: any;
}

export const AUTH0_CONFIG = {
  domain: 'dev-m0hdd241fan6xxnl.eu.auth0.com',
  clientId: 'idErTj8DzFTs4nrYMVoHovjVZZiHNXEX',
  origin: 'http://localhost:5279',
} as const;

const MOBILE_DEMO_USER: User = {
  sub: 'auth0|begreen-mobile-demo',
  name: 'Andrei Popescu',
  nickname: 'andrei.popescu',
  email: 'andrei.popescu@student.upt.ro',
  email_verified: true,
};

export function getAuth0RedirectUri(): string {
  try {
    return Linking.createURL('callback');
  } catch {
    return AUTH0_CONFIG.origin;
  }
}

interface Auth0ContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | undefined;
  error: Error | undefined;
  loginWithRedirect: (options?: {
    authorizationParams?: Record<string, any>;
  }) => Promise<void>;
  logout: (options?: { logoutParams?: Record<string, any> }) => Promise<void>;
  getAccessTokenSilently: () => Promise<string>;
}

const Auth0NativeContext = createContext<Auth0ContextValue>({
  isLoading: false,
  isAuthenticated: true,
  user: MOBILE_DEMO_USER,
  error: undefined,
  loginWithRedirect: async () => {},
  logout: async () => {},
  getAccessTokenSilently: async () => '',
});

export const Auth0Provider: React.FC<{
  domain?: string;
  clientId?: string;
  authorizationParams?: Record<string, any>;
  children: React.ReactNode;
}> = ({ children }) => {
  const [user, setUser] = useState<User | undefined>(MOBILE_DEMO_USER);
  const [accessToken, setAccessToken] = useState<string>('mobile-demo-access-token');

  const loginWithRedirect = useCallback(async () => {
    setUser(MOBILE_DEMO_USER);
    setAccessToken('mobile-demo-access-token');
  }, []);

  const logout = useCallback(async () => {
    setUser(undefined);
    setAccessToken('');
  }, []);

  const getAccessTokenSilently = useCallback(async () => accessToken, [accessToken]);

  return (
    <Auth0NativeContext.Provider
      value={{
        isLoading: false,
        isAuthenticated: !!user,
        user,
        error: undefined,
        loginWithRedirect,
        logout,
        getAccessTokenSilently,
      }}
    >
      {children}
    </Auth0NativeContext.Provider>
  );
};

export function useAuth0() {
  return useContext(Auth0NativeContext);
}
