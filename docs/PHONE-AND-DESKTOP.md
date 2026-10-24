# Use SiteSense as an app

SiteSense is a Progressive Web App (PWA), built with HTML, CSS, browser JavaScript and a Node.js API backend. The same app adapts to a phone, tablet or desktop. Supported browsers can install it without an app store.

## Run the complete project

Install Node.js 24.5 or newer, open a terminal in the project folder, then run:

```sh
npm ci --ignore-scripts
npm start
```

Open the server on port 3000 in your desktop browser. The demo runs without an API key. For real Gemini analysis, copy `.env.example` to `.env`, set your own key there, and restart the server. Never commit or upload `.env` to a public repository.

The project has no frontend build step. Edit `public/index.html`, `public/style.css`, or `public/app.js`. `public/platform.js` handles install prompts, connectivity and the notebook. `public/safety.js` and `public/reminders.js` contain shared deterministic rules. `server.js` and `vision.js` provide weather and Gemini requests while keeping keys server-side.

## Put it on a phone

For normal phone use, host the Node server at an **HTTPS address**. Use a Node-capable hosting service with its HTTPS/custom-domain support. Set the service's start command to `npm start`, install command to `npm ci --ignore-scripts`, and inject your API key through its secure environment settings. Preserve the service's `PORT` variable. Hosting requires a deployment account; it has not been performed for you.

On a trusted local network you can also reach a running computer's server using its LAN IP and port 3000. Plain LAN HTTP generally will not support PWA installation, offline service workers or in-browser recording. Native file/photo upload is the fallback. Do not confuse a phone's localhost with the computer running the server.

The app cannot keep model secrets in a static HTML host. Deploy the Node backend along with `public/`, at the same HTTPS origin. Access to Gemini and NWS must be allowed by the server's network policy. Protect a shared/public deployment with your hosting platform's access controls and usage limits before handing out the link; this project has no user accounts or server-side quota system.

## Connect your camera

On your HTTPS app, choose **Open live camera** → allow the browser's camera permission. Use **Switch camera**, **Capture frame**, or **Stop camera**. Capture creates a local photo for a separate review; the live preview never automatically uploads frames or runs model analysis. It needs no Gemini key. If you switch away from the app, the preview stops for privacy; open it again to reconnect. If permission is denied, use the browser's site permissions to allow Camera, then retry. On iPhone, also check camera permissions for Safari in device settings. Native photo upload remains a fallback.

## Install

- **iPhone / iPad:** Open the HTTPS app in Safari, tap Share, then Add to Home Screen (or the equivalent option provided by your browser version).
- **Android:** Open in Chrome, then choose Install app or Add to Home screen from its menu.
- **Desktop:** In Chrome or Edge, use the install icon in the address bar or the browser's app menu when offered.
- The app's **Install app** button provides these instructions and invokes the native prompt when the browser makes one available. Some browsers support browsing but not installation.

The installed app opens in its own window. Live model/weather requests still need the Node server and an internet connection.

## Offline

Visit the app once online and let its service worker finish preparing the shell. Later, the installed/cached app can reopen offline. Task reminders, checklists, simulations, text briefings and saved reviews work locally. Speech synthesis depends on the device's installed voices and browser; some voices need connectivity. Camera support depends on the browser and secure context.

AI/video analysis and new forecasts do not work offline. They are never simulated silently. The service worker caches only known public app assets and never intercepts/caches API requests, POSTs, uploaded footage, or external services.

Checklists and up to 12 saved review summaries are stored in this browser/device. They do not sync across devices. Choose **Save review** to save locally and download JSON. Open **Saved reviews** on desktop or **Saved** on mobile to inspect/download summaries or clear the notebook. Use Reset confirmations separately to clear the current task checklist. Private browsing/storage policies may disable persistence.

## Optional container deployment

A Dockerfile is included, but a Docker build has not been run in this environment.

```sh
docker build -t sitesense .
docker run --rm -p 3000:3000 --env-file .env sitesense
```

Put an HTTPS reverse proxy or your hosting platform's HTTPS endpoint in front of this container for phone installation and camera use. `.env` is excluded from the image. `node_modules` is installed from the lockfile inside the container.

## Updating the app

When changing offline shell assets for a release, increment `CACHE` in `public/sw.js`. The new service worker installs the complete asset list and removes only old SiteSense shell caches. Reload after the update. Clearing the browser's site data also removes locally saved reviews and confirmations, so download them first if needed.
