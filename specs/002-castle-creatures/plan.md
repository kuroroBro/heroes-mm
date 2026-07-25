# Implementation Plan: Castle & Creature Recruitment

**Spec**: [spec.md](./spec.md)
**Builds on**: `specs/001-hex-heroes/plan.md` (architecture, damage formula,
AI heuristics — all unchanged and reused here).

## Technical Context

| Aspect | Choice | Why |
| --- | --- | --- |
| Language/framework | Same as v1 — vanilla ES2020 modules, no build step, no framework | This is an in-place extension of the existing static site, not a new app. |
| New pure module | `js/castle.js` | Keeps build/recruit/pool rules DOM-free and unit-testable, matching `adventure.js`/`battle.js`/`ai.js`. |
| New content | `BUILD_COST`, `RECRUIT_COST` tables, likely co-located in `js/castle.js` (small enough not to need their own file, but split out if `castle.js` grows past ~150 lines) | Same "content module, hand-tabulated" convention as `creatures.js`/`resources.js`. |
| New screen | `screen-castle` added to `main.js`'s `SCREENS` array | Reuses v1's screen-routing pattern exactly. |
| Tests | `tests/castle.test.mjs`, `node --test` | Same harness as v1. |

## Architecture changes

```
js/castle.js            NEW — pure Castle rules: initCastle, unlock,
                         accrueGrowth, buildDwelling, recruitCreatures,
                         content tables BUILD_COST / RECRUIT_COST
js/army.js               NEW (not in the original plan, added during
                         implementation) — MAX_ARMY_SLOTS, mergeIntoArmy,
                         armyValue extracted out of adventure.js so
                         castle.js can reuse them without a circular
                         import (adventure.js -> castle.js for unlock/
                         accrueGrowth; castle.js -> adventure.js would
                         have been needed otherwise for mergeIntoArmy)
js/adventure.js          CHANGED — createHero() gets hero.castle; endDay()
                         accrues Castle pools instead of per-hex garrison;
                         resolveOccupancy() dwelling-capture branch calls
                         castle.unlock() instead of merging garrison;
                         kingdomScore() counts hero.castle.unlocked.size
                         instead of iterating owned dwelling hexes
js/mapObjects.js         CHANGED — dwelling objects drop the `garrison`
                         field (dead data once endDay stops writing it)
js/ai.js                 CHANGED — new chooseAiCastleActions(state, owner)
                         pure decision function (Decision #2 below)
js/main.js                CHANGED — screen-castle routing, render/input
                         wiring for the Castle screen, AI-turn hook calls
                         chooseAiCastleActions once per AI day
index.html                CHANGED — screen-castle markup, Castle button on
                         screen-adventure
css/styles.css            CHANGED — Castle screen layout (creature-tier
                         rows, build/recruit controls)
tests/castle.test.mjs     NEW — build/recruit/pool-accrual/unlock coverage
tests/adventure.test.mjs  CHANGED — dwelling-capture test updated for
                         unlock-not-merge behavior; kingdomScore tests
                         updated for the new dwelling-scoring source
tests/ai.test.mjs         CHANGED — new fixture coverage for
                         chooseAiCastleActions
```

### Decision #1: Castle state lives on the Hero, not on a hex

The Keep hex (`mapObjects.js`'s `KEEP_PLAYER`/`KEEP_AI`) stays exactly as
it is — home spawn/respawn position, `type: 'keep'`, no new passability or
capture logic. The Castle's build/pool/unlock state is a new field on the
`Hero` object (`hero.castle`), not a hex property, and the Castle screen
opens from a button, not from standing on a specific hex. This sidesteps
two things v1 never had to handle: sieging/attacking a town hex, and
whether an AI hero needs pathfinding logic to "go home to manage the
Castle" (it doesn't — `chooseAiCastleActions` runs as a state mutation
alongside the AI's movement turn, no travel involved). It also means the
existing `homeKeep()`/respawn code in `adventure.js` needs zero changes.

### Decision #2: Unlock is a boolean OR, not additive; build has no
prerequisites

A creature tier is either unlocked for a hero or it isn't — capturing its
map dwelling *and* building it in the Castle both just set the same flag,
with no bonus for doing both. This was an explicit tradeoff (spec.md
Non-goals) to avoid a second balance axis (how much production bonus is
"owning both" worth?) in a v1 of this feature; revisit only if playtesting
shows capturing map dwellings feels pointless once a hero can just buy
everything. Similarly, all 10 tiers are buildable independently with no
tech-tree gating — a "must build tier N-1 first" chain is the kind of
scope a full classic town screen has (Town Hall → Fort → Citadel →
Castle, per-dwelling upgrade chains) that this feature deliberately does
not attempt; see spec.md Non-goals.

### Decision #3: Content values — build and recruit costs

Hand-tabulated, following v1's existing convention (`MINE_YIELD`, creature
stat table) of transparent, explicitly-tunable numbers rather than a
derived formula. Baseline logic: recruit cost roughly tracks
`creaturePower()` (already defined in `creatures.js`) scaled so that one
day's Gold Mine income (1000 gold) comfortably buys a handful of low-tier
recruits or a fraction of a high-tier one; build cost is a bigger one-time
sink, roughly 8-12× that tier's per-unit recruit cost in gold-equivalent,
split across resources the map's mine layout (`mapObjects.js`) already
produces so a hero who's captured a spread of mines isn't stuck on any one
tier.

| tier | creature | recruit cost | build cost |
| --- | --- | --- | --- |
| 1 | Peasant | 30 gold | 200 wood |
| 2 | Pikeman | 60 gold | 400 wood, 200 ore |
| 3 | Archer | 120 gold | 800 wood, 400 ore |
| 4 | Wolf | 200 gold | 1200 ore |
| 5 | Orc | 300 gold, 1 ore | 1500 ore, 4 crystal |
| 6 | Griffin | 450 gold, 1 crystal | 2000 gold, 8 crystal |
| 7 | Ogre | 650 gold, 1 mercury | 2500 gold, 8 mercury |
| 8 | Skeleton | 500 gold *(cheap outlier — undead flavor, matches the genre's classic Skeleton pricing, see below)* | 1800 gold, 6 sulfur |
| 9 | Troll | 900 gold, 1 sulfur | 3500 gold, 10 sulfur |
| 10 | Dragon | 3000 gold, 2 gems, 2 sulfur, 2 mercury | 8000 gold, 15 gems |

The Skeleton (tier 8) is deliberately cheaper than its tier would suggest
— matching the original game's own pricing where undead/basic-melee units
undercut their tier peers — and is flagged here so a future tuning pass
doesn't "fix" it by accident. All figures are placeholder-tunable, same
status as v1's mine yields; balance is expected to move once the feature
is actually played.

### Decision #4: AI Castle heuristic — one build/day, greedy cheap-first recruit

`chooseAiCastleActions(state, owner)` in `ai.js`, called once per AI day
(same cadence as the existing adventure-map targeting call in v1's AI
turn orchestration):
1. **Build**: among not-yet-unlocked tiers the AI can currently afford,
   pick the lowest tier and build it (at most one build per day — avoids
   an AI that hoards resources for 5 days then dumps them all into
   Dragons the instant it can afford to, which would make the AI's
   economy swing unpredictably turn-to-turn; one-per-day keeps its growth
   curve smooth and cheap to reason about in tests).
2. **Recruit**: iterate unlocked tiers lowest-to-highest; for each, spend
   down available resources and pool on that tier before moving to the
   next, stopping the moment resources or army slots run out. This
   mirrors the "cheap, deterministic, testable" bar set by v1's existing
   heuristics (`specs/001-hex-heroes/plan.md` Decision #5) — no attempt at
   an optimal spend allocation, just a legible, always-terminating loop.

### Decision #5: Kingdom Score source-of-truth moves from hex to hero

v1's `kingdomScore()` looped `state.hexes.values()` counting owned
dwellings. Since a hero can now unlock a tier without ever owning its map
hex, that loop would undercount. `kingdomScore()` switches its dwelling
term to `hero.castle.unlocked.size * 15` — same point value per tier,
different source. Mine scoring (`+10` per owned mine hex) is untouched;
mines aren't part of this feature.

## Changelog

- **v1.1 (design)** (2026-07-18): Spec + plan authored. Not yet
  implemented — see tasks.md for the phased build-out. No code changes in
  this pass.
