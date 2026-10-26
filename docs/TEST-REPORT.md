# Test report — L's Majong 1.0.0

Test date: 26 October 2026. Tested production build: `1.0.0-1e0f442813ba9db6`. Browser: installed Google Chrome `156.0.8078.47`, headless, with isolated profiles on Windows. Tests used an actual local HTTP server and actual browser service workers. No production service was deployed.

## Results

- **11/11 primary browser scenario groups passed.** The backup scenario verified the exact UI-generated JSON Blob and its restore; the environment canceled disk downloads, as detailed below.
- **5/5 recovery browser scenarios passed.**
- **34/34 Node tests passed**, covering gameplay, save validation/recovery and service-worker failure cases.
- **5,200/5,200 stored deals validated**, across **296** distinct board shapes, with **665,598** tile removals replayed. `data/validation-report.json` records the complete content checks and content digest. This validates initial deals; arbitrary player choices can still need the free reshuffle.
- **64/64 production core resources** passed browser cache SHA-256 verification. No optional media remained to download. No external runtime requests or uncaught application errors occurred in the primary suite.

## Original-game baseline

Before modifying the original myMahjong source, Chrome opened it from file:// and later from a local HTTP server. The test clicked Simple from its rendered canvas menu, removed a free matching pair (72 to 70 active tiles), clicked Undo (70 to 72), requested a two-tile hint, and shuffled while retaining all 72 tiles and an available pair. No uncaught page errors occurred. A 1440×1000 screenshot was visually inspected. The traditional tile art, stacked depth and original matching/free-tile rules informed the adaptation.

The first HTTP attempt was blocked by the tool's network boundary. After a scoped permission grant, HTTP tests ran successfully. That initial restriction is not reported as a game defect.

## Executed gameplay and save checks

The primary browser suite clicked rendered tile buttons to finish all 12 pairs in Level 1. It checked the 25-coin reward, Level 2 unlock, completion reload without another reward, Next Level, a Level 2 pair, and exact partial-board recovery after reload. It also checked blocked tiles, mismatched tiles, matching, undo, hint highlights, and reshuffle without any coin charge.

An earned 25-coin garden background purchase changed cosmetics and the coin balance while leaving the current game unchanged. A backup generated through the Settings UI was restored through the actual file input and confirmation dialog; every saved field matched. A tampered backup failed its checksum and preserved current progress.

The recovery suite separately verified that two corrupt save slots remain intact and quarantined, startup tools do not throw on a recovery screen, the emergency export Blob contains the original raw values, confirmed restore returns to a normal board and initializes a verified service worker, quota denial remains playable with a visible save warning, and a corrupt primary resumes its previous good copy.

## Executed offline and update checks

After the complete initial install, Chromium network emulation was set offline, the tab was closed, and a fresh tab reopened the game from the service-worker cache. The saved board was identical, and a further pair could be played offline.

A separate fake-online test kept `navigator.onLine` true while the server accepted requests without replying. Cached game startup completed in **481 ms**. A manual update attempt stopped after **3,017 ms**; an immediate second attempt created **zero** additional probes, confirming the 90-second cooldown path.

A deliberately broken release returned HTML where a JavaScript resource was required. Its actual browser worker became redundant, the incomplete new cache was removed, the previous verified cache remained complete, and the old game stayed playable. A valid synthetic update then downloaded without activation, waited for the user-facing save-and-update action, reloaded with identical progress, and kept an already-open old tab on its original asset bytes. These update variants existed only in the isolated test server.

Node regressions additionally cover stalled response bodies and stalled digest deadlines, redirect rejection, atomic install failure, cache corruption/repair, and deterministic cold-worker cache replay. The browser new-tab test does not claim a physical device force-close/relaunch or a browser-process cold restart.

## Responsive and interaction checks

| Surface simulated in Chrome | Viewport | Result |
| --- | --- | --- |
| Desktop | 1440×1000 | Playable board and complete journey flow |
| iPad landscape | 1180×820 | No overflow; key controls within viewport and at least 44 CSS px |
| iPhone portrait | 390×844 | No overflow; key controls within viewport and at least 44 CSS px |
| iPhone landscape | 844×390 | Side controls fit; key controls within viewport and at least 44 CSS px |

Each mobile viewport passed CDP two-finger pinch, enlarged-board pan, no unintended game move after the gesture, double-tap without page-scale change, and scoped selection/context-menu/image-drag guards. Each also restored a valid Level 121 fixture containing 144 tiles and verified that its complete board fit the viewport. Dense boards have smaller tiles at Fit on phones; the working pinch and zoom controls provide enlargement. These fixture checks do not imply that Level 121 was reached by completing earlier levels during browser QA.

Screenshots in `docs/screenshots/` were visually inspected. Dense-board captures include the temporary restore confirmation toast, which fades during normal play.

## Reproduction

From the project root:

```sh
npm install
npm run build
npm test
npm run validate:levels
npm run test:browser
npm run test:recovery
```

The browser scripts use `@playwright/test`. On Windows they default to installed Chrome. Set `QA_BROWSER` to another Chromium executable if necessary. Set `QA_ARTIFACTS` to choose the primary suite's screenshot/report destination. `PLAYWRIGHT_MODULE` can point at an already-installed Playwright module in a managed tool environment. Machine-readable results are retained in `docs/qa-results/`.

## Remaining verification

- **Physical iPhone, iPad, Safari and installed Apple Home Screen PWA were not available.** Chromium viewport/touch emulation does not verify Safari gestures, Apple safe-area/status-bar treatment, real airplane-mode force-close/reopen, or operating-system accessibility zoom. Follow `docs/APPLE-DEVICE-CHECKLIST.md` on real devices before claiming those behaviours are verified.
- **Actual device download saving is unverified.** This execution environment canceled both the app's backup download and a minimal independent Blob download, even with an allowed workspace download directory. The exact UI-generated backup bytes and successful restore were verified; a downloaded file being saved to Files was not.
- Microsoft Edge was attempted twice but could not launch under this environment's elevation/temp-profile restrictions. No Edge rendering result is claimed. Firefox was not tested.
- Real storage eviction over days, a genuinely full device, private-mode variations, installed-PWA upgrades on Safari, a published Vercel deployment and actual weak cellular networks remain manual checks. The app has no backend or remote save dependency.
