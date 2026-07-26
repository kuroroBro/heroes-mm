# Implementation Plan: Map Size

**Spec**: [spec.md](./spec.md)

## Decision #1: x1 stays the current map, unchanged — x2/x4 scale up from there

Confirmed directly with the user before building (this touches a lot of
hand-authored content, so guessing wrong meant redoing hours of map
authoring): x1 is today's 30x22 map, completely untouched, and stays
the default; x2/x4 are *new*, larger maps rather than x1 being shrunk to
make room for a bigger "default." This mirrors the exact same principle
specs/009-multi-ai-opponents used for AI count — every existing test,
save file, and player's mental model of "the map" stays valid unless
they actively opt into something bigger.

## Decision #2: x2 = 42x31, x4 = 60x44 (exactly 2x both dimensions of x1)

x4 is exactly double x1's width and height (60x44 vs 30x22), giving
exactly 4x the tile count (2640 vs 660) — a clean, easy-to-reason-about
relationship the "x4" name can point at directly. x2 sits at the
geometric mean between x1 and x4 on both axes (30*sqrt(2)≈42,
22*sqrt(2)≈31), landing at 1302 tiles (~1.97x x1) — "roughly 2x," which
is all "x2" ever needs to mean.

## Decision #3: Content is rescaled, not duplicated

Every x1 object (all 56 pieces of content, including the 2 always-
present keeps) is linearly rescaled into the bigger rectangle at the
same *relative* column/row position it occupies in x1 — same approach,
same reasoning as specs/009's KEEP_AI2/KEEP_AI3 placement: an affine
transform applied uniformly to everything preserves the existing
left/right (player/ai) and top/bottom (ai2/ai3) mirror symmetry by
construction, without needing to re-derive it by hand for 2 more map
sizes. This also means x2/x4 have exactly the same 42 dwellings as x1
(never duplicated) — `content.test.mjs`'s "every creature has exactly
one map dwelling" invariant only ever checks the x1 export by name, so
it didn't need to change; a second dwelling per creature was never on
the table (spec.md Non-goals).

Collisions from rounding during the rescale (two x1 hexes landing on
the same new coordinate) are resolved by a small spiral search for the
nearest free cell — in practice never triggered at these scale factors
(>1.4x on every axis, i.e. always spreading points apart, never
compressing them), verified after the fact by a zero-duplicates,
zero-out-of-bounds check (now `content.test.mjs`'s per-size sanity
test).

## Decision #4: Extra mines scale with the size multiplier itself, guarded by tier-1/2 creatures cycling across all 6 factions

x2 adds (multiplier-1)*2 = 2 extra mines per resource type (14 total,
tier-1/2 guarded); x4 adds (4-1)*2 = 6 extra per resource (42 total) —
so mine *count* scales with the same x1/x2/x4 multiplier the map itself
does, a direct, easy-to-explain relationship rather than an arbitrary
density curve. Guards cycle through all 6 factions' own tier-1/tier-2
units (Peasant/Pikeman, Goblin/Wolf, Skeleton/Zombie, Duwende/Santilmo,
Spark/Salamander, Kappa/Tengu) at the same 6/5 guard counts x1's own
wood/ore/crystal/mercury mines already use — deliberately reusing an
established, already-playtested-feeling guard weight rather than
inventing a new one, and drawing from every faction (not just repeating
Human Peasant/Pikeman 28 times) so a bigger map's extra mines still
feel varied rather than copy-pasted.

## Decision #5: Generated + fairness-checked by script, hand-committed as static data (same workflow as every prior map content addition)

A throwaway Node script (not shipped) performed the rescale, collision
resolution, and extra-mine placement (mirrored pairs, picked from a
shuffled candidate list so they spread out rather than clumping), then
printed the resulting fairness numbers before the coordinates were
copied into `mapObjects.js` as plain, hand-committed data — the exact
same "script generates + verifies, then gets written into the file for
readability/control" pattern specs/006/008/009 already established for
Sunborn/Yokai/KEEP_AI2/KEEP_AI3 placement. Total hex distance from each
of the 4 possible keeps to all mine/dwelling/monster/treasure content
came out within ~4% of each other for both new tiers (x2: 1687-1756;
x4: 3246-3350) — tighter than the ~6% baseline already accepted for
specs/009's own 4-keep case on x1.

## Decision #6: `state.keeps` replaces the module-level `KEEP_*` constants inside adventure.js

Since keep positions now vary by map size, `homeKeep(owner)` (a plain
module-level lookup before this feature) became `homeKeep(state,
owner)`, reading `state.keeps` — set once in `createAdventure` from
`getMapLayout(options.mapSize)` — instead of importing fixed
`KEEP_PLAYER`/`KEEP_AI`/`KEEP_AI2`/`KEEP_AI3` constants. `mapObjects.js`
still exports those exact x1 constants unchanged (tests and any other
future consumer can still reach the "default map" data directly), but
adventure.js itself now only ever calls `getMapLayout` — a single
lookup point rather than scattering `if (mapSize === 'x2')`
conditionals through the engine. `state.mapWidth`/`mapHeight` already
existed for exactly this kind of use (multi-AI's bounds checks read
them, not a hardcoded constant), so `isPassableForMove`'s `inRect` call
and every other bounds check needed zero changes to support arbitrary
map sizes.

## Decision #7: Rendering needed no changes at all

`renderAdventureMap` (main.js) already computes its SVG `viewBox` from
`state.mapWidth`/`mapHeight` via `layoutHexes`/`rectHexes`, rather than
any hardcoded dimension — a bigger map is already just "more hexes to
lay out," handled by existing code with zero special-casing. Verified
live: an x4 game's map SVG viewBox came out at `0 0 2355.6 2013.5`
(vs. x1's much smaller default), fully populated, hero tokens and
labels rendering correctly with no hidden-behind-hex regressions
(specs' own earlier fix this session already covers any map size).

## Verification performed

- 4 new adventure.test.mjs tests (x1 defaults unchanged, x2/x4 use the
  right layout/keeps, extra mines scale with size and are tier-1/2
  guarded, `moveHero` bounds-checks against the *chosen* map's own
  width/height rather than x1's). 3 new content.test.mjs tests (one per
  size: every hex in-bounds, no duplicate hexes, every
  dwelling/guard references a real creature). Full suite 194/194 (187
  pre-existing + 7 new), including the pre-existing "x1 unchanged"
  behavioral guarantee holding with zero modifications to any prior
  test.
- Live Playwright verification of the real UI flow: setup screen's new
  "Map size" dropdown through to a live x4, 3-hero (player + 2 AI) game
  — map SVG scales correctly (viewBox ~3.5x x1's own), 116 text labels
  rendered with none hidden, defeats pill lists both AI separately, 2
  full End Day cycles ran the AI across the much larger board with zero
  console errors and the day counter advancing correctly each time.
