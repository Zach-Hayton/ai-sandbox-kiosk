(() => {
  "use strict";

  const config = {
    mode: "demo", endpoint: "", inactivitySeconds: 75, warningSeconds: 10,
    successSeconds: 5, requireBaylorEmail: true, kioskId: "AI-SANDBOX-01",
    ...window.KIOSK_CONFIG
  };
  const byId = id => document.getElementById(id);
  const form = byId("checkinForm");
  const email = byId("email");
  const purpose = byId("purpose");
  const dialog = byId("timeoutDialog");
  const submit = byId("submitButton");
  const fullscreen = byId("fullscreenButton");
  let activeScreen = "idle";
  let inactivityTimer, warningTimer, successTimer;
  let request = null;
  let submission = null;
  let previousFocus;

  byId("modeIndicator").textContent = config.mode === "demo" ? "Demo · no data saved" : "Visitor check-in";

  function clearTimers() {
    clearTimeout(inactivityTimer);
    clearInterval(warningTimer);
    clearInterval(successTimer);
  }

  function showScreen(name) {
    clearTimers();
    dialog.close();
    for (const screen of ["idle", "form", "success"]) {
      byId(`${screen}Screen`).hidden = screen !== name;
    }
    activeScreen = name;
    if (name === "form") resetInactivityTimer();
  }

  function clearErrors() {
    for (const id of ["emailError", "purposeError", "stationError", "submitError"]) {
      byId(id).textContent = "";
    }
    form.querySelectorAll("[aria-invalid]").forEach(field => field.removeAttribute("aria-invalid"));
  }

  function clearForm() {
    form.reset();
    clearErrors();
    submission = null;
  }

  function setBusy(busy) {
    for (const control of form.elements) control.disabled = busy;
    byId("backButton").disabled = busy;
    form.setAttribute("aria-busy", String(busy));
    submit.querySelector("span").textContent = busy ? "Checking in…" : "Check in";
  }

  function returnToIdle() {
    request?.abort();
    request = null;
    setBusy(false);
    clearForm();
    showScreen("idle");
    byId("startButton").focus({ preventScroll: true });
  }

  function resetInactivityTimer() {
    if (activeScreen !== "form" || dialog.open || request) return;
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(showTimeoutWarning, Math.max(5, config.inactivitySeconds) * 1000);
  }

  function showTimeoutWarning() {
    let seconds = Math.max(3, config.warningSeconds);
    previousFocus = document.activeElement;
    byId("timeoutCountdown").textContent = seconds;
    dialog.showModal();
    byId("continueButton").focus();
    warningTimer = setInterval(() => {
      byId("timeoutCountdown").textContent = --seconds;
      if (seconds <= 0) returnToIdle();
    }, 1000);
  }

  function continueCheckIn() {
    clearInterval(warningTimer);
    dialog.close();
    resetInactivityTimer();
    (previousFocus || email).focus();
  }

  function validate() {
    clearErrors();
    email.value = email.value.trim().toLowerCase();
    const station = form.querySelector("input[name=station]:checked");
    if (!email.validity.valid) {
      byId("emailError").textContent = "Enter a valid email address.";
    } else if (config.requireBaylorEmail && !email.value.endsWith("@baylor.edu")) {
      byId("emailError").textContent = "Use your @baylor.edu email address.";
    }
    if (!purpose.value) byId("purposeError").textContent = "Choose the purpose of your visit.";
    if (!station) byId("stationError").textContent = "Choose the station you will use.";
    email.setAttribute("aria-invalid", String(Boolean(byId("emailError").textContent)));
    purpose.setAttribute("aria-invalid", String(Boolean(byId("purposeError").textContent)));
    form.querySelectorAll("input[name=station]").forEach(field => field.setAttribute("aria-invalid", String(!station)));
    const firstInvalid = form.querySelector('[aria-invalid="true"]');
    firstInvalid?.focus();
    return !firstInvalid;
  }

  function getSubmission() {
    const fields = Object.fromEntries(new FormData(form));
    fields.name = fields.name.trim();
    const fingerprint = JSON.stringify(fields);
    if (!submission || submission.fingerprint !== fingerprint) {
      submission = {
        fingerprint,
        key: crypto.randomUUID(),
        payload: { ...fields, timestamp: new Date().toISOString(), kioskId: config.kioskId }
      };
    }
    return submission;
  }

  async function sendSubmission(entry, signal) {
    if (config.mode === "demo") return;
    if (config.mode !== "live" || !config.endpoint) throw new Error("Check-in is not configured.");
    const endpoint = new URL(config.endpoint, location.href);
    if (endpoint.origin !== location.origin || !["https:", "http:"].includes(endpoint.protocol) || endpoint.username || endpoint.password) {
      throw new Error("Use a same-origin check-in endpoint.");
    }
    const response = await fetch(endpoint, {
      method: "POST",
      credentials: "same-origin",
      redirect: "error",
      cache: "no-store",
      headers: { "Content-Type": "application/json", "Idempotency-Key": entry.key },
      body: JSON.stringify(entry.payload),
      signal
    });
    if (!response.ok || (await response.json()).ok !== true) throw new Error("The server did not confirm the check-in.");
  }

  function showSuccess() {
    clearForm();
    showScreen("success");
    const demo = config.mode === "demo";
    byId("successScreen").querySelector(".section-label").textContent = demo ? "Demo complete" : "Check-in complete";
    byId("successTitle").textContent = demo ? "Demo complete." : "You’re all set.";
    byId("successMessage").textContent = demo ? "No information was sent or saved." : "Have a great session in the AI Sandbox.";
    byId("successTitle").focus({ preventScroll: true });
    let seconds = Math.max(1, config.successSeconds);
    byId("countdownNumber").textContent = seconds;
    successTimer = setInterval(() => {
      byId("countdownNumber").textContent = --seconds;
      if (seconds <= 0) returnToIdle();
    }, 1000);
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (request || dialog.open || activeScreen !== "form" || !validate()) return;
    const controller = new AbortController();
    request = controller;
    clearTimers();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const entry = getSubmission();
      setBusy(true);
      await sendSubmission(entry, controller.signal);
      if (request === controller) showSuccess();
    } catch {
      if (request === controller) {
        byId("submitError").textContent = "Check-in could not be confirmed. Try again or ask a staff member for help.";
      }
    } finally {
      clearTimeout(timeout);
      if (request === controller) {
        request = null;
        setBusy(false);
        resetInactivityTimer();
      }
    }
  });

  byId("startButton").addEventListener("click", () => {
    clearForm();
    showScreen("form");
    email.focus();
  });
  byId("backButton").addEventListener("click", returnToIdle);
  byId("continueButton").addEventListener("click", continueCheckIn);
  dialog.addEventListener("cancel", event => { event.preventDefault(); continueCheckIn(); });
  for (const event of ["pointerdown", "keydown", "input", "change"]) {
    document.addEventListener(event, resetInactivityTimer, { passive: true });
  }
  window.addEventListener("pagehide", returnToIdle);

  function updateFullscreenButton() {
    const active = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    fullscreen.setAttribute("aria-pressed", String(active));
    const label = active ? "Exit full screen" : "Full screen";
    fullscreen.setAttribute("aria-label", label);
    fullscreen.querySelector("span").textContent = label;
  }

  fullscreen.hidden = !(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  fullscreen.addEventListener("click", async () => {
    byId("fullscreenMessage").textContent = "";
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        await (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen).call(document.documentElement);
      }
    } catch {
      byId("fullscreenMessage").textContent = "Full screen is unavailable in this browser.";
    }
    updateFullscreenButton();
  });
  document.addEventListener("fullscreenchange", updateFullscreenButton);
  document.addEventListener("webkitfullscreenchange", updateFullscreenButton);
  updateFullscreenButton();

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
})();
