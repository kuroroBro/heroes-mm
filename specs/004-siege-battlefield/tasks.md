# Tasks: Siege Battlefield Obstacles

**Plan**: [plan.md](./plan.md)

## Phase 1 — Wall layout & engine

- [x] `js/battle.js` — `SIEGE_WALL_COLUMN`/`SIEGE_GATE_ROW`/`WALL_HP`/
  `CATAPULT_DAMAGE` constants, `siegeWallLayout()` (plan.md Decision #1);
  `createBattle` gains an `options = {}` parameter, populates
  `state.walls` (a `Map<HexKey, hpRemaining>`) from `siegeWallLayout()`
  when `options.isSiege`, else an empty `Map`; new export
  `isObstacleHex(state, hex)` (Decision #2); internal `isPassable`
  consults it alongside existing bounds/occupancy checks.
- [x] Verify (and add a test asserting) that neither side's
  `startingPosition` column ever equals `SIEGE_WALL_COLUMN` — spec.md
  FR-8 calls this out as a hard requirement, not an assumption.
- [x] `tests/battle.test.mjs` — wall hexes present (at full `WALL_HP`)
  only when `options.isSiege` is passed (empty `Map` otherwise,
  confirming every existing non-siege call site is unaffected);
  `moveStack`/`reachableHexes` never allow entering a *standing* wall
  hex; pathfinding routes through the gate row instead; ranged attacks
  and every one of the 6 spells can still target a stack standing behind
  the wall (Decision #3 — explicitly unchanged targeting).

## Phase 2 — Catapult

- [x] `js/battle.js` — `attackWall(state, side, targetHex)` (plan.md
  Decision #4): attacker-only, once-per-round via a new
  `heroSides.attacker.hasFiredCatapultThisRound` flag (independent of
  `hasCastThisRound`), requires the attacker's turn window (same gating
  shape as `castSpell`), deals `CATAPULT_DAMAGE` to the targeted standing
  wall hex, deletes it from `state.walls` at ≤0 HP (immediate
  destruction), never calls `advanceTurn`. Round-wrap also resets
  `hasFiredCatapultThisRound` for the attacker.
- [x] `tests/battle.test.mjs` — `attackWall` damages/destroys the
  targeted hex (exact HP math, two hits destroy one hex per
  `CATAPULT_DAMAGE`/`WALL_HP`); rejected for the defender side; rejected
  outside the attacker's turn window; rejected a second time the same
  round; rejected against a non-wall or already-destroyed hex; doesn't
  advance turn order; a destroyed hex is immediately passable to
  `moveStack`/`reachableHexes` within the same test.

## Phase 3 — AI

- [x] `js/ai.js` — `battlePassable` calls `isObstacleHex` (imported from
  `battle.js`) instead of only checking bounds/occupancy (Decision #2);
  new `chooseAiCatapultTarget(state)` (Decision #5) — lowest-remaining-HP
  standing wall hex, or `null` if none stand, the AI isn't the attacker,
  or it already fired this round.
- [x] `tests/ai.test.mjs` — `aiChooseBattleMove` never returns a wall hex
  as a move target on a siege battlefield, and still makes progress
  toward the gate when the straight-line path to the enemy is blocked;
  `chooseAiCatapultTarget` fixture coverage (targets weakest standing
  wall, null cases).

## Phase 4 — Wiring & rendering

- [x] `js/main.js` — every `createBattle` call site
  (`startBattleFromPending`, `autoResolveNeutralBattle`) passes `{
  isSiege: isSiegeBattle(adventureState) }`; AI turn orchestration also
  tries `chooseAiCatapultTarget` once per round (same cadence as the
  existing `chooseAiSpell` call from 003).
- [x] `js/main.js`/`css/styles.css` — `renderBattleMap` marks standing
  wall hexes with a distinct tile class (`hex-tile.obstacle` or similar),
  reverting to the normal tile look the instant a hex is destroyed;
  decide during implementation whether that's a CSS-only treatment or a
  small wall-segment sprite asset (spec.md FR-6) — not fixed by this
  design pass.
- [x] `js/main.js`/`index.html`/`css/styles.css` — a **Fire Catapult**
  control on the battle screen, shown only when the player is the
  attacker in a siege and it's their turn window; click-to-target picking
  UX mirrors 003's spell-target picking (`pendingSpellCast`-style state)
  rather than introducing a second, different targeting interaction.
- [x] Manual check (`/verify`-style): start a siege, confirm the wall
  renders, movement is blocked except through the gate, a ranged attack/
  spell still reaches a defender behind the wall, firing the catapult
  twice on the same hex destroys it and opens a new path, and the AI
  attacker uses its own catapult when sieging the player.

## Resolved during implementation

- `createBattle`'s new `options` parameter was placed **after** `rng`
  (`createBattle(attackerArmy, defenderArmy, attackerBonus, defenderBonus,
  rng = defaultRng, options = {})`), not before it as plan.md's prose
  implied. Most existing call sites (mainly in `tests/battle.test.mjs`)
  pass `rng` positionally as the 5th argument — inserting `options` before
  it would have silently turned every one of those into `options`,
  defaulting `rng` to `Math.random()` and breaking every deterministic-
  damage test. Callers that want the siege layout with default `rng`
  (`main.js`) pass `undefined` for `rng` to reach the `options` slot.
- `chooseAiCatapultTarget(state, side)` is a pure decision function (an
  `ai.js` addition, no import of `attackWall` needed there) — it only
  returns a target hex; `main.js`'s `playAiBattleTurn` is what actually
  calls `battle.js`'s `attackWall` with that decision, mirroring exactly
  how `chooseAiSpell`/`castSpell` are already split between the two
  modules.
- Found and fixed a real, pre-existing CSS bug while implementing the
  Fire Catapult panel: `.battle-spell-panel { display: flex }` (and
  `.battle-controls`, same issue) has no `[hidden]` override, so an
  author-stylesheet `display` declaration always wins over the browser's
  default `[hidden] { display: none }` regardless of specificity ties —
  meaning both panels stayed visibly rendered (empty/stale) even when
  JS set `.hidden = true`. This predates this feature (the spell panel
  had it since 003; `.battle-controls` since 001) but was only caught
  now because the new catapult panel reuses `.battle-spell-panel`'s
  class. Fixed by adding `.battle-spell-panel[hidden] { display: none;
  }` and `.battle-controls[hidden] { display: none; }`, matching the
  `.screen[hidden]` pattern that already existed for this exact problem.

## Out of scope (see spec.md Non-goals)

Siege towers/auto-attacking archers, a targetable/destroyable catapult
unit, line-of-sight blocking for ranged/spells, moat/other terrain types,
per-Castle or randomized layouts, wall repair, a Ballistics-style hero
stat affecting catapult damage, obstacles/catapult in non-siege battles.
