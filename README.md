# AI Sandbox Touchscreen Check-In

A no-build, single-page check-in kiosk designed for a portrait touchscreen. This package is preconfigured with the supplied Google Apps Script deployment URL.

## Test it now

Open `index.html` in a browser and tap **Tap to check in**. This packaged version is in live mode, so completed check-ins are sent to the configured Google Apps Script URL once that deployment allows anonymous kiosk access.

For the most accurate test, serve this folder from any small local web server. The deployed version does not need a server or build process.

## Connect a Google Sheet (about 5 minutes)

1. Create or open the Google Sheet that should store check-ins.
2. In the Sheet, choose **Extensions → Apps Script**.
3. Replace the editor contents with everything from `google-apps-script.gs`, then save.
4. Click **Deploy → New deployment**.
5. Choose **Web app**. Set **Execute as** to **Me** and **Who has access** to **Anyone**. Because the kiosk does not sign in to Google, options such as **Anyone with a Google account** will not work reliably. If **Anyone** is unavailable, your Google Workspace administrator must allow anonymous Apps Script web apps or you will need a different endpoint.
6. Deploy, approve the requested Sheet permission, and copy the Web app URL ending in `/exec`.
7. Open `config.js` and change:

```js
mode: "google-apps-script",
endpoint: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec",
```

The script creates a `Check-ins` tab and adds the header row the first time it receives a valid submission.

The supplied ZIP already contains the deployment URL provided on September 11, 2026, so these connection steps only need to be repeated if that Apps Script deployment is replaced.

> Important: after changing the Apps Script code later, create a new deployment version. Editing the code alone does not update an existing web-app deployment.

## Use another POST endpoint

In `config.js`, set `mode` to `"generic"` and set `endpoint` to your URL. The app sends JSON like:

```json
{
  "timestamp": "2026-09-11T14:30:00.000Z",
  "kioskId": "AI-SANDBOX-01",
  "email": "visitor@baylor.edu",
  "name": "Optional Name",
  "purpose": "Explore AI tools",
  "station": "2",
  "userAgent": "browser information"
}
```

Your endpoint must accept cross-origin requests from the site’s domain and reply with a successful HTTP status.

## Deploy with GitHub Pages

1. Create a new GitHub repository, such as `ai-sandbox-checkin`.
2. Upload all files in this folder to the repository root, then commit them.
3. Open the repository’s **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and the `/(root)` folder, then save.
6. GitHub will show the public kiosk URL after the deployment finishes. Open that URL on the touchscreen.

Whenever you update a file on `main`, GitHub Pages redeploys automatically.

## Deploy with Cloudflare Pages

1. In the Cloudflare dashboard, open **Workers & Pages → Create → Pages → Connect to Git**.
2. Choose the repository containing these files.
3. Use these build settings:
   - Framework preset: **None**
   - Build command: leave blank
   - Build output directory: `/`
4. Save and deploy. Cloudflare will provide a `pages.dev` URL.

You can also use **Direct Upload**: create a Pages project and upload this entire folder (or the provided ZIP after extracting it). No build command is needed.

## Kiosk configuration

All common settings are near the top of `config.js`:

- `inactivitySeconds`: seconds before the privacy warning appears (default 75)
- `warningSeconds`: warning countdown before the form clears (default 10)
- `successSeconds`: confirmation screen duration (default 5)
- `requireBaylorEmail`: set to `false` to accept any valid email address
- `kioskId`: useful when several kiosks send to the same Sheet

For the Android display, open the deployed URL in a browser and enable its full-screen or kiosk mode. Configure that browser as the home/startup app if the device permits it. Test the on-screen keyboard, one real Sheet submission, the 5-second reset, and the inactivity reset before removing the paper sign-in sheet.

## Privacy and operation notes

- The visible form is reset after a successful submission, on inactivity, and when returning to the welcome screen.
- Demo mode does not persist the entered email or name.
- A live endpoint necessarily stores submitted data; limit Sheet access to staff who need it and follow Baylor’s data-handling requirements.
- Static hosting is cached. After updating `config.js`, refresh the kiosk browser and, if needed, clear its site cache.
- The interface is an original CSS approximation inspired by the provided signage; it does not include copied logos or proprietary artwork.

## Install full-screen on the Android kiosk

After deploying the latest files to GitHub Pages:

1. Open the GitHub Pages URL in Chrome on the kiosk.
2. Open Chrome's three-dot menu and choose **Install app** or **Add to Home screen**.
3. If Android offers **Install**, choose it rather than creating a plain bookmark shortcut.
4. Return to the Android home screen and open **AI Check-In** using its new icon. It launches in full-screen portrait mode without Chrome's address bar.
5. Complete a real check-in and confirm that a new row appears in the Sheet.
6. Optionally enable Android **App pinning** under **Settings → Security → More security settings → App pinning**, then pin AI Check-In from the recent-apps screen. Require the device PIN to unpin it.

Chrome may need one refresh after GitHub finishes deploying before the install option appears. Reinstall the app after major hosting-URL changes.
