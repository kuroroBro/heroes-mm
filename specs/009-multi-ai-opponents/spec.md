# Feature Specification: Multi-AI Opponents

**Feature branch**: `009-multi-ai-opponents`
**Status**: Implemented
**Created**: 2026-07-27
**Depends on**: `specs/001-hex-heroes` (the core 2-hero adventure loop
this feature generalizes), `specs/007-town-hall-upgrade` (the setup
screen's existing "number input" option pattern this reuses)

## Overview

Requested directly: "I want to be able to set how many AI to join the
game." Previously the game was always exactly 2 heroes — `player` and
`ai`, hardcoded throughout the adventure engine and UI. This feature
lets the setup screen choose 1-3 AI opponents (2-4 heroes total),
generalizing the core engine (owner/hero data model, movement/collision,
battle triggering, Kingdom Score, the Day-limit and defeats-to-win win
conditions, the AI turn loop) to support any number of heroes in that
range, while keeping the exact 1-AI case behaviorally byte-identical to
before — every one of the 175 tests that predate this feature still
passes unchanged.

## User Stories

### US-1: Choose how many AI opponents join at setup
As a player, I want a "Number of AI opponents" control on the setup
screen (1-3, default 1), so I can play a free-for-all against multiple
AI instead of always exactly one.

**Acceptance criteria**
- Setup screen shows a number input (min 1, max 3, default 1) alongside
  the existing "Hero defeats needed to win" control, persisted the same
  way via `storage.js`'s settings.
- Each AI opponent gets a distinct faction (never the player's own,
  never repeated across AI) and its own Keep at a fixed map position
  (`KEEP_AI`/`KEEP_AI2`/`KEEP_AI3`) — the 2nd/3rd AI's Keep only exists
  on the map at all when that AI is actually in the game.
- `createAdventure(playerHeroTypeId, aiHeroTypeIdOrIds, options)`
  accepts either a single faction id (the original, still-default
  shape) or an array of 1-3 ids — every existing call site passing a
  single string is completely unaffected.

### US-2: Heroes can fight any other hero they encounter, not just "the" opponent
As a player, I want moving onto any other hero's hex (mine, another
AI's) to trigger the same hero-vs-hero battle mechanic that already
exists, so a free-for-all actually plays like one.

**Acceptance criteria**
- `moveHero`'s hero-collision detection checks every other *living*
  hero's position, not a single hardcoded rival, and correctly
  identifies which specific rival is involved
  (`pendingBattle.defenderOwner`).
- An AI that attacks another AI (not the player) auto-resolves
  instantly with no UI shown, the same treatment AI-vs-neutral-guard
  fights already got — the player only ever sees an interactive battle
  screen for a fight they're personally in.
- Each AI's own targeting (`aiSelectTarget`) considers whichever living
  rival is currently nearest as "the enemy" for siege/engage purposes
  (a tractable generalization of the original single-rival logic, not a
  full multi-rival threat-assessment system).

### US-3: A single defeat doesn't end a free-for-all — only being the last one standing does
As a player, I want eliminating one of several AI opponents to matter
(they stop playing) without ending the whole game outright, so a
3-AI game doesn't just become "first hero-vs-hero win auto-ends it."

**Acceptance criteria**
- A hero reaching `defeatsToWin` total defeats is *eliminated*: frozen
  in place (no more turns, no longer a valid collision/battle target
  for anyone), but the game itself only ends once just one hero remains
  un-eliminated. With exactly 2 total heroes (the original shape) this
  is always immediate.
- The Day-30 Kingdom Score fallback compares every *living* hero (not
  just 2), picking the single highest scorer or a draw if 2+ tie for
  the lead.
- The Day-30 "fight a final battle instead of accepting the score"
  offer (specs/007) challenges the single highest-scoring living AI
  rival specifically when there's more than one — framed as "duel the
  leader" rather than asking the player to pick from a list.

## Non-goals

- No player choice of *which* AI to team up with or gang up on — every
  hero (including AI-vs-AI) can fight any other hero it encounters, with
  no alliance/diplomacy system.
- No change to the map's size or the total amount of content
  (mines/dwellings/monsters/treasures) — only 2 new *keep* positions
  were added, reusing every other hex exactly as before.
- No networking — every AI opponent is still a local bot on the same
  device, not another human player (see README's Networking model note).
