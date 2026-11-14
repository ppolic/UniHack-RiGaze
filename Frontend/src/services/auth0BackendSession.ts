import { ENV } from '../config/env';
import { useUserStore } from '../store/userStore';
import { authService } from './authService';

type Session = Awaited<ReturnType<typeof authService.establishAuth0Session>>;
type TokenGetter = (options: { authorizationParams: { audience: string } }) => Promise<string | undefined>;
let generation = 0;
let identity: string | null = null;
let blocked: string | null = null;
let owned: { subject: string; token: string } | null = null;
let committing = false;
let pending: { subject: string; generation: number; promise: Promise<Session> } | null = null;

// Any external identity/token replacement invalidates pending work, including
// logout while the store is already empty. Preference and points edits do not.
useUserStore.subscribe((next, previous) => {
  if (committing) return;
  if (next.token !== previous.token || next.user?.id !== previous.user?.id ||
      next.isAuthenticated !== previous.isAuthenticated || (!next.token && !next.user)) {
    generation += 1;
    owned = null;
    if (!next.token && !next.user) blocked = identity;
  }
});

export function cancelAuth0BackendSession(subject?: string) {
  generation += 1;
  blocked = subject ?? identity;
  owned = null;
}

export function isAuth0SessionBlocked(subject: string) { return blocked === subject; }

function clearOwnedSession() {
  if (owned && useUserStore.getState().token === owned.token) {
    committing = true;
    try { useUserStore.getState().logout(); } finally { committing = false; }
  }
  owned = null;
}

export function resetAuth0Identity() {
  generation += 1;
  clearOwnedSession();
  identity = null;
  blocked = null;
}

export function requestAuth0BackendSession(subject: string, getToken: TokenGetter, retry = false) {
  if (identity !== subject) {
    generation += 1;
    clearOwnedSession();
    identity = subject;
    blocked = null;
  }
  if (retry) { generation += 1; blocked = null; }
  const snapshot = useUserStore.getState();
  const epoch = generation;
  if (!pending || pending.subject !== subject || pending.generation !== epoch) {
    const promise = (async () => {
      if (!ENV.API_URL || !ENV.AUTH0_AUDIENCE || blocked === subject) throw new Error('Backend authentication configuration is unavailable.');
      const accessToken = await getToken({ authorizationParams: { audience: ENV.AUTH0_AUDIENCE } });
      if (generation !== epoch || identity !== subject || blocked === subject) throw new Error('Session changed.');
      if (typeof accessToken !== 'string' || !accessToken.trim()) throw new Error('Access token is unavailable.');
      return authService.establishAuth0Session(accessToken);
    })();
    pending = { subject, generation: epoch, promise };
    // No tokens or SDK/backend errors are logged or exposed in UI.
    void promise.finally(() => { if (pending?.promise === promise) pending = null; }).catch(() => {});
  }
  return {
    promise: pending.promise,
    commit(session: Session) {
      const latest = useUserStore.getState();
      if (generation !== epoch || identity !== subject || blocked === subject ||
          latest.token !== snapshot.token || latest.user?.id !== snapshot.user?.id || latest.isAuthenticated !== snapshot.isAuthenticated ||
          Date.parse(session.expiresAtUtc) <= Date.now()) return false;
      committing = true;
      try {
        // Both existing actions run synchronously, with no await between them.
        latest.setToken(session.token);
        useUserStore.getState().setUser(session.user);
        owned = { subject, token: session.token };
      } finally { committing = false; }
      return true;
    },
  };
}

export function expireAuth0BackendSession(token: string) {
  if (owned?.token !== token) return;
  generation += 1;
  clearOwnedSession();
}
