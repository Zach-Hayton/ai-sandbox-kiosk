# AI Sandbox check-in

Static HTML, CSS, and JavaScript for the Hankamer AI Sandbox kiosk. No build step or external libraries.

Serve this folder over HTTPS from Baylor infrastructure. `index.html` is the entry point; keep the accompanying files beside it. The default demo mode sends and saves nothing.

To enable check-ins, set `mode` to `"live"` and `endpoint` to a same-origin POST path in `config.js`. The Baylor server must validate the fields, store the record, and return JSON `{ "ok": true }` only after saving. Errors should return a non-2xx status. Requests time out after 15 seconds and are not retried automatically.

The JSON request contains `timestamp` (ISO UTC), `kioskId`, `email`, `name` (optional), `purpose`, and `station` (`"1"`–`"4"`). Use server time for the authoritative receipt timestamp. Accept an `Idempotency-Key` header and deduplicate retries by that key to avoid recording a visit twice after an interrupted response.

Configure server access and storage permissions through Baylor IT. Student records must stay on Baylor infrastructure. The client does not write visitor data to browser storage or logs; fields clear after success, cancellation, or inactivity. A failed request may already have reached the server, so verify its result before resubmitting a changed form.

The remaining settings control inactivity, warning and confirmation timing, the Baylor email requirement, and the kiosk identifier. Full screen is a display option; device/browser lockdown is configured separately.
