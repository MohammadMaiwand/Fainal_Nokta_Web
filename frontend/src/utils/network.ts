/**
 * Browser "online" flag for the public internet.
 * Local LAN/backend apps must NOT use this to block login, CAPTCHA, or CRUD —
 * those talk to the local API and work without public internet.
 */
export function isAppOffline() {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

/** True when the browser reports no public internet (UI hint only). */
export function isPublicInternetOffline() {
  return isAppOffline();
}

export function offlineActionMessage(
  fallback = 'This action needs the local Nokta server (MongoDB + backend). Public internet is not required.'
) {
  return fallback;
}
