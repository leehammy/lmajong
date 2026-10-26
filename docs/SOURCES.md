# Source and licensing record

The runtime uses **one Mahjong engine**, extracted and adapted from [tcottrill/myMahjong](https://github.com/tcottrill/myMahjong). Donors supply geometry or artwork; their game engines are not used in the shipped game. Original donor files in `vendor/layout-sources` are conversion/audit inputs and do not load in the game.

This combined release is distributed under **GPL-3.0-only**, with the full text in `LICENSE`. Original public-domain, MIT and GPL notices remain applicable to their respective contributions. The selected version 3 satisfies GPL-2.0-or-later and GPL-3.0-or-later contributions while respecting Green Mahjong's GPLv3 declaration. See `licenses/THIRD-PARTY-NOTICES.md` and each layout's `source`, `author`, `license` and `alsoFrom` metadata in `data/layouts.json`.

## Audited snapshots

Repositories were read from local shallow clones on 26 October 2026. These commit IDs identify the inspected content; the release does not depend on current branches.

| Source | Inspected commit | Declared licence and decision |
|---|---|---|
| [tcottrill/myMahjong](https://github.com/tcottrill/myMahjong) | `d036069e09ada94e6f5e07e2804aaa7b028fc869` | Unlicense. Reused free-tile and matching rules, solvable-deal algorithm, sprite mapping, four layouts, traditional tile art (upstream nature photographs were not redistributed). Added deterministic randomness, state serialization, proven reshuffle/redeal and strict validation. |
| [ffalt/mah](https://github.com/ffalt/mah) | `1cf1b9ab097d5b2015ea6a8169bb9e1024202955` | MIT, Copyright (c) 2016 ffalt. Imported built-in `src/assets/data/boards.json` geometry; retained licence. Its engine and external Mahseum archive are not used. |
| [ffalt/mahseum](https://github.com/ffalt/mahseum) | `40721e17ea18a3543f0266ebd2566d4fe72b67a9` | Its LICENSE explicitly limits MIT to museum source code and excludes layouts, warning about unclear permissions. **No archive layouts or assets included.** Its size is not used to inflate the playable library. |
| [KDE/kmahjongg](https://github.com/KDE/kmahjongg) | `1f960aed5da32d643d04f4e788fefef203d77586` | GPL-2.0-or-later project. Imported `.layout` geometry, retained `.desktop` author metadata and project licence. No KDE engine, artwork or sounds. None of the audited donors ship background music; music and sound effects are listed in `licenses/THIRD-PARTY-NOTICES.md`. |
| [KDE/libkmahjongg](https://github.com/KDE/libkmahjongg) | `e849302ceaee6b9cf64f681da1147719bb70410d` | Audited library/assets, including per-asset desktop metadata (e.g. default tiles GPL-2.0-or-later, Raquel Ravanini). Library provides rendering/asset support, not a layout library. **No files incorporated**; foundation/CC0 tiles already meet the design. |
| [shlomif/PySolFC](https://github.com/shlomif/PySolFC) | `b08b91ff9f0b4d13db39431fed0da60b45407b29` | The four imported `mahjongg1.py`, `mahjongg2.py`, `mahjongg3.py`, `mahjonggL.py` declare GPL-3.0-or-later with copyright notices. Decoded literal layout registrations only. No Python engine or card art used. |
| [ScriptRaccoon/mahjong-solitaire](https://github.com/ScriptRaccoon/mahjong-solitaire) | `89dc27b58ab6501994d43fe11dc216245ff820fa` | MIT, Copyright (c) 2024 ScriptRaccoon. Imported `COORDINATES` geometry; the Turtle duplicates an already included geometry and is retained in `alsoFrom` attribution. Its engine and PNG art are not used. |
| [danbeck/green-mahjong](https://github.com/danbeck/green-mahjong) | `80d94414f234bdbe12823bde71f239314d2688b4` | README declares **code GPLv3; artwork CC-BY-NC**. Imported only numerical layout arrays from six JS files; three unique shapes survive deduplication. **No non-commercial artwork included.** |
| [FluffyStuff/riichi-mahjong-tiles](https://github.com/FluffyStuff/riichi-mahjong-tiles) | `26e127ba2117f45cdce5ea0225748cc0cfad3169` | README and LICENSE.md dedicate assets to public domain / CC0. myMahjong README identifies its 36 base SVG tile graphics as this tileset, plus eight custom flower/season tiles. `licenses/FluffyStuff-CC0.md` preserves the dedication. |

The adapted engine's original relevant functions appear in myMahjong `index.html` around lines 2775–3140: `spriteName`, `shuffleArray`, `isFreeAmong`, `generateRemovalSequence`, `initGame`, `isFree`, `isMatch`, `findHint`. The standard rule remains no tile immediately above, and at least one left/right side open. Half-tile coordinates are preserved. The original unproven-deal fallback and random deadlock-prone shuffle are replaced with verified assignment and a free fresh deal if a remaining shape cannot be paired.

## Imported geometry and exclusions

`data/layout-audit.json` records 1,648 candidate shapes: 1,248 unique playable geometries, 341 duplicates and 59 rejected candidates. Candidates include boards derived in `scripts/import-layouts.mjs`: centre crops of each donor layout of 100+ tiles ("Little …", keeping the donor's licence and author, cropped to 30–110 tiles, solid and layered) and crafted pyramid shapes stacked from simple footprints (GPL-3.0-only, L’s Majong contributors). Rejections cover odd/out-of-range tile counts, overlaps, unsupported layers, or no proof under the single runtime engine's rules. Geometries are deduplicated after translation and all eight planar rotations/reflections. Retained source families: 11 myMahjong/adaptations, 83 Mah, 52 KDE, 147 PySolFC, 3 Green Mahjong. Duplicate sources remain attributed.

Seven small flat introductory boards are explicit adaptations of the foundation's base-grid layout, named First Garden, Quiet Pond, Bamboo Path, Stepping Stones, Sage Terrace, Garden Gate and Lantern Walk. They are identified as adaptations in metadata. Historical imported names and authors are preserved.

All geometry is converted to `{x,y,z}` positions, where 2 logical units equal one tile span. Layouts favour landscape orientation without changing tile face aspect ratio. Each retained layout has a complete removal proof after conversion and orientation.

## Reproduce without network access

Use Node.js 22 or later from the release directory. No npm packages or runtime CDN dependencies are required for conversion/generation:

```sh
node scripts/import-layouts.mjs
node scripts/generate-levels.mjs
node scripts/validate-levels.mjs
node --test tests/engine.test.mjs
```

`vendor/layout-sources` includes the original selected source data and conversion helper inputs. The foundation's pure layout declarations are an attributed excerpt of its Unlicensed index. Source files from KDE retain their `.desktop` companions; PySol source copyright headers are intact. The importer evaluates only known vendored JavaScript data declarations in a Node VM and parses PySol literals without executing Python. It does not fetch arbitrary URLs.

Generated release files: `data/layouts.json` (geometry + provenance), `data/levels.json` (all 5,200 assigned deals + complete winning witnesses), `data/layout-audit.json` (import decisions), `data/validation-report.json` (full replay results, curve, content hash). Browser runtime requests only the generated library. No solution is shown in the player UI.

## Actual validated content

The release contains **5,200 distinct solvable Journey deals across 811 of the 1,248 playable geometries**. Every one of the 665,598 tile placements is covered by two winning-sequence replays: the original uncached free/match rules and the public gameplay API. The validator also checks matching-group parity, coordinate integrity/support, consecutive level IDs, opening difficulty limits, reproducible seed samples and board uniqueness including reflections/rotations.

The opening climbs through size bands, taking boards from evenly spaced complexity buckets so each level is slightly larger or deeper: Level 1 is flat (24 tiles); Levels 2–5 have 30–44 layered tiles; through Level 15 at most 60; through 30 at most 76; through 60 at most 96 with 3–5 layers; through 100 at most 120; Levels 101–150 use the full donor layouts. Afterwards the full donor library cycles with a 40–80 tile layered breather every sixth level. Difficulty metadata is a heuristic based on tile count, layers and initial free tiles; it is not a measured human skill rating. The app can create additional deterministic deals locally after the prebuilt library.

Initial solvability does not mean every legal player choice preserves a solution. Hints, undo and reshuffle remain free. Reshuffle preserves the remaining face multiset when a removal proof exists; when the remaining geometry is unpairable, it supplies a fresh proven board of the same level while retaining Journey progress and coins.
