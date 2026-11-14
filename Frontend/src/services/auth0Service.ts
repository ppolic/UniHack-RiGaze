/**
 * Official Auth0 SDK Integration helpers.
 * OAuth/OIDC flows are handled exclusively by @auth0/auth0-react.
 */
export { useAuth0, Auth0Provider } from '@auth0/auth0-react';
export type { User } from '@auth0/auth0-react';

export const AUTH0_CONFIG = {
  domain: 'dev-m0hdd241fan6xxnl.eu.auth0.com',
  clientId: 'idErTj8DzFTs4nrYMVoHovjVZZiHNXEX',
  origin: 'http://localhost:5279',
} as const;

export function getAuth0RedirectUri(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return AUTH0_CONFIG.origin;
}
