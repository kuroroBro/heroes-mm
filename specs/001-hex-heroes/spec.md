# Feature Specification: Hex Heroes — A Heroes of Might & Magic Tribute

*(Working title "Hex Heroes" — a browser tribute inspired by Heroes of
Might & Magic's hex tactical combat and hero/army/resource loop. Not
affiliated with or branded as the original franchise; repo path
`heroes-mm` is unchanged.)*

**Feature branch**: `001-hex-heroes`
**Status**: Draft
**Created**: 2026-07-18

## Overview

A free, browser-based turn-based strategy game deployed to GitHub Pages, no
backend, no build step. One human hero and one AI-controlled hero compete
on a shared **hex adventure map**: move, capture resource mines and
creature dwellings, and fight neutral monster stacks guarding them. When
two armies collide (hero vs. monster stack, or hero vs. hero), play
switches to a separate **tactical hex battlefield** screen — a smaller hex
grid where each army's creature stacks take turns moving and attacking,
in the classic Heroes of Might & Magic combat style. Victory on the
adventure map comes from defeating the enemy hero's army in direct combat,
or — if neither hero finds the other — from having the strongest kingdom
(mines + dwellings + army value) when the day limit is reached.

v1 is single-player (human vs. one AI hero) on one device, no networking.
**Multiplayer (a second human hero, replacing or alongside the AI) is an
explicitly planned future expansion** — see plan.md's Networking model —
built the same host-authoritative PeerJS way as every sibling game in this
workspace, once the core rules engine is solid.

Map objects that need real generated art (monster stacks, mines,
dwellings, the hero token itself) render as **placeholder sprites** in v1:
simple flat SVG icons keyed by a stable `spriteId`, so swapping in
generated art later (via the `image-gen` skill) only ever means adding an
image file and pointing existing content data at it — no engine or UI
changes. See plan.md's Custom art section.

## User Stories

### US-1: Start a game
As a player, I want to pick a hero and start a new game, so I can begin
playing without configuring anything complicated.

**Acceptance criteria**
- Home screen offers **New Game**. Setup lets the player pick one of 3
  hero types (Marshal / Warlord / Sentinel — see plan.md for stat bias)
  for their own hero; the AI is automatically assigned a different type.
- Starting a game generates a fresh adventure map (fixed 15×11 hex layout
  for v1 — see Non-goals on procedural generation), places the player's
  hero at one home Keep hex and the AI's hero at the opposite corner Keep,
  and deals each hero its hero type's starting army (2 creature stacks).
- Both heroes start at Level 1, 0 gold and 0 of every other resource.

### US-2: Move on the adventure map
As a player, I want to move my hero around the hex map using my day's
movement points, so I can explore, capture mines, and pick fights on my
own terms.

**Acceptance criteria**
- The adventure map renders as a hex grid. The player's hero occupies one
  hex; clicking/tapping a reachable hex (within remaining movement points,
  computed via hex pathfinding around occupied hexes) moves the hero along
  the shortest path, spending 1 movement point per hex entered.
- Remaining movement points and current day number are always visible.
- Moving onto an unguarded mine or dwelling hex captures it immediately
  for the player (ownership flips, ownership is visually marked). Moving
  onto a guarded mine/dwelling or a plain monster-stack hex, or onto the
  enemy hero's hex, **starts a battle** (see US-4) instead of completing
  the move; the mover's remaining movement is unaffected by the battle
  itself.
- **End Day** ends the player's turn: the AI hero takes its full turn (see
  US-3), then a new day begins — both heroes' movement points refill, and
  every hex owned by a hero produces that hero's resource/creature income
  for the day (mines add resources to that hero's stockpile; dwellings add
  `growthPerDay` creatures, capped at the dwelling's max garrison, waiting
  to be collected by visiting the hex — see US-2 capture rule, revisiting
  an owned dwelling collects any waiting creatures into the hero's army if
  there's a free/matching army slot).
- A hero that runs out of movement points for the day can still end the
  day; they simply can't move further until the next day.

### US-3: AI opponent hero
As a player, I want the AI hero to behave like a real (if simple)
opponent, so the map feels contested rather than static.

**Acceptance criteria**
- Each of the AI's days, it picks a target hex by simple priority: the
  nearest reachable unguarded mine/dwelling, else the nearest reachable
  guarded mine/dwelling or monster stack that its current army can likely
  beat (see plan.md's AI heuristics for the "likely beat" estimate), else
  the nearest reachable unclaimed hex that moves it toward the player's
  side of the map. It spends all reachable movement points pursuing that
  target across however many of its own turns it takes (the target persists
  day-to-day until reached, reassessed each day in case a better target
  appeared).
- If the AI reaches a hex that would start a battle, it fights it out
  using the same tactical battle engine as the player (see US-4/US-5),
  with its own simple in-battle AI (plan.md's battle AI heuristics).
- The AI never targets a hex it estimates it will lose (except the enemy
  hero directly, which it always engages if reachable — the AI is
  aggressive toward the player once it can reach them).

### US-4: Enter a tactical battle
As a player, I want combat to switch to a dedicated hex battlefield when
armies collide, so fights feel tactical rather than automatic.

**Acceptance criteria**
- Triggering a battle (US-2/US-3) switches the whole screen to the battle
  view: a smaller hex grid (11 columns × 9 rows for v1), attacker stacks
  arrayed down the left edge, defender stacks down the right edge, one hex
  per creature stack (a hero can have up to 7 stacks; empty slots place no
  stack).
- A turn order bar shows every stack from both sides sorted by Speed
  (highest first); ties broken by whichever side is "attacking" this
  battle acting first. The battle proceeds stack-by-stack down this order,
  looping back to the top (a new "round") once every surviving stack has
  acted.
- Neither side sees the other's exact stats beyond what's visible on
  screen (count, and — for the player's own stacks only — full stats on
  hover/tap); this is a local single-device game so there's no hidden
  information to protect over a network yet (see plan.md Non-goals on
  fog-of-war).

### US-5: Fight a battle
As a player, I want to move and attack with my stacks on my turn, so I can
apply tactics (focus fire, positioning, ranged vs. melee) rather than just
watching an auto-resolve.

**Acceptance criteria**
- On the active stack's turn (if it belongs to the player), reachable
  hexes (within the stack's Speed, pathfound around occupied hexes) are
  highlighted. Clicking a reachable empty hex moves the stack there and
  ends its turn unless it's now adjacent to an enemy, in which case an
  attack is also offered.
- Clicking an enemy stack that's already adjacent (or that a ranged stack
  can target from anywhere on the field with no obstruction — v1 has no
  battlefield obstacles, see Non-goals) attacks it directly: damage is
  computed from the classic Heroes of Might & Magic attack/defense-skew
  formula (see plan.md), casualties are removed from the losing stack,
  and — for melee attacks against a stack that hasn't already retaliated
  this round — the defender retaliates automatically for reduced-but-real
  damage back at the attacker, once per round per stack.
- A stack can instead **Wait** (ends its turn with no action, no bonus) or
  **Defend** (ends its turn, gains a flat defense bonus against attacks
  until its next turn).
- The battle ends the instant one side has zero surviving stacks. The
  winner's surviving stacks (with their reduced counts) return to the
  adventure map as that hero's new army. If the loser was a neutral
  monster stack, the winning hero also collects its gold bounty. If the
  loser was a hero (player or AI), see US-6.
- The winning hero also gains XP equal to a fixed multiple of the loser's
  total army value (creature count × tier weight); reaching an XP
  threshold levels the hero up (+1 to Attack or Defense, alternating, see
  plan.md), which then applies to all of that hero's stacks in future
  battles.

### US-6: Hero defeat and game end
As a player, I want a clear, non-punishing outcome when a hero's whole
army is destroyed, and a clear way for the game to actually end, so a
single bad fight doesn't softlock the game and a match reaches a
conclusion.

**Acceptance criteria**
- If a hero's army is reduced to zero stacks in battle, that hero is
  teleported back to their home Keep hex with a fresh copy of their hero
  type's starting army, and loses the rest of that day's movement (already
  spent or not). This is a fixed, deterministic penalty, not permadeath —
  the run continues.
- The game ends immediately, in a win for the side who did the
  defeating, the moment a hero *directly defeats the enemy hero's army*
  in hero-vs-hero battle (not a respawn-and-continue case — this is the
  primary win condition).
- If neither hero has defeated the other by **Day 30** (v1's fixed day
  limit), the game ends and whichever hero has the higher **Kingdom
  Score** (sum of: 10 points per owned mine, 15 per owned dwelling, plus 1
  point per creature currently in their army weighted by that creature's
  tier) wins; an exact tie is a draw.
- A game-over screen states the winner (or draw) and the reason
  (hero-vs-hero victory, or day-limit Kingdom Score), with a **New Game**
  button.

## Functional Requirements

- FR-1: All adventure-map and battle rules live in pure, DOM-free modules
  (`js/hexgrid.js`, `js/adventure.js`, `js/battle.js`, `js/ai.js`),
  unit-tested with `node --test`.
- FR-2: Hex coordinate math (neighbors, distance, range, pathfinding with
  movement-point cost, line-of-sight-free targeting) is centralized in
  `js/hexgrid.js` and shared by both the adventure map and the battlefield
  — they are two different-sized instances of the same underlying hex
  grid system, not two separate implementations.
- FR-3: All map objects that eventually need generated art (mines,
  dwellings, monster stacks, hero tokens, creature portraits) are defined
  in content data with a `spriteId` field and rendered through one shared
  sprite-lookup function, so the current placeholder SVGs and future
  generated art are interchangeable without touching engine or UI logic.
- FR-4: The AI hero (adventure-map targeting and in-battle actions) is
  implemented as pure, testable decision functions in `js/ai.js` — given a
  game/battle state, they return a chosen action, with no DOM or timing
  dependency, so AI behavior can be asserted in unit tests.
- FR-5: Settings (last-picked hero type) persist in `localStorage` via
  `js/storage.js`, matching every sibling game's pattern.
- FR-6: The whole game is a static site — vanilla ES2020 modules, no
  build step, deployed to GitHub Pages via GitHub Actions, matching every
  sibling repo in this workspace.

## Non-goals (v1)

- **No magic/spells system** — no spellbook, mana, or spell effects of any
  kind. Hero stats are limited to Attack, Defense, Level/XP, and Movement
  Points. This is the single biggest scope cut versus the original game.
- **No town-building/creature recruiting economy** — resources (gold,
  wood, ore, crystal, mercury, sulfur, gems) are collected from mines and
  contribute to Kingdom Score, but there is no town screen and nothing to
  spend them on yet in v1. Creature dwellings grant creatures directly and
  passively (US-2) rather than via a paid recruit screen.
- **No procedurally generated maps** — v1 ships one fixed 15×11 hex map
  layout. Map variety/randomization is a future round.
- **No battlefield obstacles/terrain** and **no fog of war on the
  adventure map** — every adventure hex is visible and passable (aside
  from being occupied), and the battlefield is an open field. Both are
  explicit simplifications to keep pathfinding and AI tractable for v1.
- **No creature special abilities** (retaliation limits beyond the
  standard once-per-round rule, regeneration, flying-specific movement,
  spell immunity, etc.) — every creature is plain melee or plain ranged
  with the shared stat set.
- **No multiplayer yet** — see Overview; this is a planned, not
  abandoned, expansion (plan.md's Networking model documents the intended
  approach in advance so v1's state shape doesn't need to be redesigned
  later).
- **No roaming/patrolling monsters** — all monster stacks are stationary
  guards on a mine, dwelling, or open hex.
- **No save/resume** — a game lives in memory for one browser session
  (`localStorage` only persists setup preferences, not an in-progress
  game). Resuming a saved game is a future round.

## Key Entities

- **HexCoord**: `{ q, r }` axial coordinates, used identically by the
  adventure map and the battlefield (different grid dimensions, same
  math).
- **Resource**: one of `gold | wood | ore | crystal | mercury | sulfur |
  gems`.
- **CreatureType**: id, name, tier (1-10), attack, defense, hp, speed,
  dmgMin, dmgMax, ranged (bool), growthPerDay, spriteId.
- **CreatureStack**: `{ creatureTypeId, count }`.
- **HeroType**: id, name, statBias (attack/defense starting split),
  startingArmy (2 `CreatureStack`s), spriteId.
- **Hero**: `{ heroTypeId, owner ('player'|'ai'), position, movementLeft,
  movementMax, level, xp, attack, defense, army (up to 7 CreatureStacks),
  resources ({ [Resource]: number }) }`.
- **MapObject**: a hex's occupant when not empty —
  `{ type: 'mine'|'dwelling'|'monster'|'keep'|'treasure', ...type-specific
  fields (resource id for mines, creatureTypeId for dwellings/monster
  guards), ownerId (null if neutral/unowned), spriteId }`.
- **AdventureState**: `{ day, dayLimit, mapWidth, mapHeight, hexes (map
  object per HexCoord), heroes ({ player, ai }), phase, pendingBattle,
  winner }`.
- **BattleStack**: a `CreatureStack` plus battle-only fields — `{ side
  ('attacker'|'defender'), position, hasRetaliatedThisRound,
  isDefending }`.
- **BattleState**: `{ width, height, stacks (BattleStack[]), turnOrder,
  activeStackIndex, round, phase, winnerSide }`.
