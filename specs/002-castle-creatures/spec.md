# Feature Specification: Castle & Creature Recruitment

**Feature branch**: `002-castle-creatures`
**Status**: Draft
**Created**: 2026-07-18
**Depends on**: `specs/001-hex-heroes` (v1 core loop, shipped)

## Overview

v1 shipped with no town economy: `specs/001-hex-heroes/plan.md` Decision #3
deliberately chose "dwellings grant creatures passively" over a
town-building/recruiting screen, to keep the first release small. This
feature reopens that decision and replaces the passive model with a real
**Castle**: a per-hero town screen where captured or self-built dwellings
produce a daily pool of available creatures, and the hero spends resources
to recruit them into their army.

Each hero has exactly **one Castle**, tied to the hero (not to a specific
hex — no travel required to manage it, matching how the original game lets
you manage a town screen without your hero standing in it). The Castle
screen is reachable at any time from the adventure screen via a **Castle**
button, for the player; the AI manages its own Castle via new deterministic
`ai.js` heuristics with no UI.

A creature type's production line is **unlocked** for a hero one of two
ways:
1. **Capture its dwelling** on the adventure map (existing mechanic —
   walking onto an unguarded/cleared dwelling hex), same as v1, or
2. **Build it** in the Castle screen, paying a one-time resource cost —
   new in this feature, and the headline reason a hero would want a Castle
   screen at all, since it makes creature tiers reachable without ever
   finding (or being able to beat the guard on) their map dwelling.

Either route flips the same boolean per creature type per hero — there is
no bonus for owning both. Once unlocked, that type's `growthPerDay`
creatures accrue into the hero's Castle **recruit pool** every day (`endDay`,
replacing v1's per-hex `garrison` field). Recruiting spends gold (and for
higher tiers, a secondary resource) to move creatures from the pool into
the hero's army.

## User Stories

### US-1: Open the Castle
As a player, I want to check on my Castle at any point in my turn, so I can
plan builds and recruits without needing to physically travel to a hex.

**Acceptance criteria**
- A **Castle** button is always visible on the adventure screen while it's
  the player's turn (`phase === 'playing'`). Clicking it opens the Castle
  screen; a **Close** button returns to the adventure screen with no state
  change beyond whatever was explicitly built/recruited.
- Opening/closing the Castle screen costs no movement points and doesn't
  end the day.
- The Castle screen lists all 10 creature tiers. Each row shows: unlocked
  or not; if unlocked, current pool count and `growthPerDay`; if not
  unlocked, the build cost and whether the hero can currently afford it.

### US-2: Build a dwelling
As a player, I want to pay resources to unlock a creature tier I haven't
captured on the map, so a bad map position (far from that tier's dwelling,
or a guard I can't beat) doesn't permanently lock me out of that unit.

**Acceptance criteria**
- For any creature tier not yet unlocked, if the hero's resources meet or
  exceed that tier's build cost (see plan.md content table), a **Build**
  button is enabled; clicking it deducts the full cost immediately and
  marks the tier unlocked for that hero, effective starting the *next*
  `endDay` (today's pool contribution, if any, is unaffected by building
  later the same day — no retroactive/partial-day production).
- Building a tier the hero already has unlocked (via capture or an earlier
  build) is not offered — the row shows pool/recruit controls instead (see
  US-3).
- Insufficient resources disable the Build button; it does not partially
  deduct or go negative.

### US-3: Recruit creatures
As a player, I want to spend resources to convert my accrued creature pool
into army stacks, so my daily economy translates into combat power on my
own schedule.

**Acceptance criteria**
- For each unlocked tier with pool > 0, the row shows a quantity control
  (default/max clamped to `min(pool available, resources affordable, room
  left in a matching or free army slot)`) and a **Recruit** button.
- Recruiting `n` units deducts `n * recruitCost` from the hero's resources
  (rejected outright, no partial recruit, if unaffordable) and `n` from the
  pool, then merges `n` creatures of that type into the hero's army using
  the same slot rules as v1's dwelling-visit merge (existing stack first,
  else a free slot up to 7, else the recruit is capped at whatever fits and
  the rest stays in the pool for a later recruit once a slot frees up).
- Recruiting is unlimited in frequency per day (no "once per day" gate) —
  only resources and pool size limit it.

### US-4: Capturing a dwelling unlocks it (not an instant garrison merge)
As a player, I want capturing a map dwelling to plug straight into the same
Castle economy as a built one, so there's one mental model for "how do I
get more Griffins" regardless of source.

**Acceptance criteria**
- Walking onto an unguarded or newly-cleared dwelling hex (v1's US-2/US-5
  capture flow) flips its `ownerId` as before, but instead of granting any
  waiting garrison directly to the army, it marks that hex's `creatureTypeId`
  unlocked in the capturing hero's Castle (same effect as US-2's Build,
  zero resource cost). If the tier was already unlocked (e.g. previously
  built), capturing the hex has no further economic effect beyond the
  ownership flag and Kingdom Score (unchanged — see plan.md).
- The dwelling hex itself no longer tracks a `garrison` count; daily
  production for that tier lives entirely in the owning hero's Castle pool
  from here on (see FR-2).

### US-5: AI manages its own Castle
As a player, I want the AI opponent to also build and recruit, so the
Castle isn't a purely single-player advantage that trivializes the AI.

**Acceptance criteria**
- Once per AI day (alongside its existing movement turn, see v1 US-3), the
  AI: builds the cheapest currently-unaffordable-no-longer / not-yet-unlocked
  tier it can now afford (lowest tier first, at most one build per day),
  then recruits greedily from its pool (lowest tier first) until it can't
  afford another unit of anything or has no army slots left.
- This heuristic is a pure, deterministic function in `js/ai.js`, unit
  tested the same way as v1's adventure-targeting and battle-action
  heuristics (plan.md Decision #5).

## Functional Requirements

- FR-1: All Castle rules (build, recruit, pool accrual, unlock state) live
  in a new pure, DOM-free module `js/castle.js`, unit-tested with
  `node --test`, matching v1's FR-1 pattern.
- FR-2: `endDay` (in `js/adventure.js`) grows each hero's Castle pool by
  `growthPerDay` per unlocked creature type, capped at the same
  `growthPerDay * 10` ceiling v1 used for per-hex garrison, now tracked at
  `hero.castle.pool[creatureTypeId]` instead of on the map object.
- FR-3: `Hero` gains a `castle: { unlocked: Set<creatureTypeId>, pool: {
  [creatureTypeId]: number } }` field, initialized empty at game start (no
  tier is pre-unlocked — the two starting-army stacks are a one-time grant,
  not a Castle unlock).
- FR-4: Build costs and recruit costs are content data (`BUILD_COST`,
  `RECRUIT_COST` in `js/castle.js` or a sibling content module), keyed by
  `creatureTypeId`, following the same "hand-tabulated, explicitly tunable"
  convention as v1's `MINE_YIELD` and creature stat tables.
- FR-5: The Castle screen is a new UI screen/panel wired in `js/main.js` +
  `index.html` + `css/styles.css`, reachable without ending the player's
  turn or spending movement, matching v1's screen-routing pattern
  (`SCREENS` array, `showScreen`).
- FR-6: Kingdom Score's per-dwelling term (`+15` per owned dwelling hex, v1
  spec.md US-6) is redefined as `+15` per **unique unlocked creature type**
  in a hero's Castle (covers both capture- and build-unlocked tiers, see
  US-4) rather than iterating owned hexes, so building no longer captured
  hexes still contributes.

## Non-goals (this feature)

- **No build prerequisites / tech tree** — all 10 creature tiers are
  independently buildable in any order, any day, as long as the hero can
  afford that tier's cost. No "must own tier 2 before tier 3" chains.
- **No multiple castles per hero** — one Castle per hero for the life of
  this feature; the "second town" concept from the original game is out of
  scope.
- **No castle combat/siege** *(superseded — see
  `specs/003-siege-and-spells`, which makes the enemy Keep hex attackable
  and defended by a militia drafted from the Castle's pool, though it
  still stops short of capture — left here as the historical record of
  this feature's original scope)* — a Castle can't be attacked, razed, or
  captured by the opponent; it's tied to the hero, not a hex, so there's
  nothing on the map to besiege. (A hero's map Keep hex remains cosmetic/
  home-position only, unchanged from v1.)
- **No stacking growth** from owning a tier via both capture *and* build —
  it's a boolean unlock, not additive production. (Explicitly flagged as a
  simplifying choice that a future round could revisit.)
- **No resource conversion / marketplace** — gold and the six raw
  resources remain independently spent; nothing added here lets a hero
  trade one resource for another.
- **No weekly growth multipliers, army morale, or luck** from the original
  game's town economy.

## Key Entities (additions/changes to spec.md `001-hex-heroes`)

- **Hero** gains: `castle: { unlocked: Set<CreatureTypeId>, pool: {
  [CreatureTypeId]: number } }`.
- **MapObject** (`type: 'dwelling'`) loses the `garrison` field — capture
  now only sets `ownerId` and triggers an unlock side effect (US-4); daily
  production is no longer tracked on the hex.
- **BuildCost** / **RecruitCost**: `{ [CreatureTypeId]: { [Resource]:
  number } }` content tables (plan.md has the concrete v1 values).
