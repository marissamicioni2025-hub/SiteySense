# SiteySense AI — Your second set of eyes

A phone-friendly pre-task construction review: record a short clip, review selected moments with Gemini, combine structured detections with sourced reminders and weather context, and hear one briefing.

## Phone and desktop app

SiteySense is now an installable PWA with a responsive desktop workspace, mobile navigation, installation help, an offline app shell, and a device-local review notebook. Use the **Install app** button on a supported HTTPS deployment. Read [phone/desktop setup and deployment](docs/PHONE-AND-DESKTOP.md). The user’s Render URL is https://siteysense.onrender.com. Its live version could not be inspected from this environment because network requests were blocked; a GitHub push is not proof that Render deployed it.

## Start here

Requires **Node.js 24.5+**.

```sh
cd /workspace/constuction
npm ci --ignore-scripts --cache /tmp/sitesense-npm-cache
npm start
```

The app runs on port 3000. `PORT` overrides it; `npm run dev` enables server watch mode. Example walkthroughs, live camera preview, task checklists, simulations, and browser speech work without a model key. No build step is required.

For real analysis, copy `.env.example` to `.env` and set your Gemini API key locally, or inject `GEMINI_API_KEY` securely through your runtime. `GOOGLE_API_KEY` is also recognized. Never paste keys into chat or commit `.env`. Restart after changing settings.

| Setting | Default | Purpose |
| --- | --- | --- |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Photo / sampled-frame checks |
| `GEMINI_VIDEO_MODEL` | `gemini-3.8-flash` | Native agentic video via Interactions |
| `PORT` | `3000` | HTTP server |

Model defaults are configurable and do not establish access in your account. A real provider call has **not** been verified in this environment because no key is configured.

## Start without a key

The app opens in your workspace, without example detections. Choose a task and open the live camera, or expand **How it works · explore an example** and choose a clearly scripted example: Roof edge, Poor visibility, or Eye protection unclear. No API access is needed. Each is a local illustration with a timestamped scenario, not analyzed footage. The same fixed reminder rules handle demo and model detections. Poor visibility explicitly abstains; unclear equipment stays unknown.

Choose a task, confirm your checks, change simulated conditions, and play or save the briefing. Selecting a real upload clears the scenario results. When automatic analysis is unavailable, the app keeps the upload unanalyzed and points back to the demo; it never silently assigns scripted detections to your footage.

## Live camera preview

Select **Open live camera** and allow camera permission. It works over HTTPS on phones and supported desktop browsers without any model key. **Switch camera** requests the other facing direction when your device supports it; it may use the same camera if no other camera is available. **Capture frame** freezes a local JPEG and stops the preview so you can prepare a separate review. No audio is requested and no frame is automatically uploaded. **Stop camera**, switching to a scenario/upload, leaving the page, or putting it in the background releases the preview stream. Reopen the camera when returning.

This is a live preview, not live AI hazard detection. Optional model analysis still requires configured API access and explicit upload permission. If camera permission is denied, allow it in the browser's site settings and retry, or use native photo/file upload. Desktop and mobile camera hardware behavior has not been physically tested; the automated tests use Chromium's fake camera.

Run `npm run test:camera` after installing the Playwright browser to repeat preview, switch, snapshot, permission-denial, stream cleanup and cancelled-request tests. It uses fake media and makes no model requests.

## The experience

1. Choose one of ten construction task groups and verify the task checklist. This selection is user-provided context, not camera task recognition.
2. Use **Record a clip**, **Take a photo**, or **Upload footage**. Recording uses the environment-facing camera where available, excludes microphone audio, and stops at 30 seconds. In-browser recording requires a supported browser and a secure HTTPS context (localhost is also permitted). On a phone, plain HTTP over a laptop's LAN address usually cannot use in-browser camera recording; use native camera/file upload or serve through HTTPS.
3. Preview locally. Confirm permission to send each new upload to Google, then select **Analyze upload**.
4. Agentic mode sends the clip to Gemini's Interactions API with `processing: "agentic"`. The model selects relevant moments. Quick check sends four JPEG frames instead; photo mode sends one JPEG.
5. Review the timeline. Select a timestamp to seek the video. Confirmed processing traces and unconfirmed traces are labeled separately. Neither certifies complete clip coverage.
6. Retrieve an NWS forecast for US coordinates or explore clearly labeled simulated conditions.
7. Select **Hear my briefing** or **Stop audio**. Speech synthesis support and installed voices vary.
8. **Save review** downloads a JSON summary containing observations, model name, source links, conditions, worker confirmations, and the briefing. It contains no footage or API key.

Uploads support JPEG, PNG, WebP, MP4 and WebM. All files must be under 40 MB; agentic clips must additionally be at most **30 seconds and 14 MB**. Larger supported clips can use quick check. Some browser-recorded WebM files lack a finite duration when reuploaded; trim/export as MP4 if the app cannot read the duration.

## Grounding and uncertainty

Gemini returns only structured, timestamped `edgeProximity: {confidence, nearEdge}` and `ppeEye: {confidence, missingEyeProtection}` detections plus frame quality. Unknown is null. Out-of-view equipment is not evidence of absence. All ten task checklists are user-selected. Visual checks remain limited to edge proximity and eye-protection visibility; no new task detectors have been added.

The server validates types, confidence ranges, unique nonnegative timestamps and video bounds. It discards extra model fields, including model-authored advice. Poor quality forces unknown detections. `decideReminder()` chooses fixed verification wording with a prototype threshold of 0.8; model confidence is self-reported and is not measured accuracy or accident probability. Confident negative results never remove the task checklist or produce an all-clear.

Task reminders link to official OSHA topic pages for falls, ladders, scaffolds, PPE, heat, tools, silica/dust, noise, handling, excavations, vehicles, electrical hazards and housekeeping. Requests to all 15 referenced pages were blocked with proxy HTTP 403 during source checks on October 24, 2026. Review dates therefore remain null; the UI shows source review pending. These are conservative general verification prompts, not a freshly verified regulatory checklist or legal requirements. Wind/temperature review thresholds are prototype rules, not regulatory stop-work limits. Follow current site procedures, training and supervisor instructions.

NWS returns an **hourly forecast**, not on-site measurements. Temperature is not heat index; forecast wind is not measured gusts. Precipitation probability is shown only when supplied by NWS; an absent value is unknown. Forecast precipitation never sets the worker’s wet-surface report. No wet-surface sensor or heat-index calculation is implemented. Changing sliders switches back to simulation. Failed weather requests retain the prior conditions and display the failure.

## Privacy and network

Preview uses local object URLs. Analysis sends imagery/video to Google, including any audio already present in an uploaded clip. This application does not save footage on the server or log it. The Interactions request sets `store: false`; this is not a guarantee about provider abuse-monitoring or other retention. Review provider policies and obtain permission before filming coworkers.

Worker confirmations are stored locally per task. Reset them at the start of a new job; they are worker reports, not independently verified facts. Reports are downloaded only when requested.

Required HTTPS domains are `generativelanguage.googleapis.com` and `api.weather.gov`. Node startup honors environment proxy settings. The domains are saved in the onboarding configuration draft, but that does not apply or publish the policy. A live sample request for Gainesville, Florida successfully returned an NWS hourly forecast and alert availability during v0.3 validation. Earlier setup requests were blocked; connectivity can vary by runtime and location.

## Verified technical source

The official [Google Gemini video cookbook](https://github.com/google-gemini/cookbook/blob/main/quickstarts/Video_understanding.ipynb), retrieved October 24, 2026, documents native agentic processing through the Interactions API and lists `gemini-3.8-flash` among supported models. The pinned `@google/genai` 2.31.0 SDK exposes this request shape. It also exposes `processing_call` and `processing_result` steps. The app confirms a trace only when a result links to a returned call ID; it never displays raw thought content.

The notebook recommends static processing for short clips to reduce latency. Both paths are included so they can be compared. The pasted September 1 release date and “up to 88%” savings are not independently validated for this application. Do not claim competition recency eligibility or measured cost savings without a dated primary announcement and your own applicable evaluation.

## Validate and present

```sh
npm test
```

The automated tests cover HTTP routes, reminder rules, uncertain/invalid detections, weather mapping, the installed SDK's agentic request serialization, processing trace checks, malformed video output and timestamp bounds. Provider responses are mocked. Browser checks exercised upload permission, native video payloads, fake-device recording, playback, timeline seeking, report download, mobile layout, checklists and missing-key feedback. They do not establish detection accuracy or a successful live provider call.

See [the 90-second demo guide](docs/DEMO.md) and [evaluation worksheet](docs/evaluation.csv). No injury dataset, BLS incident matching, glasses integration, autonomous warning system, or clinical/child-learning experience is included.

Offline rules, checklists, simulation and saved reports were also exercised in a browser with the network disabled, including a full offline reload. Manifest/icon responses, install help, notebook download/reload/delete, and mobile/desktop layouts were checked. OS-level installation and a public HTTPS deployment remain unverified.

## Repeat the browser checks

Start the app in one terminal. In another, install the test browser once and run:

```sh
npx playwright install chromium
npm run test:browser
```

If Chromium is already installed, set `CHROMIUM_PATH` to its executable instead of installing another browser. The smoke runner defaults to the server on port 3000; `SITESENSE_URL` can select another origin. In a disposable Linux container that requires it, `CHROMIUM_NO_SANDBOX=1` supplies Chromium's no-sandbox flag. Do not use that flag for normal browsing.

The browser smoke test is credential-free and does not call a live model. It covers all three scenarios, briefings, upload isolation, no-key guidance, report privacy and persistence, offline reload, mobile/desktop layout, and install help. `npm test` separately checks structured provider request/response handling with mocks. Browser automation, mocked speech, and fake-camera tests do not establish physical-device camera compatibility or real spoken audio quality.

The files are in this workspace at `/workspace/constuction`. The currently deployed Render version has not been independently verified from this workspace. Chat ZIP downloads are not supported in this environment; previously generated artifact links should not be relied on. To download from GitHub, select the branch containing this project and choose Code → Download ZIP. Downloading the source does not deploy the app.

## Construction tasks and daily review

The selector includes roofing, ladders, scaffolds, power tools, material handling, excavations/trenches, moving equipment, electrical awareness, heat and housekeeping. `public/tasks.js` is the shared registry for task identifiers, checklist items, topic links and source/scope metadata. `public/safety.js` uses that registry for fixed reminders and briefings; the backend accepts the same task IDs.

Existing `sitesense-checks` and `sitesense-reviews-v1` storage keys intentionally remain unchanged after the SiteySense rename. Legacy numeric roofing/ladder confirmations retain their meanings and are read into stable checklist IDs. Other tasks have independent confirmations. Changing the selected task shows its prior confirmations; use **Start a fresh review** for a new job.

**Start a fresh review** clears the current task’s confirmations, camera/upload, previous visual results, and unsaved note. **Conditions changed? Recheck** clears the same review evidence and confirmations but keeps the unsaved note. Other tasks and saved summaries are not deleted. An optional note stays only in memory until **Save review**, then appears in the downloaded JSON and device-local notebook. It is never included in model requests. Switching tasks clears an unsaved note; do not include sensitive information.

## Finding the camera / updating Render

**Open live camera** appears in the page heading and at the top of Visual assessment, above the examples and illustration. It needs HTTPS and browser camera permission, not a Gemini key. The page shows App v0.3.0; `/api/status` also exposes the app version without credentials.

Render must deploy the `sitesense-app` branch. Check its latest deployment commit against GitHub. If automatic deployment did not run, choose Manual Deploy → Deploy latest commit. Changing account/deployment settings has not been performed by this update. After a successful deployment, reload the app. If an old offline shell remains open, use the update banner’s **Reload latest version**, or Install app → **Check for app updates**, then reload. An already installed app may also need to be closed and reopened. Do not clear all site data just to update if you want to preserve local reviews.

The update banner appears when a new service worker takes control. Cache prefix and PWA identity remain stable to preserve app identity and allow old shell cleanup; public assets use a new versioned shell. APIs and uploads are never cached.

Run `npm run test:tasks` for task switching, source/scope metadata, old stored-data compatibility, note opt-in/export, fresh review/recheck and mobile/desktop checks. It requires the app to be running and a Playwright browser, just like the other browser runners.

## Dashboard v0.3

The dashboard puts **Today’s task**, **Weather conditions**, **Needs attention**, and **Before you start** ahead of the detailed camera review and resource library. Red/charcoal styling is retained. Examples stay in How it works; they never become actual camera results. The resource library groups the selected task’s OSHA references and links to official NIOSH and NWS portals. Source review remains pending where access is blocked, and no fatality statistics have been added.

### Weather and location

Weather starts **unavailable**, not with assumed normal conditions. Use **Use my location** to request browser permission, or enter coordinates manually. No automatic location prompt or forecast request runs. Geolocation is rounded to three decimals for the request; manual inputs stay in memory/DOM. Coordinates are sent to this server and NWS, but are not written to local review storage or exported summaries. Browser/network access logs outside the app may contain request URLs. The app does not log coordinates itself. Forecast location uses the provider’s city/state when present; only US NWS coverage is supported.

The server requests point metadata, the current/upcoming hourly forecast and active alerts. Forecast and alert failures are distinguished: an alert failure does not discard a valid forecast. Wind ranges display the upper forecast value in mph; that is not a measured gust. Humidity and precipitation probability remain unknown if missing. No heat index is calculated. Forecast periods, update times, source links and stale/unknown-age messages are visible. A three-hour update-age cutoff marks forecasts stale for this prototype; it is not an official safety rule. Alert age over ten minutes or unknown is explicitly marked for refresh, and expired/cancelled/exercise alerts are excluded.

Some weather-related event names are tagged as potentially relevant to outdoor planning. Other local alerts are still shown with relevance unestablished. Neither the provider alert nor this relevance tag is a site risk assessment. Follow official instructions and the site plan. Changing any what-if control removes forecast/alert context from that scenario and labels all values simulated. The **Worker report: surface condition** selector is independent: rain probability never means a roof is actually wet.

### Attention factors

`public/attention.js` produces traceable items from the selected task, forecast/simulation provenance, alert status, worker confirmations and validated model/example views. Each includes evidence, source, time when available, task relevance, action, and classification. Only the first three are expanded by default. Review required, Cannot verify, Information unavailable and No additional reminder triggered are not safety certifications or accident probabilities. Wind at 20 mph and temperature at 80°F are explicitly prototype reminder triggers, not regulatory work limits. Missing data never becomes a normal-condition assertion. A worker’s confirmed checklist does not certify camera observations or fall protection.

### Prepared experimental visual checks

`public/visual-checks.js` defines exactly three additions: relevant work area visible, apparent opening/skylight visible, and object overlapping a visible access route. Shared definitions generate both API schemas and the validation/reminder/fixture logic. Non-null results require clear visibility, a matching evidence code and a sufficient self-reported score; a score alone is insufficient. Partial/out-of-view/unknown or poor-quality evidence becomes unknown. Unknown work area suppresses positive opening/route conclusions. None establish cover strength, compliance, exact distances, worker qualifications or future injuries.

The checks are **off by default**. `GEMINI_EXTENDED_CHECKS=true` opts a later authorized model evaluation into the extra schema on photo and native agentic paths. The default validator strips those fields. Tests use scripted fixtures and mocked provider responses. No real-world detection accuracy, live model access or physical-device compatibility has been established. Prepared check descriptions are visible under Camera review so the interface does not imply they are already running.

### Test commands

With the app running and a Playwright Chromium browser available:

```sh
npm test
npm run test:browser
npm run test:camera
npm run test:tasks
npm run test:weather
```

The weather browser suite mocks geolocation/forecast data, tests permission denial/manual fallback, alert display, stale/failure states, precipitation versus observed wetness, simulation isolation and coordinate-free exports. The unit suites test forecast mapping, event filtering, attention traceability and both experimental provider request shapes. The mocked tests are not evidence of live provider access. Separately, one real NWS request through the running server returned a valid Gainesville hourly forecast and available alert results (zero active alerts). Live Gemini access is still unverified.

The Docker image now includes `weather.js`. Docker/Render deployment has not been executed by this change. Deploy the pushed `sitesense-app` commit and look for **App v0.3.0**; a successful push does not prove Render is live.

## Click-through examples

Examples now use titles such as **Example of an edge review**. Select an example and use Previous/Next or its step buttons to move through “Show the work area”, “Understand the observation”, and “Verify the precaution”. They are illustrated walkthroughs, not video files, so the old non-playing 3/6/9-second labels have been removed. Actual uploaded-video reviews retain real timestamp seeking. Switching to a camera or upload hides the example player and clears example results.

Live camera preview is separate from live model analysis. An authorized Gemini key enables the existing photo/clip analysis paths; continuous periodic live-frame checks are not implemented by simply adding a key. Such a workflow still needs explicit upload permission, start/stop controls, bounded request frequency, one in-flight request, stale-result timestamps, cancellation and evaluation on real footage. No continuous AI monitoring or safety certification is claimed.
