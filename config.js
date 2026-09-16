window.KIOSK_CONFIG = {
  mode: "demo", // Set to "live" after connecting the Baylor server.
  endpoint: "", // Same-origin POST path, e.g. "/api/check-ins".
  inactivitySeconds: 75,
  warningSeconds: 10,
  successSeconds: 5,
  requireBaylorEmail: true,
  kioskId: "AI-SANDBOX-01"
};
