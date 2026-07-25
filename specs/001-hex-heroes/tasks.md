# Tasks: Hex Heroes

**Plan**: [plan.md](./plan.md)

## Phase 1 — Hex math engine

- [x] `js/hexgrid.js` — axial coords, `neighbors`, `distance`,
  `hexesInRange`, `findPath` (cost-limited BFS/Dijkstra), axial-to-pixel
  conversion for flat-top hexes.
- [x] `tests/hexgrid.test.mjs` — full coverage, `node --test`.

## Phase 2 — Content

- [x] `js/resources.js` — 7 resources + mine yield table.
- [x] `js/creatures.js` — 10 creature tiers.
- [x] `js/heroTypes.js` — 3 hero types + starting armies.
- [x] `js/mapObjects.js` — fixed 15×11 map layout (keeps, mines,
  dwellings + guards, a couple of treasure pickups).
- [x] `js/sprites.js` — spriteId → placeholder image path lookup.

## Phase 3 — Adventure-map rules engine

- [x] `js/adventure.js` — `createAdventure`, `moveHero`, `endDay`
  (income + AI turn hook), capture logic, battle-trigger detection,
  Kingdom Score, Day-30 + hero-defeat win conditions.
- [x] `tests/adventure.test.mjs` — full coverage, `node --test`.

## Phase 4 — Tactical battle rules engine

- [x] `js/battle.js` — `createBattle`, turn order, `moveStack`,
  `attackStack`, `waitStack`, `defendStack`, damage formula (Decision #2),
  casualties, retaliation, win condition.
- [x] `tests/battle.test.mjs` — full coverage including the damage
  formula with a fixed rng seed, `node --test`.

## Phase 5 — AI

- [x] `js/ai.js` — adventure-map target selection, battle action
  selection (Decision #5 heuristics).
- [x] `tests/ai.test.mjs` — fixture-based coverage of both heuristics,
  `node --test`.

## Phase 6 — UI (single-device, no networking)

- [x] `index.html` — home, setup (hero pick), adventure screen, battle
  screen, gameover screen.
- [x] `css/styles.css` — shared hex-tile rendering for both grids, UI
  chrome.
- [x] `js/storage.js` — last-picked hero type.
- [x] `js/main.js` — screen routing, adventure render + input, battle
  render + input, AI turn orchestration (adventure end-of-day and every
  AI-controlled battle turn), gameover rendering.

## Phase 7 — Placeholder art

- [x] Hand-authored flat SVG placeholders: hero tokens (×3 types), 10
  creature portraits, mine icons (×7 resources), dwelling icons, keep,
  treasure. Wired through `js/sprites.js` (Phase 2), no engine changes
  needed when real art replaces these later.

## Phase 8 — Deploy

- [x] `.github/workflows/deploy.yml` + `.nojekyll`, matching every
  sibling repo's test-then-deploy pattern.
- [x] `README.md`.
- [ ] Verify the live Pages URL after first push to `main` (blocked on push).

## Open backlog (intentionally deferred)

- **Multiplayer** (second human hero over PeerJS, replacing or alongside
  the AI) — see plan.md's Networking model for the planned shape. Not
  started; this is the headline future expansion the spec calls out.
- **Magic/spells, town-building/recruiting, procedural maps, battlefield
  obstacles, fog-of-war, creature special abilities, roaming monsters,
  save/resume** — all explicit spec.md Non-goals for v1, not forgotten,
  just deliberately out of scope until the core loop is proven fun.
- A `gondoit.work` portfolio card — separate follow-up task in that repo,
  only after v1 is deployed and playable.
