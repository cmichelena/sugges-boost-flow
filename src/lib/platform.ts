// Centralised iOS detection. Kept as userAgent-only because
// display-mode: standalone does not trigger reliably inside the
// BuildNatively native wrapper (which is what Apple reviews).
// Single source of truth — change here if we ever move to PWABuilder.
export const isIOSApp = (): boolean =>
  typeof navigator !== "undefined" &&
  /iPad|iPhone|iPod/.test(navigator.userAgent);
