# SiteSense AI — Your second set of eyes

A phone-friendly pre-task construction review: record a short clip, review selected moments with Gemini, combine structured detections with sourced reminders and weather context, and hear one briefing.

## Phone and desktop app

SiteSense is now an installable PWA with a responsive desktop workspace, mobile navigation, installation help, an offline app shell, and a device-local review notebook. Use the **Install app** button on a supported HTTPS deployment. Read [phone/desktop setup and deployment](docs/PHONE-AND-DESKTOP.md). No public deployment has been performed.

## Start here

Requires **Node.js 24.5+**.

```sh
cd /workspace/constuction
npm ci --ignore-scripts --cache /tmp/sitesense-npm-cache
npm start
```

The app runs on port 3000. `PORT` overrides it; `npm run dev` enables server watch mode. Demo mode, task checklists, simulations, and browser speech work without a model key. No build step is required.

For real analysis, copy `.env.example` to `.env` and set your Gemini API key locally, or inject `GEMINI_API_KEY` securely through your runtime. `GOOGLE_API_KEY` is also recognized. Never paste keys into chat or commit `.env`. Restart after changing settings.

| Setting | Default | Purpose |
| --- | --- | --- |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Photo / sampled-frame checks |
| `GEMINI_VIDEO_MODEL` | `gemini-3.8-flash` | Native agentic video via Interactions |
| `PORT` | `3000` | HTTP server |

Model defaults are configurable and do not establish access in your account. A real provider call has **not** been verified in this environment because no key is configured.

## Start without a key

Choose one of the three **scripted demo** cards: Roof edge, Poor visibility, or Eye protection unclear. No API access is needed. Each is a local illustration with a timestamped scenario, not analyzed footage. The same fixed reminder rules handle demo and model detections. Poor visibility explicitly abstains; unclear equipment stays unknown.

Choose a task, confirm your checks, change simulated conditions, and play or save the briefing. Selecting a real upload clears the scenario results. When automatic analysis is unavailable, the app keeps the upload unanalyzed and points back to the demo; it never silently assigns scripted detections to your footage.

## Live camera preview

Select **Open live camera** and allow camera permission. It works over HTTPS on phones and supported desktop browsers without any model key. **Switch camera** requests the other facing direction when your device supports it; it may use the same camera if no other camera is available. **Capture frame** freezes a local JPEG and stops the preview so you can prepare a separate review. No audio is requested and no frame is automatically uploaded. **Stop camera**, switching to a scenario/upload, leaving the page, or putting it in the background releases the preview stream. Reopen the camera when returning.

This is a live preview, not live AI hazard detection. Optional model analysis still requires configured API access and explicit upload permission. If camera permission is denied, allow it in the browser's site settings and retry, or use native photo/file upload. Desktop and mobile camera hardware behavior has not been physically tested; the automated tests use Chromium's fake camera.

Run `npm run test:camera` after installing the Playwright browser to repeat preview, switch, snapshot, permission-denial, stream cleanup and cancelled-request tests. It uses fake media and makes no model requests.

## The experience

1. Choose roofing or ladder access and verify the task checklist.
2. Use **Record a clip**, **Take a photo**, or **Upload footage**. Recording uses the environment-facing camera where available, excludes microphone audio, and stops at 30 seconds. In-browser recording requires a supported browser and a secure HTTPS context (localhost is also permitted). On a phone, plain HTTP over a laptop's LAN address usually cannot use in-browser camera recording; use native camera/file upload or serve through HTTPS.
3. Preview locally. Confirm permission to send each new upload to Google, then select **Analyze upload**.
4. Agentic mode sends the clip to Gemini's Interactions API with `processing: "agentic"`. The model selects relevant moments. Quick check sends four JPEG frames instead; photo mode sends one JPEG.
5. Review the timeline. Select a timestamp to seek the video. Confirmed processing traces and unconfirmed traces are labeled separately. Neither certifies complete clip coverage.
6. Retrieve an NWS forecast for US coordinates or explore clearly labeled simulated conditions.
7. Select **Hear my briefing** or **Stop audio**. Speech synthesis support and installed voices vary.
8. **Save review** downloads a JSON summary containing observations, model name, source links, conditions, worker confirmations, and the briefing. It contains no footage or API key.

Uploads support JPEG, PNG, WebP, MP4 and WebM. All files must be under 40 MB; agentic clips must additionally be at most **30 seconds and 14 MB**. Larger supported clips can use quick check. Some browser-recorded WebM files lack a finite duration when reuploaded; trim/export as MP4 if the app cannot read the duration.

## Grounding and uncertainty

Gemini returns only structured, timestamped `edgeProximity: {confidence, nearEdge}` and `ppeEye: {confidence, missingEyeProtection}` detections plus frame quality. Unknown is null. Out-of-view equipment is not evidence of absence. Ladder reminders are task-based; ladder detection has not been implemented.

The server validates types, confidence ranges, unique nonnegative timestamps and video bounds. It discards extra model fields, including model-authored advice. Poor quality forces unknown detections. `decideReminder()` chooses fixed verification wording with a prototype threshold of 0.8; model confidence is self-reported and is not measured accuracy or accident probability. Confident negative results never remove the task checklist or produce an all-clear.

Task reminders link to OSHA fall protection, ladders, PPE and heat topic pages. They are short summaries, not a full compliance checklist. Wind/temperature review thresholds are prototype rules, not regulatory stop-work limits. Follow current site procedures, training and supervisor instructions.

NWS returns an **hourly forecast**, not on-site measurements. Temperature is not heat index; forecast wind is not measured gusts. Rain is inferred from the summary, not a wet-surface sensor. Changing sliders switches back to simulation. Failed weather requests retain the prior conditions and display the failure.

## Privacy and network

Preview uses local object URLs. Analysis sends imagery/video to Google, including any audio already present in an uploaded clip. This application does not save footage on the server or log it. The Interactions request sets `store: false`; this is not a guarantee about provider abuse-monitoring or other retention. Review provider policies and obtain permission before filming coworkers.

Worker confirmations are stored locally per task. Reset them at the start of a new job; they are worker reports, not independently verified facts. Reports are downloaded only when requested.

Required HTTPS domains are `generativelanguage.googleapis.com` and `api.weather.gov`. Node startup honors environment proxy settings. The domains are saved in the onboarding configuration draft, but that does not apply or publish the policy. Live NWS requests remain blocked in the current instance.

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

The files are in this workspace at `/workspace/constuction`. No public app deployment has been performed. Chat ZIP downloads are not supported in this environment; previously generated artifact links should not be relied on. To download from GitHub, select the branch containing this project and choose Code → Download ZIP. Downloading the source does not deploy the app.
