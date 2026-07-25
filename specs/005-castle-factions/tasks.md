# Tasks: Castle Factions

**Plan**: [plan.md](./plan.md)
**Status**: Implemented.

## Phase 1 — Content data (creatures + factions)

- [x] `js/creatures.js` — added `factionId` to all 10 existing entries;
  re-keyed `tier` to per-faction 1-7; added the 11 new Human/Orc/Undead
  creatures and 7 new Enkantos creatures (28 entries total).
  `getCreature`/`creaturePower` signatures unchanged.
- [x] `js/factions.js` — new module replacing `js/heroTypes.js`:
  `FACTIONS` (4 entries), `getFaction(id)`. Resolved during
  implementation: each faction's `creatures` roster is *derived* from
  `creatures.js` (`.filter(factionId).sort(tier)`) rather than
  hand-duplicated, so the two files can never drift out of sync — a
  small improvement over the plan's original "hand-written 7-array".
- [x] Deleted `js/heroTypes.js`; repointed every importer
  (`adventure.js`'s `createHero`, `main.js`'s setup/game-over screens).

## Phase 2 — Castle economy for the 18 new creatures

- [x] `js/castle.js` — `BUILD_COST`/`RECRUIT_COST` extended to all 28
  keys.
- [x] `js/castle.js` — `castleRosterFor(hero)` helper.
- [x] Verified programmatically (not as a committed test — see Phase 7)
  that every `CREATURES` entry has both a `RECRUIT_COST` and
  `BUILD_COST` key, and `castleRosterFor` returns exactly 7 ids in tier
  order for each faction.

## Phase 3 — AI scoping

- [x] `js/ai.js` — `chooseAiCastleActions`'s two `CREATURES` loops
  switched to `castleRosterFor(hero)`.
- [x] `tests/ai.test.mjs` — `castleFixture` gained `heroTypeId: 'human'`
  (needed for `castleRosterFor` to resolve at all); verified live that a
  faction-scoped AI never builds/recruits outside its own roster.

## Phase 4 — Map dwellings (28 creature types)

- [x] Wrote a throwaway Node script laying out all 28 dwellings as
  mirrored pairs (Human↔Undead, Orc↔Enkantos), validated bounds/
  collisions against the map's existing 14 mines/6 monsters/6 treasures/
  2 keeps before committing to `mapObjects.js`.
- [x] `js/mapObjects.js` — 28-entry dwelling block, guard counts scaled
  by tier (T1=10 down to T7=2).
- [x] Re-validated programmatically: every one of the 28 creatures has
  exactly one dwelling, zero collisions, zero out-of-bounds hexes.

## Phase 5 — Setup screen (faction picker)

- [x] Setup screen renders faction cards (name, ATK/DEF, starting army,
  7-tier roster preview).
- [x] `btn-start-game` handler uses `FACTIONS` instead of `HERO_TYPES`.
- [x] Castle screen scopes its main list to `castleRosterFor(hero)`;
  added a separate "Other (captured from another faction)" section
  (hidden when empty) for off-faction unlocks. Verified visually via
  Playwright: an Enkantos hero's Castle shows exactly its 7 creatures
  plus a correctly-separated Peasant row after an off-faction capture.

## Phase 6 — Art

- [x] Copied all 7 Enkantos sprites from `pinoy-board`.
- [x] The 11 new Human/Orc/Undead creature sprites and the new Enkantos
  hero token initially could **not** be generated — the locally
  installed Codex CLI (0.143.0) was too old for the `image-gen` skill's
  backend model and hard-rejected every request (confirmed across 12
  attempts, not transient). Fell back to flat placeholder SVGs
  (`scripts/gen-placeholder-sprites.mjs` style) to ship a functional
  feature. **Resolved**: Codex upgraded to 0.145.0, all 12 regenerated
  as real full-body painterly PNGs with true alpha transparency,
  matching the other 17 creatures exactly; placeholder SVGs removed.
- [x] Renamed `hero-{marshal,warlord,sentinel}.svg` → `hero-{human,orc,
  undead}.svg`; generated `hero-enkantos.png` (real art, see above).
- [x] `js/sprites.js` — all 28 `creature-<id>` and 28 `dwelling-<id>`
  entries present; verified programmatically that every registered path
  resolves to a real file on disk (zero missing). All 28 `creature-<id>`
  and all 28 `dwelling-<id>` are now real art (creatures: 11 generated +
  7 pinoy-board + 10 pre-existing; dwellings: 18 generated + 10
  pre-existing) — the 18 new dwelling icons were flat placeholders for a
  short window post-launch, reported and regenerated in a follow-up pass.
- [x] Attack-effect sprites: 6 of Enkantos's 7 reuse pinoy-board's own
  attack/enemy/ effect icons directly (Duwende, Manananggal, Tikbalang,
  Aswang, Kapre, Bakunawa); Santilmo and the 11 new Human/Orc/Undead
  creatures still fall back to
  `FALLBACK_SPRITE` automatically, no dangling paths added.

## Phase 7 — Tests (id migration)

- [x] `tests/adventure.test.mjs`'s `freshState()` → `createAdventure(
  'human', 'orc')`.
- [x] `tests/ai.test.mjs`'s `castleFixture` → `heroTypeId: 'human'`.
- [x] Full `node --test tests/*.test.mjs`: **152/152 passing** — every
  other test in the suite was already written generically enough
  (searching `state.hexes` dynamically, symbolic `BUILD_COST.x.y`
  references) to need no further changes.

## Phase 8 — Docs

- [x] `README.md` — Art section covers the Enkantos reuse and the
  Codex-CLI placeholder gap; Design docs section no longer says
  "design only".
- [x] `index.html`'s how-to-play dialog step 1 mentions faction choice
  (and that the AI always gets a different faction).
