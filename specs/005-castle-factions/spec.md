# Feature Specification: Castle Factions (Orc, Human, Enkantos, Undead)

**Feature branch**: `005-castle-factions`
**Status**: Draft
**Created**: 2026-07-25
**Depends on**: `specs/002-castle-creatures` (Castle build/recruit economy,
shipped), `specs/001-hex-heroes` (hero types, shipped — this feature
replaces that concept, see Non-goals)

## Overview

Since `specs/002-castle-creatures`, both heroes have always drawn from the
same shared 10-tier creature list — hero type (Marshal/Warlord/Sentinel)
only ever flavored starting army/stats, never *which* creatures a hero
could eventually build or recruit. This feature splits that single roster
into **4 factions** — **Human**, **Orc**, **Undead**, and **Enkantos**
(Philippine folklore, reusing this workspace's `pinoy-board` project's
creature art and flavor) — each with its own **7-tier** roster. Choosing a
faction at setup **replaces** choosing a hero type; a hero's Castle only
ever builds/recruits from its own faction's 7 creatures.

The existing 10 creatures aren't discarded — each is kept (same id, same
stats, same sprite) and assigned to whichever faction it fits
(peasant/pikeman/archer/griffin/dragon → Human; wolf/orc/ogre/troll → Orc;
skeleton → Undead), filling the remaining slots (11 for Human/Orc/Undead
combined, 7 for Enkantos — all new) with new creatures. Everything else
about the Castle economy (`specs/002-castle-creatures`: unlock via capture
or build, daily pool accrual, recruit-into-army) is unchanged — this
feature is entirely about *which* 7 creatures a given hero's Castle offers,
not how the Castle itself works.

## User Stories

### US-1: Pick a faction instead of a hero type
As a player, I want to choose which of the 4 factions I play at setup, so
my whole game — starting army, Castle roster, map dwellings worth chasing
— reflects a real, distinct identity rather than a stat-only flavor pick.

**Acceptance criteria**
- The setup screen's hero-type cards (`specs/001-hex-heroes`) are replaced
  by 4 faction cards: Human, Orc, Undead, Enkantos. Each shows the
  faction's name, its hero's Attack/Defense split, its 2-stack starting
  army, and (new) a compact preview of its 7-creature roster (name + tier
  only, not full stats — matches the existing hero-type-card information
  density).
- Starting a game with a chosen faction sets the hero's `army` from that
  faction's starting-army table (plan.md) and `attack`/`defense` from that
  faction's stat split — same mechanism `heroTypes.js`/`createHero` already
  use today, just re-sourced from faction data instead of hero-type data.
- The AI opponent is assigned a **different** faction than the player's
  (never the same faction in one match), picked at random from the
  remaining 3 — same "pick from `HERO_TYPES` minus the player's choice"
  pattern `main.js`'s `btn-start-game` handler already uses today.

### US-2: A hero's Castle only ever offers its own faction
As a player, I want my Castle screen to show exactly my faction's 7
creatures — no more, no less — so recruiting/building feels like managing
a specific army identity, not picking from an undifferentiated master list.

**Acceptance criteria**
- The Castle screen (`specs/002-castle-creatures` US-1) lists exactly the
  7 creature tiers belonging to the hero's own faction, in that faction's
  tier order — never another faction's creatures, even if the hero has
  somehow unlocked one (see next bullet).
- Capturing a map dwelling belonging to a **different** faction than the
  hero's own still unlocks it for that hero (existing capture-unlocks
  behavior, `specs/002-castle-creatures` US-4, is unchanged — this feature
  does **not** add a faction-purity restriction; see Non-goals). It simply
  won't be one of the 7 rows the hero's own-faction Castle screen was
  designed around — FR-3 covers how the Castle screen handles this
  (off-faction unlocks still show, just outside the main 7-row list, so
  nothing a player has already earned silently disappears).

### US-3: The AI plays its assigned faction for real
As a player, I want the AI's Castle behavior (`specs/002-castle-creatures`
US-5) to build and recruit from its own faction's 7 creatures, so
matches actually feel like two different factions clashing.

**Acceptance criteria**
- `chooseAiCastleActions` requires no new logic — it already iterates
  `CREATURES` generically; scoping it to the AI hero's own faction's 7
  entries (FR-4) is enough for it to behave correctly with zero heuristic
  changes.
- `aiSelectTarget`'s map-targeting priorities (free mine/dwelling, winnable
  guard, Keep raid, engage-the-hero — all from prior sessions' fixes) are
  unaffected; a dwelling is a dwelling regardless of which faction it
  belongs to, on either side.

### US-4: Enkantos reuses real Philippine-folklore art and flavor
As the developer, I want the Enkantos faction's 7 creatures to reuse
`pinoy-board`'s existing Duwende/Santilmo/Manananggal/Tikbalang/Aswang/
Kapre/Bakunawa sprites and flavor rather than inventing a generic 4th
fantasy roster, matching how this project has already reused `pinoy-board`
assets (hex ground textures, `specs/004-siege-battlefield`-era work).

**Acceptance criteria**
- All 7 Enkantos creature sprites are copied directly from
  `pinoy-board/app/src/assets/boardSprites/enemy/*.png` (confirmed: these
  are already full-body, semi-realistic paintings on a transparent
  background — the same visual language `heroes-mm`'s own creature sprites
  already use, so no restyling/regeneration is needed; see plan.md).
- Flavor text (creature card descriptions, if/when added) is written to be
  consistent with `pinoy-board/app/src/game/combat/enemies.ts`'s existing
  descriptions of the same creatures, not contradictory to them.

## Functional Requirements

- FR-1: `js/creatures.js`'s `CREATURES` array grows from 10 to 28 entries;
  every entry gains a `factionId` field (`'human' | 'orc' | 'undead' |
  'enkantos'`). `tier` becomes **per-faction** (1-7, not a single global
  1-10 scale) — see plan.md Decision #2 for the full table. `getCreature`,
  `creaturePower`, and every existing consumer (`castle.js`, `battle.js`,
  `ai.js`, `main.js`) key off `creatureTypeId` exactly as today; none of
  them need to know about factions except where explicitly scoped (FR-3,
  FR-4).
- FR-2: `js/heroTypes.js` is replaced by `js/factions.js` (or renamed
  in-place — plan.md decides): `FACTIONS` array of 4 entries, each with
  `id`, `name`, `attack`, `defense`, `startingArmy` (same shape as today's
  `HERO_TYPES`), plus a new `creatures: CreatureTypeId[7]` (that faction's
  roster, in tier order) and `spriteId` (hero map-token art, unchanged
  role). `getHeroType`/`HERO_TYPES` callers (`main.js` setup screen,
  `createHero` in `adventure.js`, tests) are repointed at the new module;
  hero ids change from `marshal/warlord/sentinel` to `human/orc/undead/
  enkantos` (Human/Orc reuse the *stats* of the old Marshal/Warlord
  exactly — see plan.md Decision #4 — but the id itself changes to match
  its faction, since hero type and faction are now the same choice, per
  US-1).
- FR-3: A new pure helper (`js/factions.js` or `castle.js`) —
  `castleRosterFor(hero)` — returns the hero's own faction's 7
  `creatureTypeId`s in tier order; `main.js`'s Castle-screen render uses it
  in place of iterating the full `CREATURES` list. Any creature the hero
  has unlocked (via capture) that is **not** in that list still renders
  (US-2's off-faction-unlock case) but in a clearly separate section
  ("Other" / "Captured") rather than interleaved with the 7 main rows.
- FR-4: `js/ai.js`'s `chooseAiCastleActions` and any other place that
  currently loops `for (const creature of CREATURES)` to decide what an AI
  hero can build/recruit is scoped to `castleRosterFor(hero)` (FR-3)
  instead of the full 28-entry list — otherwise the AI would try to build
  every faction's dwellings, defeating the whole feature.
- FR-5: `js/mapObjects.js`'s dwelling list grows to cover all 28 creature
  types (up from 10) — the 30x22 map (already sized for this) has room;
  see plan.md Decision #5 for placement approach. Both mines and monster
  guards are unaffected by faction (they were never faction-specific and
  stay that way).
- FR-6: New art: the 11 new Human/Orc/Undead creatures get generated
  full-body creature sprites via the `image-gen` skill, matching this
  project's existing painterly style exactly (same prompt conventions
  used for the original 10). The 7 Enkantos creatures are copied directly
  from `pinoy-board` (US-4) — no generation needed. One new hero
  map-token sprite (Enkantos) is needed; the existing 3 hero sprites are
  reused (renamed alongside their hero id, FR-2).
- FR-7: `BUILD_COST`/`RECRUIT_COST` (`js/castle.js`) grow to cover all 28
  creatures, following the exact same tunable-content convention already
  established (plan.md Decision #6 for the concrete numbers, sized against
  the current resource-yield rebalance already shipped this session).

## Non-goals (this feature)

- **No faction-exclusive recruiting/building** — per an explicit decision
  for this feature, capturing an off-faction dwelling still unlocks it for
  the capturing hero exactly like today (`specs/002-castle-creatures`
  US-4). A determined player can still end up with a stray off-faction
  unlock; the Castle screen just displays it separately (FR-3). A future
  round could revisit this toward strict exclusivity if it turns out to
  undermine faction identity in practice.
- **No faction-specific spells, hero abilities, or racial passives** —
  `specs/003-siege-and-spells`'s spellbook stays universal; nothing here
  makes Undead learn spells differently than Human, etc. Purely a creature
  roster change.
- **No more than 4 factions, no user-authored/custom factions.**
- **No mid-game faction switching** — a hero's faction is fixed for the
  life of a game, chosen once at setup exactly like hero type is today.
- **No per-faction Castle screen visual theming** (background art, color
  scheme) — the Castle screen layout/style stays generic; only the roster
  content changes. A reskin is a plausible future round, not this one.
- **No rebalancing of the existing 10 creatures' stats** — every reused
  creature (peasant, pikeman, archer, wolf, orc, griffin, ogre, skeleton,
  troll, dragon) keeps its exact current `attack`/`defense`/`hp`/`dmgMin`/
  `dmgMax`/`speed`/`growthPerDay`/`ranged` values verbatim; only new
  creatures are newly designed (plan.md Decision #2).
- **No changes to the Castle economy mechanics themselves** — unlock,
  pool accrual, recruit, build — all of `specs/002-castle-creatures`
  stays exactly as implemented; this feature only changes *which* 7
  creatures a given hero's Castle can ever show.

## Key Entities (additions/changes)

- **Creature** (`js/creatures.js`) gains `factionId: 'human' | 'orc' |
  'undead' | 'enkantos'`; `tier` is now 1-7 within its faction (not a
  single global 1-10 scale — `creaturePower()` itself is unaffected, it
  never read `tier`).
- **Faction** (new, `js/factions.js`, replacing `HeroType`/`heroTypes.js`):
  `{ id, name, attack, defense, startingArmy: [{creatureTypeId, count}, ...],
  creatures: [CreatureTypeId x7], spriteId }`.
- **Hero** — no new fields; `heroTypeId` (or a renamed equivalent,
  plan.md decides) now stores a faction id instead of a hero-type id, same
  slot, same role (which `Faction`/former-`HeroType` entry produced this
  hero's starting stats/army).
