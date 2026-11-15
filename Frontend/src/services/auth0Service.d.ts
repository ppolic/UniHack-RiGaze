import type { User } from '@auth0/auth0-react';
import type React from 'react';

export type { User };

export declare const AUTH0_CONFIG: {
  readonly domain: string;
  readonly clientId: string;
  readonly origin: string;
};

export declare function getAuth0RedirectUri(): string;

export declare const Auth0Provider: React.FC<{
  domain?: string;
  clientId?: string;
  authorizationParams?: Record<string, any>;
  children: React.ReactNode;
}>;

export declare function useAuth0(): {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | undefined;
  error: Error | undefined;
  loginWithRedirect: (options?: {
    authorizationParams?: Record<string, any>;
  }) => Promise<void>;
  logout: (options?: { logoutParams?: Record<string, any> }) => Promise<void>;
  getAccessTokenSilently: () => Promise<string>;
};
