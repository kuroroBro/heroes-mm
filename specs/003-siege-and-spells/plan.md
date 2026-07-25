# Implementation Plan: Castle Sieges & Hero Spells

**Spec**: [spec.md](./spec.md)
**Builds on**: `specs/001-hex-heroes/plan.md` (battle engine, damage
formula, AI heuristics), `specs/002-castle-creatures/plan.md` (Castle
economy, `army.js`).

## Technical Context

| Aspect | Choice | Why |
| --- | --- | --- |
| Language/framework | Same as 001/002 — vanilla ES2020 modules, no build step | In-place extension, not a new app. |
| New content | `js/spells.js` — 6 spells, hand-tabulated | Same convention as `creatures.js`/`castle.js`'s cost tables. |
| Tests | `tests/spells.test.mjs` (new), `battle.test.mjs`/`adventure.test.mjs`/`ai.test.mjs` extended | Same `node --test` harness. |

## Architecture changes

```
js/spells.js             NEW — pure content: SPELLS table (id, manaCost,
                          learnCost, effect, target, magnitude/duration)
js/battle.js              CHANGED — castSpell(state, side, spellId,
                          targetId?) action; per-stack `buffs` list;
                          computeDamage/speedOf fold in buff modifiers;
                          createBattle's bonus params gain optional
                          mana/spellsKnown; round-wrap also decays buffs
                          and resets hasCastThisRound per side
js/castle.js               CHANGED — canAffordLearnSpell, learnSpell
                          (mirrors buildDwelling exactly)
js/adventure.js            CHANGED — createHero() gets mana/manaMax/
                          spellbook; moveHero() gains the siege trigger;
                          getPendingBattleArmies()/resolveBattleOutcome()
                          gain siege handling (militia draft/return, loot,
                          home-turf bonus); endDay() refills mana
js/ai.js                   CHANGED — chooseAiSpell(state, side) battle
                          heuristic; aiSelectTarget() gains the siege
                          tier; chooseAiCastleActions() also learns spells
js/main.js                  CHANGED — Castle screen Spells section; battle
                          screen spell-cast controls
index.html/css/styles.css   CHANGED — markup/styling for the above
tests/spells.test.mjs       NEW
tests/battle.test.mjs       CHANGED — castSpell coverage (damage/heal/
                          buff/debuff, once-per-round, no-hero-no-cast)
tests/adventure.test.mjs    CHANGED — siege trigger, militia draft/return,
                          loot, home-turf bonus, mana refill on endDay
                          and on respawn
tests/ai.test.mjs           CHANGED — chooseAiSpell, siege targeting tier
```

### Decision #1: Casting is a free, side-scoped action — not a stack action

Every existing battle action (`moveStack`/`attackStack`/`waitStack`/
`defendStack`) requires `state.activeStackId === stackId` and ends with
`advanceTurn`. Hero spellcasting in the original game is explicitly
*not* a creature's action — a hero can cast once per combat round
independent of which stack is currently acting. `castSpell(state, side,
spellId, targetId?)` therefore only requires that **some stack belonging
to `side` is currently active** (`getStack(state,
state.activeStackId).side === side`), and never calls `advanceTurn` — it
resolves immediately and leaves turn order untouched. This is the
smallest change that preserves the existing turn-order engine unmodified
while giving each side's hero a once-per-round window to act, and avoids
inventing a battlefield position/movement model for heroes themselves
(heroes still have no hex position in battle — only their stacks do).

`hasCastThisRound` is tracked per side (`attacker`/`defender`) inside
`BattleState`, reset to `false` for both sides at every round wrap
(`advanceTurn`'s existing "wrapped to a new round" branch, right next to
where `hasRetaliatedThisRound` already resets).

### Decision #2: Magic damage bypasses the attack/defense skew formula

001 plan.md Decision #2's skew formula (`multiplier = 1 + min(skew, 60) *
0.05`, etc.) is specifically a *creature* attack/defense interaction.
Spell damage is a flat number (`spell.power`) applied directly via the
existing `applyDamage(stack, damage)` helper, with no skew multiplier —
matching the original game's magic damage generally bypassing Defense.
This keeps `computeDamage` (the creature-vs-creature formula) completely
unchanged; spells get their own small `applySpellDamage` path in
`battle.js` that just calls `applyDamage` directly.

### Decision #3: Buffs are a per-stack duration list, folded into existing stat lookups

`BattleStack` gains `buffs: { stat: 'attack'|'defense'|'speed', amount,
roundsLeft }[]`. `computeDamage`'s `effectiveAttack`/`effectiveDefense`
and `speedOf`'s speed lookup both sum `creature.<stat> + heroBonus.<stat>
+ sum(buffs matching <stat>).amount` — one extra term next to the
`heroBonus` term that's already there, no new call sites needed since
every damage/turn-order calculation already funnels through those two
functions. Buffs decay by 1 `roundsLeft` at every round wrap (same
`advanceTurn` branch as Decision #1's `hasCastThisRound` reset) and are
filtered out at 0. Recasting the same buff on a stack that already has it
replaces (does not stack) — implemented by removing any existing buff of
the same `stat` from that stack before adding the new one.

### Decision #4: Sieges are a third `pendingBattle.defenderKind`

`moveHero`'s existing battle-trigger order (hero-vs-hero check, then
guard check) gains a third check: if the target hex is a `'keep'` object
with `ownerId !== owner` (the enemy's Keep) and the hero-vs-hero check
above it didn't already fire (i.e. the enemy hero isn't standing there),
set `pendingBattle.defenderKind = 'siege'`. `getPendingBattleArmies`
handles it by drafting a militia from `state.heroes[defenderOwner].castle`
(spec.md US-5's highest-tier-first, 7-stack cap — reusing
`MAX_ARMY_SLOTS` from `army.js`) with `defenderBonus = { attack: 0,
defense: 0 }` (no hero, no `spellsKnown`, so `battle.js` naturally treats
that side as having no caster per Decision #1). Drafted amounts are
subtracted from `castle.pool` immediately (before the battle starts, so a
loss or a win are both already reflected in the pool without a second
write). `resolveBattleOutcome` gains a `defenderKind === 'siege'` branch:
on a militia win, `survivingStacks(battleState, 'defender')` are merged
back into `castle.pool` by type (reuses the same "merge into a bucket"
shape `mergeIntoArmy` already handles, just targeting `pool` instead of
`army` — a small local helper, not `army.js`'s `mergeIntoArmy` itself,
since pool entries are plain counts per type, not slotted stacks); on an
attacker win, resources are looted (Decision #6) and the attacker's
position/army resolve exactly like a won guard fight, **except** the Keep
object itself is never mutated (no `ownerId` flip, no capture) — see
spec.md's "no permanent Castle capture" Non-goal.

Note this reuses `pendingBattle.hex` to identify *which* Keep was hit —
`getObject(state, pending.hex).ownerId` gives the defending owner without
adding a new field to `pendingBattle`.

### Decision #5: Home-turf bonus is applied at battle-army construction time, not in battle.js

When `pending.defenderKind === 'hero'` **and** `pending.hex` equals the
defender's own `homeKeep(defenderOwner)`, `getPendingBattleArmies` adds a
flat `+2` to `defenderBonus.defense` before calling `createBattle`. This
keeps the bonus a one-line addition at the point where bonuses are
already assembled, rather than teaching `battle.js` about Keep hexes at
all (it stays fully DOM-and-map-free, matching 001 FR-1).

### Decision #6: Siege loot is a flat 40% of the defender's current resources

On a successful raid (attacker wins a siege against an away defender),
`Math.floor(hero.resources[r] * 0.4)` of every resource transfers from
defender to attacker. Flat and simple, matching 002 plan.md Decision #3's
"hand-tabulated, explicitly tunable" stance — 40% is a deliberately
punishing-but-not-crippling number chosen so leaving a Castle completely
undefended is a real risk without being an instant-death economic wipe.
A hero-vs-hero siege (defender home, US-6) never loots — defeating the
hero already ends the game via the unchanged 001 win condition, so
there's nothing left to loot into.

### Decision #7: AI spell heuristic

`chooseAiSpell(state, side)`, called once per round whenever it's that
side's stack's turn and it hasn't cast yet (mirrors Decision #1's
gating): if 2+ enemy stacks are alive and Fireball is known+affordable,
cast it; else if Magic Arrow is known+affordable, cast it on the
lowest-remaining-HP enemy stack (reusing the same "finish off the
weakest" logic `aiChooseBattleAttack` already uses); else if the AI's
current total army power (`creaturePower`-summed, 001 plan.md Decision
#5's existing formula) is below the enemy's and Bless or Haste is
known+affordable, cast it on itself; else cast nothing and save mana.
Cheap, deterministic, and testable with the same fixture style as every
other `ai.js` heuristic.

### Decision #8: AI siege targeting is a new, low-priority tier

`aiSelectTarget` (001 plan.md Decision #5) already orders candidates:
nearest free capture > nearest winnable guarded target > the enemy hero's
position as a fallback. This feature inserts one more tier **between**
those last two: if the enemy Keep is reachable, the enemy hero is *not*
currently standing there (no point sieging into a losing hero-fight when
a militia raid was the cheaper option), and the AI's army power ×
`WINNABLE_POWER_MARGIN` (1.2, unchanged) exceeds the estimated militia
power (`creaturePower`-summed over the defender's current
`castle.pool`), the AI targets the Keep. This only ever fires when
nothing free or normally-winnable exists on the map, keeping the AI's
existing priorities (expand economy first) intact.

### Content values

**Spells** (`js/spells.js`) — id / manaCost / learnCost / effect:

| id | name | mana | learn cost | effect |
| --- | --- | --- | --- | --- |
| magicArrow | Magic Arrow | 8 | 400 gold, 2 crystal | 15 flat dmg, one enemy stack |
| fireball | Fireball | 20 | 1500 gold, 6 sulfur | 10 flat dmg, every enemy stack |
| bless | Bless | 10 | 800 gold, 2 gems | +3 attack, all ally stacks, 3 rounds |
| curse | Curse | 10 | 800 gold, 3 sulfur | −3 attack, all enemy stacks, 3 rounds |
| haste | Haste | 12 | 1000 gold, 3 mercury | +3 speed, all ally stacks, 3 rounds |
| heal | Heal | 15 | 1200 gold, 4 crystal | restore 20 HP, one ally stack (no revive) |

Same status as every other content table in this project: hand-tabulated
and explicitly tunable, not balance-tested.

**Mana**: `MANA_MAX = 50`, uniform across all 3 hero types (matches 001's
uniform-movement precedent). Starts at 0, fully refills every `endDay`
and on any hero respawn.

**Siege**: militia draft cap = `MAX_ARMY_SLOTS` (7, from `army.js`),
highest-tier-first. Home-turf defense bonus = **+2 Defense** to all
defending stacks. Raid loot = **40%** of the defending hero's current
resources (floored per-resource).

## Changelog

- **v1.2 (design)** (2026-07-24): Spec + plan authored. Not yet
  implemented — see tasks.md for the phased build-out.
