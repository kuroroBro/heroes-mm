# Feature Specification: Sunborn Faction

**Feature branch**: `006-sunborn-faction`
**Status**: Implemented
**Created**: 2026-07-26
**Depends on**: `specs/005-castle-factions` (the faction/roster shape this
feature adds a 5th entry to; nothing about that shape changes here)

## Overview

Adds a 5th faction, **Sunborn** — a fire-and-light order culminating in a
**Phoenix** at tier 7 — alongside the 4 existing factions (Human, Orc,
Undead, Enkantos). Requested directly as "a new faction with phoenix as
strongest"; the initial 7-name suggestion (Spark/Hatchling, Salamander/
Ember Guard, Flame Dancer, Ash Drake, Sun Priest, Cinder Wyvern, Phoenix)
was refined into a final roster (see plan.md) and implemented in full —
stats, costs, map dwellings, and real generated art for every asset a
faction needs (7 creature portraits, 1 hero token, 7 dwelling icons, 7
attack-effect icons), the same completeness bar specs/005 set.

Unlike specs/005 (which restructured how factions/rosters work at all),
this feature is purely additive: one more entry in `FACTIONS`, 7 more in
`CREATURES`, 7 more map dwellings, and the matching cost-table/sprite
entries. No existing faction's data, stats, or map position changes.

## User Stories

### US-1: Pick Sunborn at setup, same as any other faction
As a player, I want Sunborn to appear as a 5th choice on the setup screen
with the same information density as the other 4 (hero avatar, Attack/
Defense split, starting army, 7-tier roster preview), so picking it feels
like a first-class faction, not an afterthought.

**Acceptance criteria**
- Setup screen shows 5 faction cards; Sunborn's shows a real painterly
  hero avatar (not a placeholder), ATK 2 / DEF 3, starting army "10
  Salamander, 6 Flame Dancer", and roster preview "Spark → Salamander →
  Flame Dancer → Ash Drake → Sun Priest → Cinder Wyvern → Phoenix".
- Starting a game as Sunborn (or against an AI opponent who draws it)
  works exactly like any other faction — same `createHero`/`createAdventure`
  code path, no Sunborn-specific branching anywhere in the engine.

### US-2: Sunborn's 7 dwellings are findable and fair on the map
As a player, I want Sunborn's dwellings placed on the adventure map with
the same fairness guarantee every other faction's dwellings already have
— neither Keep is closer to them in aggregate — even though Sunborn has
no "mirror partner" faction the way Human↔Undead and Orc↔Enkantos do.

**Acceptance criteria**
- All 7 Sunborn dwellings exist on the map, each guarded by its own
  creature type at the same tier-scaled guard count convention as every
  other faction (T1=10 ... T7=2).
- Total hex distance from `KEEP_PLAYER` to all Sunborn dwellings exactly
  equals total distance from `KEEP_AI` (see plan.md's placement search) —
  matching the existing 28 dwellings' own 416==416 baseline exactly, now
  537==537 across all 35.
- No collisions with any existing map object, verified programmatically
  (same throwaway-script convention this map's own file comment
  describes), not just by inspection.

### US-3: Sunborn's Castle economy and battle behavior need no special-casing
As a maintainer, I want Sunborn to need zero new code in castle.js,
battle.js, ai.js, or adventure.js — only content-table entries — so the
faction system's "N factions" design actually holds up when N grows.

**Acceptance criteria**
- `RECRUIT_COST`/`BUILD_COST` have entries for all 7 Sunborn creatures.
- The AI can build, recruit, and fight with Sunborn (as either side)
  using the exact same `chooseAiCastleActions`/`aiChooseBattleAttack`
  code that already handles the other 4 factions, since those are scoped
  generically via `castleRosterFor(hero)` / `creaturePower()`.
- A new generic content-integrity test suite (`tests/content.test.mjs`,
  written alongside this feature since no such blanket check existed
  before) passes for all 5 factions, not just Sunborn — every creature
  has a cost-table entry, a real (non-fallback) sprite file for its
  portrait/attack/dwelling, and exactly one map dwelling.

## Non-goals

- No new mechanics (no "rebirth"/resurrection special ability for
  Phoenix, no fire-damage-type interactions) — same "no special
  abilities" Non-goal specs/001 already established; Phoenix is simply
  the highest-power creature in its faction, like Dragon/Behemoth/Bone
  Dragon/Bakunawa are in theirs.
- No 6th faction, no procedural faction generation — the map, Castle
  cost tables, and faction list are all still hand-authored fixed
  content, same as before.
