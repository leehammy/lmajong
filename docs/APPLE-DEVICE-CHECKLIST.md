# Apple device acceptance checklist

The release has been tested in Chromium at iPad/iPhone viewport sizes and with emulated touch. The following physical-device checks remain unverified. Use a spare test installation and export any valuable save first.

1. Deploy at an HTTPS domain root. Open Safari on an iPad in landscape, let the initial board load, and open Settings. Wait for **Ready to play offline**. Check the displayed version is 1.0.0.
2. Use Share → Add to Home Screen. Open the installed icon. Check the title, icon, safe-area edges and status bar in both orientations. The early iOS edge treatment is a best-effort workaround, not a guarantee about every iOS version.
3. Match a pair, enable airplane mode, close the game, then reopen its Home Screen icon. Confirm the exact board resumes and hints, undo, reshuffle and Next Level work offline.
4. Repeat the install, offline relaunch and partial-board resume on iPhone in portrait and landscape. Check for clipped controls or browser chrome. Use +/−/Fit on a larger board; all symbols should remain clear when enlarged.
5. Tap rapidly and double-tap buttons; long-press tile art. Confirm there is no accidental page zoom, image drag, text selection or context menu. Pinch with two fingers to enlarge the board and drag to pan. A pinch/pan should not remove a tile.
6. Turn on VoiceOver or a hardware keyboard if relevant to the player. Check tile labels, button focus and modal close/return behavior. The game offers labelled native controls but does not claim a fully nonvisual play experience.
7. Turn on Reduce Motion and gentle sounds in Settings. Check motion stops, sounds respect the setting, and sound still works after backgrounding/resuming.
8. Export a backup through Settings and save the JSON in Files. Change a cosmetic or play a few pairs, then restore the earlier JSON. Confirm the restoration preview, coins, active tiles, undo state and cosmetics match the exported state. Actual saving of a browser download could not be verified in the restricted headless test environment.
9. Reconnect after offline play. Confirm there is no loss of progress. On a future test release, keep a board open while new files deploy: the current game should remain usable, an update should wait in Settings, and **Save & use update** should preserve that board after reload.
10. Reopen after a day and after normal device restarts. Keep a separate backup before clearing Safari website data, changing hostname/browser, or relying on long-term OS storage retention. Real OS eviction and full storage conditions remain unverified on hardware.

Record device model, iOS/iPadOS version, Safari/Home Screen mode and any failures with a screenshot before calling the physical-device matrix complete. There is no backend or account-based cloud recovery.
