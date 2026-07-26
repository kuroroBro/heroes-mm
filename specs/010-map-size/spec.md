# Feature Specification: Map Size

**Feature branch**: `010-map-size`
**Status**: Implemented
**Created**: 2026-07-27
**Depends on**: `specs/001-hex-heroes` (the base 30x22 map this generalizes),
`specs/009-multi-ai-opponents` (the setup screen's existing "number
input"/settings-persistence pattern this reuses, and the 2nd/3rd AI
Keep placement this now also has to happen at 3 different map sizes for)

## Overview

Requested directly: "I want to be able to set how big the map is, x1,
x2, x4. Add more mines and relayout depending on the size. Adjust the
monsters guarding the additional mines to have tier 1 or tier 2
monsters." Previously the adventure map was always the single hand-
authored 30x22 layout. This feature lets the setup screen choose a map
size — x1 (today's map, unchanged), x2 (~2x tile count), or x4 (~4x
tile count) — each with more mines than the last, while keeping x1
byte-identical to before this feature (every one of the 187 tests that
predate it still passes unchanged).

## User Stories

### US-1: Choose a map size at setup
As a player, I want a "Map size" control on the setup screen (x1/x2/x4,
default x1), so I can play a faster small game or a longer, denser one
without any other setup change.

**Acceptance criteria**
- Setup screen shows a `<select>` (x1/x2/x4, default x1) alongside the
  existing AI-count and defeats-to-win controls, persisted the same way
  via `storage.js`'s settings.
- `createAdventure(playerHeroTypeId, aiHeroTypeIdOrIds, options)` takes
  a new `options.mapSize` ('x1' default, 'x2', or 'x4') and sizes
  `state.mapWidth`/`mapHeight` and every hero's starting Keep position
  accordingly — every existing call site that doesn't pass `mapSize` is
  completely unaffected (defaults to the original x1 map).
- The adventure map SVG (viewBox, hex layout) already scales to
  `state.mapWidth`/`mapHeight` dynamically, so no rendering code needed
  to change to support arbitrary map dimensions.

### US-2: Bigger maps have more mines, relaid out to fit
As a player, I want a bigger map to actually feel bigger — more economy
to fight over, not just more empty hexes — so picking x2/x4 is a real
choice, not just a visual one.

**Acceptance criteria**
- x2/x4 each contain every piece of x1 content (all keeps, mines,
  dwellings, monsters, treasures) rescaled to the same *relative*
  position in the larger rectangle, preserving the existing
  player/ai left-right mirror and ai2/ai3 top-bottom placement.
- x2 adds 14 extra mines beyond x1's 14 (28 total, 4 of each of the 7
  resources); x4 adds 42 extra (56 total, 8 of each) — i.e. mine count
  scales with the map's own size multiplier, matching the x1/x2/x4
  naming directly.
- Extra mines are placed as mirrored pairs, fairness-checked the same
  distance-sum way every map content addition since specs/006 has been.

### US-3: The additional mines are guarded lightly
As a player, I want the *extra* mines on bigger maps to be an early,
approachable economy boost, not a new hard obstacle, so a bigger map
isn't just a slower, more tedious one.

**Acceptance criteria**
- Every extra mine (beyond x1's original 14) is guarded by a tier-1 or
  tier-2 creature (cycling through all 6 factions' own tier-1/2 units —
  Peasant/Pikeman, Goblin/Wolf, Skeleton/Zombie, Duwende/Santilmo,
  Spark/Salamander, Kappa/Tengu — not just repeating Human units), at
  the same 6-count(tier 1)/5-count(tier 2) guard sizes the original
  wood/ore/crystal/mercury mines already use.

## Non-goals

- No procedural/random map generation — x2/x4 are hand-authored (via a
  throwaway generator + fairness-check script, same workflow every prior
  map content addition used), fixed layouts, same as x1.
- No per-game custom width/height — exactly 3 fixed sizes, matching
  what was actually requested (x1/x2/x4), not an arbitrary slider.
- No change to dwelling/monster/treasure *counts* — only mines scale
  with map size; every faction's roster is still exactly one dwelling
  each, same as before this feature.
