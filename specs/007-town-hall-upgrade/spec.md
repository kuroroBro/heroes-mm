# Feature Specification: Town Hall Upgrade

**Feature branch**: `007-town-hall-upgrade`
**Status**: Implemented
**Created**: 2026-07-27
**Depends on**: `specs/002-castle-creatures` (the Castle screen and its
build/recruit/spend pattern this feature reuses)

## Overview

Requested directly: "a means in the castle to increase gold income,
maybe upgrading the main townhall or similar thing." Adds a Town Hall
upgrade track to the Castle screen — a permanent, hero-scoped investment
(3 levels) that increases the flat daily gold every hero's own Keep
already produces (`KEEP_GOLD_YIELD`, 500/day), on top of that baseline
rather than replacing it. Exactly one upgrade track per hero (not
per-creature like dwellings), following the exact same all-or-nothing
resource-spend pattern `buildDwelling`/`learnSpell` already established.

## User Stories

### US-1: Spend resources to grow gold income over time
As a player, I want to invest resources into a permanent gold-income
upgrade at my Castle, so I have a lever to grow my economy beyond just
capturing gold mines (which are fixed, scarce, and contested).

**Acceptance criteria**
- Castle screen shows a "Town Hall" row above "Creatures": current level
  (0-3), current daily gold bonus, and total Keep yield (base + bonus).
- Below that, an "Upgrade" button shows the next level's *incremental*
  gold gain (not the cumulative total, to avoid reading as "this upgrade
  alone grants +700" when it actually only adds +400 on top of an
  existing +300) and its resource cost, disabled when unaffordable.
- Upgrading is all-or-nothing (spec.md's established Castle-spend
  pattern): deducts the full cost and advances exactly one level, or
  changes nothing and returns false.
- The bonus applies starting the *next* `endDay`, same timing as every
  other Castle-driven daily accrual (pool growth, mine income).

### US-2: The AI upgrades its Town Hall too
As a player, I want the AI opponent to also invest in this upgrade, so
it isn't a purely one-sided advantage that trivializes the AI.

**Acceptance criteria**
- `chooseAiCastleActions` attempts a Town Hall upgrade (if affordable)
  once per AI day, before its dwelling-build attempt — prioritized
  since it's an economy investment that compounds over the rest of the
  game, unlike a single dwelling.

### US-3: The investment matters for Kingdom Score too, not just gold
As a player, I want Town Hall level to count toward my Kingdom Score
(not just raw gold income), so it's a meaningful strategic investment
even in a game that ends via score rather than combat.

**Acceptance criteria**
- `kingdomScoreBreakdown`'s "castle" component includes
  `townHallLevel * 20` points, alongside the existing 15 pts/unlocked
  creature type — a comparable per-investment value, reflecting a
  comparable resource cost and strategic bet.

## Non-goals

- No per-creature or per-mine scaling — the bonus is a single flat
  number added to the Keep's own yield, not a multiplier on mines or
  other income sources.
- No separate upgrade tracks for other resources (wood/ore/etc.) — gold
  specifically, since it's the resource every Castle sink (RECRUIT_COST/
  BUILD_COST/learnCost) leans on most heavily across every faction.
