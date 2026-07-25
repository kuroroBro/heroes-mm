# Feature Specification: Castle Sieges & Hero Spells

**Feature branch**: `003-siege-and-spells`
**Status**: Draft
**Created**: 2026-07-24
**Depends on**: `specs/001-hex-heroes` (core loop), `specs/002-castle-creatures`
(Castle economy, hero.castle, army.js)

## Overview

This feature reopens two things earlier rounds explicitly deferred: 001's
"no magic/spells system" Non-goal, and 002's "no castle combat/siege"
Non-goal ("a Castle can't be attacked... there's nothing on the map to
besiege"). Together they add:

1. **Hero spells** — a small spellbook system. A hero learns spells at
   their Castle (one-time resource cost, extending the build/recruit
   screen from 002) and casts them in battle by spending **mana** (a new
   per-hero pool that fully refills every day, like movement points).
   Casting is a free action — it doesn't consume a creature stack's turn,
   matching how spellcasting works in the original game.
2. **Castle sieges** — the enemy's Keep hex becomes attackable. Walking a
   hero onto the enemy's Keep always starts a battle: if the enemy hero is
   standing there, that's today's hero-vs-hero fight, now fought at home
   turf (a small defense bonus) with both heroes able to cast; if the
   enemy hero is away, the attacker instead fights a **militia** — a
   defending stack automatically drafted from the enemy's Castle recruit
   pool, with no hero of its own (so no spells on defense).

Spellcasting is available to **any hero present in a battle** — hero-vs-
hero, sieges, and a hero's own guard/monster fights (attacker side only,
since neutral guards and militias have no hero). "Creatures they carry
with them" — a hero's army fighting alongside them — is unchanged from
001/002; this feature only adds the hero as an actor in their own right.

## User Stories

### US-1: Learn spells at the Castle
As a player, I want to spend resources at my Castle to permanently learn a
spell, so my hero becomes more capable over time, the same way building a
dwelling permanently unlocks a creature tier.

**Acceptance criteria**
- The Castle screen gains a **Spells** section listing all 6 v1 spells
  (plan.md's content table). Each row shows: known or not; if not known,
  its learn cost and a **Learn** button (enabled only if affordable,
  deducts the full cost, all-or-nothing — same pattern as 002's
  `buildDwelling`); if known, its mana cost and effect summary.
- Learning is permanent for the rest of the game (no un-learning, no
  per-game spell limit) and costs no mana — only the one-time resource
  cost.

### US-2: Mana economy
As a player, I want my hero to have a mana pool that limits how often I
can cast, so spells are a resource to manage rather than a free
always-on button.

**Acceptance criteria**
- Every hero starts at 0/`manaMax` mana (mana is not part of the starting
  kit — matches 002's precedent that Castle-gated power starts at zero).
  `manaMax` is a flat constant, uniform across hero types (plan.md content
  table), matching 001's "movement kept uniform, no per-type bias" v1
  philosophy for anything not explicitly differentiated.
- `endDay` refills every hero's mana to `manaMax`, the same way it refills
  movement points.
- A hero whose whole army is wiped and who respawns at their home Keep
  (001 US-6) also has their mana fully restored — "returned home and
  recovered," matching how their army is also restocked to the starting
  kit.

### US-3: Cast a spell in battle
As a player, I want to spend mana mid-battle to cast a known spell, so I
can turn a fight with magic instead of only creature actions.

**Acceptance criteria**
- Whenever it is a stack belonging to your side's turn (attacker or
  defender), and your hero hasn't already cast a spell this **round**, and
  you know at least one spell you can afford, a spell-casting option is
  available alongside that stack's move/attack/wait/defend choices.
  Casting does not end the acting stack's turn or advance the turn order —
  it's a separate, free hero action, at most once per side per round.
- Damage spells (Magic Arrow, Fireball) deal their flat listed damage
  directly to the target stack(s)' HP pool, **ignoring the target's
  Defense** — unlike a creature attack, magic damage does not run through
  the attack/defense skew formula (001 plan.md Decision #2 stays
  creature-attack-only).
- Buff/debuff spells (Bless, Curse, Haste) add their flat stat modifier to
  every stack on the target side for a fixed number of rounds, then expire
  automatically; multiple casts of the same buff do not stack past its
  refreshed duration (recasting simply resets the duration).
- Heal restores HP to one of your own stacks, capped at that stack's
  current headcount's max HP — it cannot revive creatures already lost
  from the stack (no resurrection; see Non-goals).
- A side with no hero present (a neutral guard, or an undefended Castle's
  militia — see US-5) never has a casting option; only heroes cast.

### US-4: Siege the enemy Castle
As a player, I want to attack the enemy's home Keep directly, so I have a
way to strike at their economy even when I can't catch their hero out in
the open.

**Acceptance criteria**
- Walking your hero onto the enemy's Keep hex always starts a battle
  (previously a no-op — 001's `resolveOccupancy` did nothing for `'keep'`
  hexes). Your own Keep hex is unaffected (never triggers a battle for its
  owner).
- If the enemy hero is standing on their own Keep when you arrive, this is
  the existing hero-vs-hero trigger (001 US-2), fought as a siege (see
  US-6 for the home-turf bonus) rather than a plain field battle.
- If the enemy hero is away, you instead fight their **militia** (US-5).
- Winning a siege against an empty castle's militia **loots** the
  defending hero — see US-5 — but does **not** capture the Keep, change
  its `ownerId`, or end the game. Only directly defeating the enemy hero
  (whether in the open, in a siege, or in any hero-vs-hero fight) still
  ends the game, unchanged from 001 US-6. This is a deliberate scope
  boundary — see Non-goals.

### US-5: An undefended Castle fights back with a militia
As a player attacking an empty enemy Castle, I want there to be something
defending it, so sieging is always a real fight, not a free win — and as
the defender, I want my stockpiled-but-unrecruited creatures to matter
even when I'm not standing at home.

**Acceptance criteria**
- When a siege targets an empty Castle (enemy hero away), the defending
  army is drafted from the enemy hero's `castle.pool`: every creature type
  with `unlocked && pool > 0`, highest tier first, up to 7 stacks (the
  same `MAX_ARMY_SLOTS` cap armies already respect). Drafted amounts are
  removed from the pool for the duration of the battle. A Castle with an
  empty pool (nothing unlocked, or everything already recruited) is
  defended by an empty militia — an automatic win for the attacker with
  nothing to loot but resources.
- If the militia wins (repels the attacker), its surviving stacks return
  to the defender's `castle.pool` — they were never lost, just drafted.
  The attacker's army is wiped and the attacker respawns at their own home
  Keep with a fresh starting army and full mana, identical to losing any
  other neutral-guard fight (001 US-6) — sieging carries the same real
  risk as any other fight.
- If the attacker wins, drafted militia creatures that didn't survive are
  gone for good (removed from the pool, not returned), and the attacker
  **loots 40% of every resource** the defending hero currently holds
  (plan.md content value), transferred straight into the attacker's own
  resources. The attacker's surviving army returns to them as normal.
- The militia has no hero — it never casts spells, and grants no hero-bonus
  attack/defense to its stacks (US-3's "no hero, no casting" rule).

### US-6: Home-turf defense bonus
As the defending player, I want a small edge for fighting at my own
Castle, so a siege feels different from an open-field clash even when
both heroes are present.

**Acceptance criteria**
- When a hero-vs-hero battle is triggered by the attacker reaching the
  defender's own Keep hex (US-4), every defending stack gets a flat +2
  Defense bonus for that battle only (plan.md content value) — on top of
  the defender hero's normal Attack/Defense bonus, the same mechanism
  `defendStack`'s existing +3-Defense-while-defending bonus already uses.
  A hero-vs-hero fight anywhere else on the map (both heroes just
  colliding away from any Keep) gets no such bonus, unchanged from 001.

### US-7: The AI besieges, defends, and casts too
As a player, I want the AI opponent to use sieges and spells as well, so
this isn't a player-only advantage.

**Acceptance criteria**
- The AI's existing adventure-map targeting (001 `aiSelectTarget`) gains a
  new, lower-priority option: if nothing free or winnable is available
  (001 plan.md Decision #5's existing tiers), and the AI's army/spell
  power clearly exceeds the enemy Castle's estimated militia strength (the
  same `WINNABLE_POWER_MARGIN` comparison already used for guarded
  targets), the AI targets the enemy Keep to raid it, before falling back
  to just chasing the enemy hero directly.
- In any battle where the AI has a hero present with mana and a known,
  affordable spell, it casts once per round using a simple deterministic
  heuristic (plan.md Decision) — favoring a damage spell against multiple
  enemy stacks, then a single-target damage spell, then a self-buff when
  behind on power, else it saves mana.
- The AI learns spells at its own Castle using the same "cheapest
  affordable first" pattern 002 already established for building
  dwellings (extends `chooseAiCastleActions`).

## Functional Requirements

- FR-1: A new pure content module `js/spells.js` defines the 6 v1 spells
  (id, manaCost, learnCost, effect, target, magnitude/duration — plan.md's
  content table), matching the "hand-tabulated, explicitly tunable"
  convention of every other content module.
- FR-2: `Hero` gains `mana`, `manaMax`, and `spellbook` (a `Set<spellId>`,
  same shape convention as `hero.castle.unlocked`). `castle.js` gains
  `canAffordLearnSpell`/`learnSpell(state, owner, spellId)` alongside its
  existing build/recruit functions.
- FR-3: `battle.js` gains a `castSpell(state, side, spellId, targetId?)`
  pure action function, a per-stack `buffs` list (stat/amount/roundsLeft)
  that decays each round alongside the existing retaliation-flag reset,
  and folds spell-derived Attack/Defense/Speed modifiers into
  `computeDamage`/turn-order the same way `heroBonus` already does.
  `createBattle`'s existing `attackerBonus`/`defenderBonus` parameters
  gain optional `mana`/`spellsKnown` fields — omitting them (as every
  existing guard/monster call site does) means that side has no hero and
  cannot cast, with no changes required at those call sites.
- FR-4: `adventure.js`'s `moveHero` gains a third battle-trigger case
  (alongside hero-vs-hero and guard) for walking onto the enemy's Keep
  hex, producing `pendingBattle.defenderKind: 'siege'`.
  `getPendingBattleArmies`/`resolveBattleOutcome` gain siege-specific
  handling: drafting/returning the militia from `castle.pool`, the
  home-turf defense bonus, and the resource-loot outcome (US-5/US-6)
  instead of a mine/dwelling capture.
- FR-5: `ai.js` gains `chooseAiSpell` (battle-turn heuristic) and extends
  `aiSelectTarget` with the siege-targeting tier (US-7), plus extends
  002's `chooseAiCastleActions` to also learn spells.
- FR-6: UI (`index.html`/`css/styles.css`/`js/main.js`): a Spells section
  on the Castle screen (US-1), and spell-cast controls on the battle
  screen surfaced whenever the player's hero can currently cast (US-3).

## Non-goals (this feature)

- **No resurrection** — Heal only reduces `hpDamage` within a stack's
  current headcount; it cannot bring back creatures already lost from the
  stack, unlike the original game's higher-tier resurrection spells.
- **No permanent Castle capture** — winning a siege loots resources and
  militia losses only; it never changes the Keep's `ownerId`, never
  relocates a hero's home position, and never ends the game by itself.
  Only directly defeating the enemy hero still ends the game (001 US-6,
  unchanged). This is the single biggest scope cut versus a "real" siege
  system, and is what keeps `homeKeep()`/respawn/Kingdom Score untouched.
- **No spell resistance, immunity, or creature-specific magic
  interactions** — every stack takes/receives spell effects identically
  regardless of creature type.
- **No mana potions, items, or any other mana source** besides the daily
  full refill.
- **No new hero stat** (e.g. "Knowledge"/"Spell Power") — `manaMax` and
  every spell's magnitude are flat v1 constants, keeping 001's
  Attack/Defense-only hero stat philosophy intact.
- **No siege-specific battlefield terrain** (walls, moat, gate)
  *(superseded — see `specs/004-siege-battlefield`, which adds a wall/
  gate obstacle layout specifically for siege battles; left here as the
  historical record of this feature's original scope)* — a siege uses the
  same open 11×9 battlefield as every other battle, matching 001's
  existing "no battlefield obstacles" Non-goal.
- **No multi-hero or multi-Castle interactions** — v1 still has exactly
  one hero and one Castle per side (001/002 Non-goals, unchanged).
- **No neutral-guard or militia spellcasting** — only heroes cast; a side
  with no hero present never gets a casting option.

## Key Entities (additions/changes to 001/002)

- **Hero** gains: `mana: number`, `manaMax: number`, `spellbook:
  Set<SpellId>`.
- **Spell**: `{ id, name, manaCost, learnCost: { [Resource]: number },
  effect: 'damage'|'heal'|'buff'|'debuff', target:
  'singleEnemy'|'allEnemies'|'singleAlly'|'allAllies', power?: number,
  stat?: 'attack'|'defense'|'speed', amount?: number, durationRounds?:
  number }`.
- **BattleStack** gains: `buffs: { stat, amount, roundsLeft }[]`.
- **BattleState**'s `attackerBonus`/`defenderBonus` (passed into
  `createBattle`) gain optional `mana`/`spellsKnown` fields; internally
  the engine tracks a `hasCastThisRound` flag per side with a hero
  present.
- **PendingBattle** (`adventure.js`) gains `defenderKind: 'siege'`
  alongside the existing `'hero'`/`'guard'`, with defender army sourced
  from a drafted militia when the defending hero is away.
