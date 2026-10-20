/**
 * Web session marker for shared school devices.
 *
 * On the web app, Appwrite sessions are stored in the browser and survive
 * after the student closes the tab. On a shared computer that means the next
 * student would silently inherit the previous student's account.
 *
 * This marker lives in `sessionStorage` (per-tab):
 * - It is set right after a successful sign-in, so refreshing the SAME tab
 *   restores that student's session.
 * - It is NOT shared with new tabs/visits, so the next student always starts
 *   at the login screen with a clean session.
 *
 * The storage object is injected so the logic stays testable outside a
 * browser. `window.sessionStorage` is the real implementation on web;
 * elsewhere there is no store and every call is a safe no-op.
 */

export const WEB_SESSION_MARKER_KEY = 'moneyquest_web_session_active';

export interface WebSessionMarkerStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const getDefaultWebSessionMarkerStore = (): WebSessionMarkerStore | null => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage;
    }
  } catch (error) {
    // sessionStorage access can throw in some privacy modes - treat as absent
  }
  return null;
};

export const isWebSessionMarked = (store: WebSessionMarkerStore | null | undefined): boolean => {
  if (!store) {
    return false;
  }
  try {
    return store.getItem(WEB_SESSION_MARKER_KEY) === '1';
  } catch (error) {
    return false;
  }
};

export const markWebSession = (store: WebSessionMarkerStore | null | undefined): void => {
  if (!store) {
    return;
  }
  try {
    store.setItem(WEB_SESSION_MARKER_KEY, '1');
  } catch (error) {
    // Non-fatal: worst case the next refresh asks the student to log in again
  }
};

export const clearWebSessionMarker = (store: WebSessionMarkerStore | null | undefined): void => {
  if (!store) {
    return;
  }
  try {
    store.removeItem(WEB_SESSION_MARKER_KEY);
  } catch (error) {
    // Non-fatal
  }
};
