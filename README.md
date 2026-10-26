# L's Majong · 1.0.0

A quiet, ad-free Mahjong Solitaire garden for iPad and iPhone. Journey begins at Level 1 and remembers the active board after every pair. There are no lives, payments, accounts, trackers or required timers. Hints, undo and reshuffle are unlimited and free.

This is the initial FULL source release. No update-only ZIP is appropriate without a previous release baseline. `dist/` is the ready-built static site; the complete editable source, licensed donor inputs, import scripts, deterministic generation, validation and tests are also included.

## Play or develop locally

Install Node.js 22 or newer. The game has no runtime dependencies.

```sh
npm run build
npm run preview
```

Open the URL printed by the server (normally http://127.0.0.1:4173). A service worker needs localhost or HTTPS; opening index.html as a local file is not supported. `npm run dev` also serves the current production `dist/`; rerun the build after editing source. `PORT=8080` or `node scripts/serve.mjs 8080` selects another port.

For development tests:

```sh
npm ci
npm test
npm run validate:levels
npm run test:browser
npm run test:recovery
```

The browser suite uses an installed Chrome/Edge if available; alternatively install Playwright's Chromium (`npx playwright install chromium`). Set `QA_BROWSER` to select a browser explicitly. Read `docs/TEST-REPORT.md` for exactly which checks ran for this release, and the test script for supported environment overrides. Physical Apple hardware verification remains outstanding.

## Put it on GitHub and Vercel

1. Create a repository and upload the contents of this project folder to the repository root. Include `src/`, `assets/`, `data/`, `public/`, `scripts/`, `package.json`, `package-lock.json`, `vercel.json` and the licence notices. `node_modules` is unnecessary.
2. Import that repository in Vercel. The included configuration uses `npm run build` and output directory `dist`; there is no backend or environment secret to configure. Serve at the domain root, because the stable PWA identity, worker and offline URLs have root scope.
3. Open the HTTPS deployment. In Settings wait for **Ready to play offline** (all files verified). Then use Safari Share → Add to Home Screen on iPhone/iPad. Reopen once and check offline play with airplane mode before handing over the device.

The project has not been deployed to your account. Deployment protection/login pages must not replace game assets during installation. The worker refuses redirects, wrong MIME types or bytes that fail the release hash check; if installation does not complete, make the game deployment accessible and use Settings → Repair offline files or reopen on a reliable connection.

## Included content

- **5,200 generated and validated unique prebuilt Journey deals**, all bundled offline.
- **296 distinct playable board geometries**, deduplicated across translations, rotations and reflections. Actual sources and exclusions are in `docs/SOURCES.md`.
- A gentle opening: first 10 levels use 24–40 tiles, first 30 at most 60 tiles, first 60 at most 84 tiles, first 120 at most 120 tiles; later levels rotate through the larger library. Difficulty is a geometry/symbol-variety heuristic, not a measured human solve-time rating.
- Every initial deal has a winning witness. Both the original rules and the gameplay API replay every witness during validation; this guarantees a winning route exists, not that every legal choice wins.
- After Level 5,200, deterministic local generation continues from the bundled library without a download. These future boards are proved as they are created; no claim of advance validation or global uniqueness is made for the endless extension.
- Twenty-five coins per first completion. Replaying cannot mint repeated rewards. Coins unlock optional garden light, felt or tile colours only. The garden light variants use one original garden illustration with different colour treatments; they are not separate photographic scenes.

## Controls and recovery

Match tiles with identical symbols when nothing is above them and at least one horizontal side is open. Flowers match any flower; seasons match any season. Available tiles are highlighted by default. Pinch to zoom the board; drag when enlarged; +, − and Fit offer button equivalents. Keyboard users can Tab to tile buttons and press Enter/Space. Settings offers reduced motion, sound and free-tile highlighting. Smaller phones can enlarge dense boards; iPad landscape is the primary experience.

When no matching pair remains, use undo or free reshuffle. Reshuffle reassigns the remaining faces along a proven route. If the remaining geometry itself is impossible (for example two stacked tiles), it offers a fresh proven board on that same level and preserves Journey progress and coins. Undo history resets when reshuffling.

Saves use a versioned localStorage primary, previous good snapshot and nonblocking IndexedDB mirror. Corrupt data is quarantined rather than silently replaced. Storage failures are visible. Use Settings → Export backup to keep the board, undo history, progress, coins and cosmetics in a portable, SHA-256 checked JSON file. Restore validates the file, previews its progress and asks before replacing the device save. Raw emergency recovery data is diagnostic and is not an importable backup. Browser storage can be removed by the OS or by clearing website data; keep a backup in Files, especially before changing devices, hostname or browser.

## Offline and updates

One root-scoped service worker caches **the entire release**, including all 5,200 levels and every tile, during an atomic, hash-verified installation. A partial new release never replaces the last good cache. Gameplay is cache-first, including when the device claims to be online but its connection hangs. Version probes time out and pause for 90 seconds after failure. The app never waits for an update check to render or load a save.

Updates download quietly and wait. Settings → Save & use update activates a waiting version only after saving progress. Do not rename the PWA identity, hostname or save keys between releases. Previously open tabs retain their original cached assets; the update does not erase progress or recovery copies. Settings shows the app version and offers deep hash verification and repair. Deployment/CDN changes should preserve no-store headers on sw.js and build-info.json.

## Provenance and release

The engine is adapted from **tcottrill/myMahjong**, not written as an unrelated replacement. Its tile-free and matching rules, shuffle and remove-first/assign-pairs solvable-deal approach are retained, with deterministic generation, explicit state, strict validation and guaranteed recovery added. Traditional artwork is the foundation's FluffyStuff CC0 set and its eight custom public-domain flower/season symbols. The background and application icons are original vector artwork; untraceable upstream nature photographs and noncommercial donor art are not redistributed. No Blender assets were needed.

The combined project is **GPL-3.0-only**, with the full licence in LICENSE and component notices under licences/. Several components have more permissive licences; see `docs/SOURCES.md` for every source revision and the individual asset/layout terms. Preserve those notices and make corresponding source available if distributing a modified version.

`npm run generate:levels` rebuilds deals from the included layouts. `node scripts/import-layouts.mjs` rebuilds the layout catalogue from the vendored donor snapshots. These steps do not require live donor repositories. `npm run validate:levels` writes the actual validation report and checks uniqueness, rule legality, geometry, parity and deterministic reproduction. Source and prebuilt content are included so future maintainers can audit and reproduce them.

`npm run release` rebuilds and writes the initial FULL ZIP plus SHA-256 verification. Subsequent update-only releases must be computed against the exact previous FULL ZIP and verified by reconstructing its replacement; this initial release intentionally supplies no fabricated incremental archive.
