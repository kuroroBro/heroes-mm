# Feature Specification: Yokai Faction

**Feature branch**: `008-yokai-faction`
**Status**: Implemented
**Created**: 2026-07-27
**Depends on**: `specs/005-castle-factions` (the faction/roster shape),
`specs/006-sunborn-faction` (the most recent prior example of adding a
new, unpaired faction — this feature follows its exact process)

## Overview

Adds a 6th faction, **Yokai** — Japanese folklore, culminating in
**Amaterasu** (the sun goddess) at tier 7 — alongside the 5 existing
factions. Requested directly as a roster list (Kappa, Tengu, Oni,
Onmyoji, Orochi, Kitsune, Amaterasu) with no request to refine it (unlike
specs/006-sunborn-faction, where refinement was explicitly invited); the
list was used as given. "Yokai" (the general Japanese term for folklore
spirits/monsters) was chosen as the faction name — not any single
creature's name — mirroring how "Enkantos" names a mythology rather than
its own strongest creature.

Same completeness bar as every faction since specs/005: real stats,
costs, map dwellings, and 22 generated images (7 creature portraits, 1
hero token, 7 dwelling icons, 7 attack-effect icons), no placeholder
phase. Purely additive — no existing faction's data, map position, or
any engine code changes.

## User Stories

### US-1: Pick Yokai at setup, same as any other faction
As a player, I want Yokai to appear as a 6th choice on the setup screen
with the same information density as the other 5.

**Acceptance criteria**
- Setup screen shows 6 faction cards; Yokai's shows a real painterly
  hero avatar, ATK 1 / DEF 2, starting army "10 Tengu, 6 Oni", and
  roster preview "Kappa → Tengu → Oni → Onmyoji → Orochi → Kitsune →
  Amaterasu".
- No Yokai-specific branching anywhere in the engine — same
  `createHero`/`createAdventure` path as every other faction.

### US-2: Amaterasu is depicted with the same dignified treatment Bakunawa established
As a player (and as a matter of respecting a real, still-practiced
religion), I want Amaterasu — an actively venerated Shinto deity, not a
fictional invention — portrayed as powerful and reverent, matching how
Enkantos's Bakunawa (a genuine Philippine deity/mythological figure)
was already handled in this project.

**Acceptance criteria**
- Amaterasu's generated art (creature portrait, attack effect, dwelling
  icon) is majestic and dignified — radiant, serene, benevolent
  imagery — never menacing, mocking, or disrespectful.
- Mechanically she's simply the strongest creature in her faction (tier
  7, highest `creaturePower()`), the same role every other faction's
  top-tier creature already plays — no unique mechanics that would
  single her out as "more than a game creature."

### US-3: Yokai's dwellings are placed fairly on the map
As a player, I want Yokai's 7 dwellings placed with the same fairness
guarantee every other faction already has, even though (like Sunborn)
it has no mirror-partner faction to pair with.

**Acceptance criteria**
- All 7 dwellings exist, guarded by their own creature type at the
  standard tier-scaled count (T1=10 ... T7=2).
- Total hex distance from `KEEP_PLAYER` to all 42 dwellings (across all
  6 factions) exactly equals total distance from `KEEP_AI` (648==648),
  matching the pre-existing 537==537 (5-faction) and 416==416
  (4-faction) baselines.
- No collisions with any existing map object, verified programmatically
  before being hand-written into `mapObjects.js`.

## Non-goals

- No new mechanics tied to any Yokai creature specifically (no
  shapeshifting for Kitsune, no illusion/fear effects for Oni, etc.) —
  same "no special abilities" Non-goal every faction already respects.
- No 7th faction, no procedural faction generation.
