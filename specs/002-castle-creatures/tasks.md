# Tasks: Castle & Creature Recruitment

**Plan**: [plan.md](./plan.md)

## Phase 1 — Castle rules engine

- [x] `js/castle.js` — `initCastle()`, `unlock(hero, creatureTypeId)`,
  `accrueGrowth(hero)` (called from `endDay`), `canAffordBuild`,
  `buildDwelling(state, owner, creatureTypeId)`, `canAffordRecruit`,
  `recruitCreatures(state, owner, creatureTypeId, count)`, content tables
  `BUILD_COST` / `RECRUIT_COST` (plan.md Decision #3 table).
- [x] `tests/castle.test.mjs` — unlock via build, unlock via capture
  (integration with `adventure.js`), pool accrual + cap, recruit
  affordability edge cases (exact-cost, over-cap pool, full army),
  build affordability edge cases, `node --test`.

## Phase 2 — Adventure-engine integration

- [x] `js/adventure.js`: `createHero()` initializes `hero.castle`;
  `endDay()` calls `castle.accrueGrowth` per hero instead of writing
  per-hex `garrison`; `resolveOccupancy()`'s dwelling branch calls
  `castle.unlock()` instead of merging garrison into the army;
  `kingdomScore()` sources the dwelling term from
  `hero.castle.unlocked.size` (plan.md Decision #5).
- [x] `js/mapObjects.js` — drop the `garrison: 0` field from the 4 v1
  dwelling entries (dead once `endDay` stops writing it).
- [x] Update `tests/adventure.test.mjs` for the new capture-unlocks (not
  merges) behavior and the new Kingdom Score source.

## Phase 3 — AI

- [x] `js/ai.js` — `chooseAiCastleActions(state, owner)` (plan.md
  Decision #4: one build/day lowest-affordable-tier, then greedy
  cheapest-first recruit).
- [x] `js/main.js` — AI turn orchestration calls
  `chooseAiCastleActions` once per AI day, alongside the existing
  adventure-map targeting call.
- [x] `tests/ai.test.mjs` — fixture coverage: builds cheapest affordable
  tier and only one per day; recruits lowest-tier-first until resources
  or army slots run out; no-op when nothing is affordable.

## Phase 4 — UI

- [x] `index.html` — `screen-castle` markup (10 creature-tier rows: name,
  unlocked/locked state, pool count + growth/day, build or recruit
  controls); **Castle** button added to `screen-adventure`.
- [x] `css/styles.css` — Castle screen layout, row styling, disabled-state
  styling for unaffordable build/recruit actions.
- [x] `js/main.js` — `SCREENS` gains `screen-castle`; open/close wiring
  (no movement/day cost); render function reading `hero.castle` +
  `hero.resources`; input handlers calling `castle.buildDwelling` /
  `castle.recruitCreatures` and re-rendering.

## Phase 5 — Docs

- [x] `specs/001-hex-heroes/spec.md` — update US-2 and Decision #3
  cross-references (or add a pointer) once this feature ships, since v1's
  text currently describes the now-superseded passive-garrison model.
- [x] `README.md` — update the gameplay walkthrough (step 3/4) to describe
  the Castle/recruit flow instead of "walking onto a dwelling adds
  creatures directly."

## Resolved during implementation

- Pool cap moved into `castle.js` as `POOL_CAP_MULT = 10`, not left in
  `adventure.js` — pool accrual is entirely castle.js's responsibility now.
- The Castle button/screen only opens when `phase === 'playing'` and it's
  not mid-AI-day (`!aiDayInProgress`) — matches v1's existing gating on all
  other adventure input.
- Extracted `MAX_ARMY_SLOTS`/`mergeIntoArmy`/`armyValue` out of
  `adventure.js` into a new `js/army.js` (not in the original plan) so
  `castle.js` could reuse the merge-into-army logic without a circular
  import between `adventure.js` and `castle.js`.

## Out of scope (see spec.md Non-goals)

Build prerequisites/tech tree, multiple castles per hero, castle
combat/siege, stacked capture+build growth, resource conversion, weekly
growth multipliers/morale/luck.
