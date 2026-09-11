/*
  Quick setup:
  1. Leave mode as "demo" to test without a backend.
  2. For Google Apps Script, set mode to "google-apps-script" and paste its /exec URL.
  3. For another API, set mode to "generic" and paste its POST URL.
*/
window.KIOSK_CONFIG = {
  mode: "google-apps-script", // "demo" | "google-apps-script" | "generic"
  endpoint: "https://script.google.com/macros/s/AKfycby6_mKzJHTew3m5tA8iZIiLSlm_CFYoW5S8vI2aRejtPNHN9maah4S579cW0uOJE4hUTg/exec",
  inactivitySeconds: 75,
  warningSeconds: 10,
  successSeconds: 5,
  requireBaylorEmail: true,
  kioskId: "AI-SANDBOX-01"
};
