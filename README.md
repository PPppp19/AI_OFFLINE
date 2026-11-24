# Ton AI Offline

React + Vite PWA prototype for local AI chat on iPhone Safari.

## What it does

- Runs a language model in the browser using WebLLM/WebGPU.
- No API key and no AI server.
- Chat history exists only in React memory; refreshing or closing the page clears it.
- The service worker caches the app shell. WebLLM separately caches model assets in browser storage.
- GitHub Pages deployment workflow included.

## Important iPhone note

This is a real-device prototype, not a guarantee that every iPhone/Safari combination can run every model. Local inference requires WebGPU and enough available memory. Start with the 1.5B model; if Safari reloads or fails during initialization, try the 0.5B model. Keep Safari open while the model initializes and avoid Low Power Mode during first load.

The first model download requires internet and may be large. Once it has completed and the browser has retained its model cache, enable Airplane Mode and test again. iOS may evict browser storage under storage pressure, so do not treat the browser cache as permanent archival storage.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the local HTTPS deployment or localhost in a WebGPU-capable browser.

## Deploy to GitHub Pages

1. Create a GitHub repository and push this project to the `main` branch.
2. In GitHub, open **Settings → Pages**.
3. Set **Build and deployment → Source** to **GitHub Actions**.
4. Push to `main` or run the workflow manually from **Actions**.
5. Open the published Pages URL in Safari on iPhone.

Vite is configured with `base: "./"` so it can be hosted under a repository path.

## Add to iPhone Home Screen

1. Open the published URL in Safari (not an in-app browser).
2. Tap Share.
3. Choose **Add to Home Screen**.
4. Open Ton AI from the Home Screen.

## Offline acceptance test

1. Open Ton AI online.
2. Tap **ดาวน์โหลดและเริ่มใช้งาน** and wait until the model is ready.
3. Send a test prompt and wait for a complete answer.
4. Close the tab or return to the Home Screen.
5. Enable Airplane Mode.
6. Reopen Ton AI and test a new prompt.
7. If it cannot reopen or the model must download again, the browser did not retain the required files; repeat after checking free storage and Safari settings.

## Privacy and limitations

- Chat messages are not saved to localStorage or IndexedDB by this app.
- Model files may be stored by WebLLM in browser-managed storage.
- No internet search, current news, or remote knowledge retrieval is available while offline.
- The app shell is cached by the service worker; model caching is managed separately by WebLLM.
- The app imports Google Fonts in CSS for visual styling. If offline, the system font is used as fallback; AI inference does not depend on Google Fonts.
- Do not enter sensitive information into an experimental local model unless you have reviewed the model/runtime behavior yourself.

## Troubleshooting

- **WebGPU unavailable:** update iOS/Safari and verify `navigator.gpu` is available. If unavailable, this WebLLM build cannot run local inference.
- **Tab closes during model load:** try the 0.5B model, close other tabs, free device storage, and retry.
- **Offline app opens but model is missing:** the model cache may have been evicted by iOS. Reconnect and download again.
- **GitHub Pages shows 404:** confirm Pages source is GitHub Actions and the latest workflow run succeeded.
