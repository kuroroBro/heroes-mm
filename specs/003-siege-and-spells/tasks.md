# Tasks: Castle Sieges & Hero Spells

**Plan**: [plan.md](./plan.md)

## Phase 1 — Spell content & Castle learning

- [x] `js/spells.js` — `SPELLS` table (plan.md content table), `getSpell(id)`
  lookup (mirrors `creatures.js`'s `getCreature`).
- [x] `js/castle.js` — `canAffordLearnSpell(hero, spellId)`,
  `learnSpell(state, owner, spellId)` (exact mirror of
  `canAffordBuild`/`buildDwelling`, writing to `hero.spellbook` instead of
  `hero.castle.unlocked`).
- [x] `js/adventure.js` — `createHero()` adds `mana: 0`, `manaMax:
  MANA_MAX`, `spellbook: new Set()`.
- [x] `tests/spells.test.mjs` — spell table sanity (every spell has a
  valid effect/target shape); `tests/castle.test.mjs` additions —
  learnSpell affordability, all-or-nothing, idempotent-ish (learning an
  already-known spell is rejected or a no-op — decide and test).

## Phase 2 — Battle engine: spellcasting

- [x] `js/battle.js`: `createBattle`'s `attackerBonus`/`defenderBonus`
  accept optional `{ mana, spellsKnown }`; internal per-side
  `hasCastThisRound` tracking; `castSpell(state, side, spellId,
  targetId?)` (plan.md Decision #1) — validates side has a hero, knows
  the spell, hasn't cast this round, has enough mana; applies
  damage/heal/buff/debuff (Decisions #2/#3); does not call `advanceTurn`.
- [x] `advanceTurn`'s round-wrap branch also resets `hasCastThisRound` for
  both sides and decrements/prunes every stack's `buffs` list.
- [x] `computeDamage` and `speedOf` fold in matching `buffs` entries
  (plan.md Decision #3).
- [x] `tests/battle.test.mjs` — cast a damage spell (bypasses defense,
  exact flat damage), cast Fireball (hits every enemy stack), cast a buff
  (raises effective attack/speed for its duration, expires on schedule,
  recast replaces rather than stacks), cast Heal (reduces hpDamage,
  cannot revive lost creatures), reject: no mana, unknown spell, already
  cast this round, no hero on that side, casting doesn't advance turn
  order.

## Phase 3 — Sieges

- [x] `js/adventure.js`: `moveHero` gains the siege trigger (plan.md
  Decision #4) producing `pendingBattle.defenderKind: 'siege'`;
  `getPendingBattleArmies` drafts the militia from the defender's
  `castle.pool` (highest-tier-first, `MAX_ARMY_SLOTS` cap) and applies the
  home-turf bonus when the defender hero is present (Decision #5);
  `resolveBattleOutcome` handles both siege outcomes — militia win
  (survivors returned to `castle.pool`) and attacker win (40% resource
  loot, Decision #6, no `ownerId` change on the Keep).
- [x] `endDay` refills `mana` to `manaMax` for both heroes alongside
  movement and Castle pool growth; respawn (US-6's existing "wiped army"
  branch in `resolveBattleOutcome`) also restores `mana` to `manaMax`.
- [x] `tests/adventure.test.mjs` — siege trigger fires walking onto an
  empty enemy Keep; hero-vs-hero still fires (with the home-turf bonus)
  when the defender is home; militia drafted correctly from pool
  (highest-tier-first, cap, pool debited immediately); militia win
  returns survivors to pool and wipes/respawns the attacker (mana + army
  reset); attacker win loots exactly 40% per resource and leaves
  `ownerId`/game state otherwise unchanged; empty-pool Castle is an
  uncontested raid.

## Phase 4 — AI

- [x] `js/ai.js` — `chooseAiSpell(state, side)` (plan.md Decision #7);
  `aiSelectTarget` gains the siege-targeting tier (Decision #8);
  `chooseAiCastleActions` also learns the cheapest affordable
  not-yet-known spell (mirrors its existing one-build-per-day rule).
- [x] `js/main.js` — battle-turn AI orchestration calls `chooseAiSpell`
  once per round for the AI's side, alongside its existing move/attack
  choice.
- [x] `tests/ai.test.mjs` — `chooseAiSpell` fixture coverage (Fireball
  preferred with 2+ enemies, Magic Arrow on the weakest single enemy,
  self-buff when behind on power, no-op when nothing affordable);
  `aiSelectTarget` siege-tier coverage (targets the Keep only when no
  free/winnable target exists and militia power is beatable; skips it
  when the defending hero is home).

## Phase 5 — UI

- [x] `index.html`/`css/styles.css` — Castle screen **Spells** section
  (mirrors the existing creature-tier rows: known/not, cost, Learn
  button); battle screen spell-cast controls (spell picker + target
  picker, shown only when the player's hero can currently cast).
- [x] `js/main.js` — render/wire the above; `renderCastle` extended with
  the spells list; battle rendering shows remaining mana and gates the
  cast UI on `hasCastThisRound`/affordability, same disabled-button
  pattern 002 established.

## Phase 6 — Docs

- [x] `specs/001-hex-heroes/spec.md` — annotate the "no magic/spells
  system" Non-goal as superseded (mirrors how 002 annotated 001's
  Decision #3).
- [x] `specs/002-castle-creatures/spec.md` — annotate the "no castle
  combat/siege" Non-goal as superseded, with a pointer to this feature.
- [x] `README.md` — extend the walkthrough with spellcasting and sieging.

## Resolved during implementation

- `pendingBattle` for a siege carries both `defenderOwner` (reusing the
  field the `'hero'` kind already has, rather than re-deriving it from
  the hex each time) and a `militia` snapshot array — the exact stacks
  `draftMilitia` drafted at trigger time. Not mentioned explicitly in
  plan.md's Decision #4, but needed so `resolveBattleOutcome` can compute
  siege XP from the pre-battle militia composition without re-reading a
  since-mutated pool.
- `resolveBattleOutcome` gained a 4th parameter, `remainingMana` (`{
  attacker?, defender? }`), rather than syncing battle-final mana back
  onto the adventure-level hero from `main.js` separately — keeps all
  post-battle hero mutation (army, XP, position, mana, respawn) in one
  place in `adventure.js`, and lets the respawn branches' full-mana
  restore reliably override it in the right order.
- `js/army.js` (from `specs/002-castle-creatures`) already existed and
  needed no changes — `castle.js`'s `draftMilitia`/`returnMilitiaSurvivors`
  only needed `MAX_ARMY_SLOTS`, not `mergeIntoArmy`.
- `createBattle` now calls `checkBattleEnd` once immediately after setup.
  Previously unreachable (every existing caller always passed two
  non-empty armies), but an undefended Castle's militia can legitimately
  be empty (US-5) — without this, a battle starting already-decided would
  stall forever, since `checkBattleEnd` otherwise only ever runs as a side
  effect of an action.

## Out of scope (see spec.md Non-goals)

Resurrection, permanent Castle capture, spell resistance/immunity, mana
items/potions, a new "Knowledge"/Spell Power hero stat, siege battlefield
terrain, multiple heroes/Castles per side, neutral/militia spellcasting.
