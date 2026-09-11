(() => {
  "use strict";

  const defaults = {
    mode: "demo",
    endpoint: "",
    inactivitySeconds: 75,
    warningSeconds: 10,
    successSeconds: 5,
    requireBaylorEmail: true,
    kioskId: "AI-SANDBOX-01"
  };
  const config = { ...defaults, ...(window.KIOSK_CONFIG || {}) };

  const screens = {
    idle: document.getElementById("idleScreen"),
    form: document.getElementById("formScreen"),
    success: document.getElementById("successScreen")
  };
  const form = document.getElementById("checkinForm");
  const email = document.getElementById("email");
  const purpose = document.getElementById("purpose");
  const submitButton = document.getElementById("submitButton");
  const timeoutDialog = document.getElementById("timeoutDialog");
  const modeIndicator = document.getElementById("modeIndicator");
  let activeScreen = "idle";
  let inactivityTimer;
  let warningTimer;
  let successTimer;

  modeIndicator.textContent = config.mode === "demo" ? "Demo mode" : "Live check-in";

  function showScreen(name) {
    Object.entries(screens).forEach(([key, element]) => {
      const active = key === name;
      element.hidden = !active;
      element.classList.toggle("is-active", active);
    });
    activeScreen = name;
    timeoutDialog.hidden = true;
    clearTimeout(inactivityTimer);
    clearInterval(warningTimer);
    if (name === "form") resetInactivityTimer();
  }

  function clearSensitiveFields() {
    form.reset();
    document.getElementById("emailError").textContent = "";
    document.getElementById("purposeError").textContent = "";
    document.getElementById("stationError").textContent = "";
    document.getElementById("submitError").textContent = "";
  }

  function returnToIdle() {
    clearInterval(successTimer);
    clearTimeout(inactivityTimer);
    clearInterval(warningTimer);
    clearSensitiveFields();
    showScreen("idle");
    document.getElementById("startButton").focus({ preventScroll: true });
  }

  function startCheckIn() {
    clearSensitiveFields();
    showScreen("form");
    setTimeout(() => email.focus({ preventScroll: true }), 80);
  }

  function resetInactivityTimer() {
    if (activeScreen !== "form" || !timeoutDialog.hidden) return;
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(showTimeoutWarning, Math.max(5, config.inactivitySeconds) * 1000);
  }

  function showTimeoutWarning() {
    if (activeScreen !== "form") return;
    let seconds = Math.max(3, config.warningSeconds);
    document.getElementById("timeoutCountdown").textContent = seconds;
    timeoutDialog.hidden = false;
    document.getElementById("continueButton").focus({ preventScroll: true });
    warningTimer = setInterval(() => {
      seconds -= 1;
      document.getElementById("timeoutCountdown").textContent = Math.max(0, seconds);
      if (seconds <= 0) returnToIdle();
    }, 1000);
  }

  function continueCheckIn() {
    clearInterval(warningTimer);
    timeoutDialog.hidden = true;
    resetInactivityTimer();
    email.focus({ preventScroll: true });
  }

  function getPayload() {
    const data = new FormData(form);
    return {
      timestamp: new Date().toISOString(),
      kioskId: config.kioskId,
      email: String(data.get("email") || "").trim().toLowerCase(),
      name: String(data.get("name") || "").trim(),
      purpose: String(data.get("purpose") || ""),
      station: String(data.get("station") || ""),
      userAgent: navigator.userAgent
    };
  }

  function validate(payload) {
    let valid = true;
    const emailError = document.getElementById("emailError");
    const purposeError = document.getElementById("purposeError");
    const stationError = document.getElementById("stationError");
    emailError.textContent = "";
    purposeError.textContent = "";
    stationError.textContent = "";

    const basicEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicEmail.test(payload.email)) {
      emailError.textContent = "Enter a valid email address.";
      valid = false;
    } else if (config.requireBaylorEmail && !payload.email.endsWith("@baylor.edu")) {
      emailError.textContent = "Use your @baylor.edu email address.";
      valid = false;
    }
    if (!payload.purpose) {
      purposeError.textContent = "Choose the purpose of your visit.";
      valid = false;
    }
    if (!payload.station) {
      stationError.textContent = "Choose the station you will use.";
      valid = false;
    }
    if (!valid) {
      const firstError = form.querySelector(".field-error:not(:empty)");
      firstError?.closest("label, fieldset")?.querySelector("input, select")?.focus();
    }
    return valid;
  }

  async function sendSubmission(payload) {
    if (config.mode === "demo") {
      console.info("AI Sandbox demo check-in (not sent or saved):", { ...payload, email: "[redacted]", name: payload.name ? "[redacted]" : "" });
      await new Promise(resolve => setTimeout(resolve, 450));
      return { ok: true, demo: true };
    }
    if (!config.endpoint) throw new Error("The check-in endpoint has not been configured.");

    if (config.mode === "google-apps-script") {
      await fetch(config.endpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      return { ok: true };
    }

    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`The check-in service returned ${response.status}.`);
    return { ok: true };
  }

  function showSuccess() {
    clearSensitiveFields();
    showScreen("success");
    let seconds = Math.max(1, config.successSeconds);
    document.getElementById("countdownNumber").textContent = seconds;
    successTimer = setInterval(() => {
      seconds -= 1;
      document.getElementById("countdownNumber").textContent = Math.max(0, seconds);
      if (seconds <= 0) returnToIdle();
    }, 1000);
  }

  async function submitCheckIn(payloadOverride) {
    const payload = payloadOverride || getPayload();
    if (!validate(payload)) throw new Error("Please complete the required fields.");
    submitButton.disabled = true;
    submitButton.querySelector("span").textContent = "Checking in…";
    document.getElementById("submitError").textContent = "";
    try {
      const result = await sendSubmission(payload);
      showSuccess();
      return result;
    } catch (error) {
      document.getElementById("submitError").textContent = "We couldn’t complete check-in. Please try again or ask a staff member for help.";
      throw error;
    } finally {
      submitButton.disabled = false;
      submitButton.querySelector("span").textContent = "Check in";
    }
  }

  document.getElementById("startButton").addEventListener("click", startCheckIn);
  document.getElementById("backButton").addEventListener("click", returnToIdle);
  document.getElementById("continueButton").addEventListener("click", continueCheckIn);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    try { await submitCheckIn(); } catch (error) { console.error("Check-in failed:", error); }
  });
  ["pointerdown", "keydown", "input", "change"].forEach(eventName => {
    document.addEventListener(eventName, resetInactivityTimer, { passive: true });
  });

  function registerWebMcpTools() {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    try {
      context.registerTool({
        name: "start_ai_sandbox_check_in",
        title: "Start AI Sandbox check-in",
        description: "Open and prepare the visible AI Sandbox visitor check-in form.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async () => { startCheckIn(); return { screen: "check-in-form" }; }
      });
      context.registerTool({
        name: "submit_ai_sandbox_check_in",
        title: "Submit AI Sandbox check-in",
        description: "Submit a completed AI Sandbox visitor check-in and show confirmation.",
        inputSchema: {
          type: "object",
          properties: {
            email: { type: "string" },
            name: { type: "string" },
            purpose: { type: "string" },
            station: { type: "string", enum: ["1", "2", "3", "4"] }
          },
          required: ["email", "purpose", "station"],
          additionalProperties: false
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async input => {
          if (activeScreen !== "form") startCheckIn();
          const payload = { timestamp: new Date().toISOString(), kioskId: config.kioskId, userAgent: navigator.userAgent, name: "", ...input };
          await submitCheckIn(payload);
          return { status: "checked-in", station: payload.station };
        }
      });
    } catch (error) {
      console.warn("WebMCP tools were not registered:", error);
    }
  }

  registerWebMcpTools();

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(error => {
        console.warn("App installation support could not start:", error);
      });
    });
  }
})();
