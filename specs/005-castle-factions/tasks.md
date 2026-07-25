# Tasks: Castle Factions

**Plan**: [plan.md](./plan.md)

## Phase 1 — Content data (creatures + factions)

- [ ] `js/creatures.js` — add `factionId` to all 10 existing entries
  (plan.md Decision #2's faction tables say which); re-key `tier` to be
  per-faction 1-7 instead of the current global 1-10; add the 11 new
  Human/Orc/Undead creatures and 7 new Enkantos creatures with the exact
  stat rows from plan.md Decision #2 (28 entries total). `getCreature`/
  `creaturePower` signatures unchanged.
- [ ] `js/factions.js` — new module replacing `js/heroTypes.js`:
  `FACTIONS` (4 entries: human/orc/undead/enkantos), each with `id`,
  `name`, `attack`, `defense`, `startingArmy`, `creatures` (7
  `creatureTypeId`s in tier order), `spriteId`; `getFaction(id)` lookup
  (same shape as today's `getHeroType`).
- [ ] Delete `js/heroTypes.js`; grep the whole repo for every import of it
  and repoint to `js/factions.js` (`adventure.js`'s `createHero`,
  `main.js`'s setup screen and game-over screen, any test fixture that
  imports `HERO_TYPES`/`getHeroType`).

## Phase 2 — Castle economy for the 18 new creatures

- [ ] `js/castle.js` — extend `BUILD_COST`/`RECRUIT_COST` to all 28 keys
  (plan.md Decision #6: size the 18 new entries against their
  `creaturePower()`-equivalent reused neighbor, keeping the existing
  5-20-day-to-afford target from this session's economy rebalance).
- [ ] `js/castle.js` — new `castleRosterFor(hero)` helper (spec.md FR-3):
  returns the hero's own faction's 7 `creatureTypeId`s via
  `getFaction(hero.heroTypeId).creatures` (or wherever the faction id
  ends up living post-Phase-1's rename).
- [ ] `tests/castle.test.mjs` — every `BUILD_COST`/`RECRUIT_COST` key has
  both a matching `CREATURES` entry and vice versa (no orphaned content);
  `castleRosterFor` returns exactly 7 ids, all belonging to the queried
  hero's faction, in tier order.

## Phase 3 — AI scoping

- [ ] `js/ai.js` — `chooseAiCastleActions`'s `for (const creature of
  CREATURES)` loops (build-cheapest, recruit-greedily) both switch to
  `castleRosterFor(hero)` (spec.md FR-4) instead of the full 28-entry
  list — without this the AI tries to build every faction's dwellings.
- [ ] `tests/ai.test.mjs` — `chooseAiCastleActions` never builds/recruits
  a creature outside the AI hero's own faction, even when funded well
  enough to afford one (fixture: give an Orc-faction AI hero enough
  gold/wood/ore to afford a Human creature's build cost, assert it stays
  unbuilt).

## Phase 4 — Map dwellings (28 creature types)

- [ ] Write a throwaway Node script (same approach as this session's
  30x22 map-size change) that lays out all 28 dwellings as mirrored pairs
  per plan.md Decision #5 (Human↔Undead, Orc↔Enkantos), validates every
  hex is in-bounds and collision-free against the map's existing 14
  mines/6 monsters/6 treasures/2 keeps, and prints the final
  `MAP_OBJECTS` entries.
- [ ] `js/mapObjects.js` — replace the current 10-entry dwelling block
  with the validated 28-entry block; guard counts follow the existing
  pattern (each dwelling guarded by its own creature type, count roughly
  scaled to that creature's `creaturePower()` the same way the current 10
  already are).
- [ ] Re-run the full test suite — no test should hardcode dwelling
  count/positions (checked: current tests search `state.hexes` by
  `type`/`resource`/`creatureTypeId` dynamically, not by fixed
  coordinates), but confirm nothing broke.

## Phase 5 — Setup screen (faction picker)

- [ ] `index.html` / `js/main.js` — setup screen's hero-type cards become
  faction cards: name, Attack/Defense, starting army (unchanged rendering
  logic, re-sourced from `FACTIONS`), plus a new compact 7-row roster
  preview (name + tier only) per spec.md US-1.
- [ ] `js/main.js`'s `btn-start-game` handler — `otherTypes = FACTIONS
  .filter(...)` instead of `HERO_TYPES.filter(...)`; everything else
  (`createAdventure(selectedFactionId, aiFactionId)`) is unchanged since
  `createHero` doesn't care whether the id space is hero types or
  factions.
- [ ] `js/main.js`'s Castle screen render — use `castleRosterFor(hero)`
  for the main 7 rows; any additional hero-unlocked creature outside
  that list renders in a separate "Other" section (spec.md FR-3/US-2)
  instead of being hidden or interleaved.

## Phase 6 — Art

- [ ] Copy `pinoy-board/app/src/assets/boardSprites/enemy/{duwende,
  santilmo,manananggal,tikbalang,aswang,kapre,bakunawa}.png` into
  `images/creatures/` (plan.md Decision #3 — direct reuse, already
  confirmed style-compatible, no regeneration).
- [ ] Generate the 11 new Human/Orc/Undead creature sprites via the
  `image-gen` skill, matching the existing 10's painterly/transparent
  style and prompt conventions exactly (Swordsman, Cavalier, Goblin, Orc
  Chieftain, Behemoth, Zombie, Ghost, Wraith, Vampire, Lich, Bone Dragon).
- [ ] Generate `hero-enkantos.svg` (flat placeholder style, matching the
  existing 3 hero tokens — not the creature painterly style).
- [ ] Rename `images/creatures/hero-{marshal,warlord,sentinel}.svg` to
  `hero-{human,orc,undead}.svg` alongside the Phase 1 id rename; update
  `js/sprites.js`'s `HERO_SPRITES` lookup table.
- [ ] `js/sprites.js` — add all 18 new `creature-<id>` entries (11
  generated + 7 copied) to `CREATURE_SPRITES`.
- [ ] Attack-effect sprites (`js/sprites.js`'s `ATTACK_SPRITES`, used by
  `main.js`'s `showAttackEffect`) — generate/assign one per new creature,
  themed to how it fights (matching the existing 10's per-creature
  convention noted in `sprites.js`'s own comment), or fall back to a
  faction-generic effect if a per-creature one isn't worth the art budget
  this round (explicitly a judgment call to make during implementation,
  not pre-decided here).

## Phase 7 — Tests (id migration)

- [ ] Repo-wide grep for `'marshal'`, `'warlord'`, `'sentinel'` across
  `tests/*.test.mjs` and update every fixture to `'human'`/`'orc'`/
  `'undead'`/`'enkantos'` (or a faction-agnostic placeholder id where the
  test doesn't actually care which faction, to avoid over-coupling tests
  to specific faction identity).
- [ ] `tests/adventure.test.mjs` — `createAdventure('human', 'orc')` (or
  equivalent) as the new `freshState()` baseline, replacing
  `createAdventure('marshal', 'warlord')`.
- [ ] Full `node --test tests/*.test.mjs` green before merging.

## Phase 8 — Docs

- [ ] `README.md` — update the "Art" section (new Enkantos/pinoy-board
  reuse note, alongside the existing hex-texture-reuse note) and any
  mention of "10 creatures"/"3 hero types".
- [ ] `index.html`'s how-to-play dialog — mention faction choice replacing
  hero-type choice in step 1.
