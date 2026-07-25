# Feature Specification: Siege Battlefield Obstacles

**Feature branch**: `004-siege-battlefield`
**Status**: Draft (revised — destructible walls + catapult)
**Created**: 2026-07-25
**Depends on**: `specs/003-siege-and-spells` (castle sieges, the siege wall
backdrop banner), `specs/001-hex-heroes` (battle engine)

## Overview

003 gave sieges a distinct *look* (the castle-wall backdrop banner) but
explicitly kept the *battlefield* identical to every other fight — a Non-
goal at the time ("a siege uses the same open 11×9 battlefield as every
other battle"). This feature reopens that specific Non-goal (and, scoped
to sieges only, 001's broader "no battlefield obstacles" Non-goal): a
siege battle's hex grid now has real **wall obstacle hexes** — a
mostly-solid wall running across the field with a single gate gap — that
block movement, forcing the attacker to funnel through the gate instead
of approaching on a wide-open front. Every other battle type (open-field
hero-vs-hero, guard/monster fights) is completely unaffected — unchanged,
obstacle-free, exactly as 001 shipped it.

**Revision**: walls are now **destructible**, and the attacking hero has
a **catapult** — a free, siege-only, once-per-round action (structurally
identical to 003's "cast a spell" free action) that fires at a chosen
standing wall hex for flat damage. Enough hits destroy that hex, turning
it into normal open ground for the rest of the battle — letting the
attacker blast a *second* gap elsewhere instead of funneling everyone
through the one defended gate. Only the attacker gets a catapult (you
don't bombard your own walls); defenders have no equivalent.

Still deliberately scoped down from the original game's full siege
system: one fixed wall/gate layout, no wall towers or auto-attacking
archers, the catapult can't be targeted/destroyed itself, and there is
still no line-of-sight blocking for ranged attacks or spells (obstacles —
standing or being shot at — block movement only). See Non-goals.

## User Stories

### US-1: A siege battlefield has a wall with a single gate
As a player attacking (or defending) a Castle, I want the siege
battlefield to actually look and play like a siege — a wall between the
armies with one way through — so sieges feel tactically distinct from an
open-field fight, not just re-skinned.

**Acceptance criteria**
- Whenever a battle is a siege (`adventure.js`'s `isSiegeBattle`, from
  003 — a militia raid, or a hero-vs-hero fight at the defender's own
  Keep), the battlefield has a vertical line of **wall hexes** at a fixed
  column between the two starting edges, spanning every row except one
  **gate** row left open.
- Standing wall hexes are impassable to movement for every stack, on both
  sides. The gate hex is, and always was, normal open ground.
- Any other battle (open-field hero-vs-hero away from the Keep, guard/
  monster fights, and non-siege fights in general) has no obstacles at
  all — the wall only exists for siege battles, unchanged from 001/003
  otherwise.
- Wall hexes render visibly distinct from open ground on the battle map
  (a wall-textured hex, not just an empty/normal tile), so the chokepoint
  is obvious at a glance. A destroyed wall hex reverts to the normal open
  hex-tile appearance.

### US-2: Movement and pathfinding respect standing walls
As a player (or the AI), I want my stacks' move-range highlighting and
actual movement to correctly treat *standing* wall hexes as impassable
(and a hex that gets destroyed mid-battle to immediately become usable),
so I'm never shown a route that turns out to be illegal, and the AI never
tries to walk into a wall.

**Acceptance criteria**
- The reachable-hex highlight (001 US-5) never includes a currently-
  standing wall hex, and clicking one is a no-op. The instant a wall hex
  is destroyed (US-4), it's treated as open ground for every subsequent
  reachability/pathing check for the rest of the battle — no stale state.
- Pathfinding routes around standing wall hexes toward the gate (or a
  freshly-opened gap) the same way it already routes around occupied
  hexes (001 plan.md Decision #1 — the same shared hex-math module, no
  separate pathfinding system).
- The AI's battle movement heuristic (001 plan.md Decision #5) uses the
  exact same obstacle information as the player-facing pathfinding — no
  separate/out-of-sync passability logic that could let the AI "believe"
  a standing wall hex is reachable and stall trying to move into it.

### US-3: Ranged attacks and spells still ignore the wall
As a player, I want archers, casters, and the enemy's own ranged stacks
to still be able to shoot over the wall, so the wall is a *movement*
chokepoint, not a full line-of-sight blocker — keeping the tactical
picture legible (a defender's archers behind the wall are not
untouchable, but their melee stacks are protected until someone reaches
an opening).

**Acceptance criteria**
- Ranged creature attacks (001 US-5) and all 6 spells (003 US-3) can
  still target any live enemy stack regardless of the wall, identical to
  how they already ignore distance/obstruction today (001 plan.md's
  existing "no LOS blocking" simplification is *not* changed by this
  feature — it now also explicitly covers wall hexes, not just distance).

### US-4: The attacker's catapult can blast open a new gap
As the attacking player, I want a way to open a second path through the
wall instead of only ever funneling my whole army through the one
defended gate, so I have a real tactical choice (and so a defender who
masses everything at the gate can be punished for it).

**Acceptance criteria**
- Whenever it's the attacker's turn window in a siege battle (any
  attacker stack currently active — the exact same free-action window
  003's spellcasting uses) and the attacker hasn't fired the catapult yet
  this round, a **Fire Catapult** option is available, targeting any
  currently-standing wall hex.
- Firing deals a fixed flat amount of damage to that wall hex's remaining
  HP (plan.md content values); at 0 HP the hex is destroyed and
  immediately becomes passable open ground for the rest of the battle
  (US-2). Two catapult hits reliably destroy one wall hex (plan.md
  content values are tuned for this exact, easy-to-reason-about pace).
- Firing the catapult is free (no mana, no spellbook requirement — it's
  siege equipment, not magic) and, like casting a spell, does **not**
  consume the acting stack's turn or advance turn order; it's capped at
  once per round, tracked independently of whether the hero also cast a
  spell that round (a hero can do both in the same round).
- Only the **attacker** ever has a catapult — the defending side (hero or
  militia) has no equivalent action, matching the original game (you
  don't bombard your own walls) and this project's "sieges are inherently
  asymmetric" framing (003 US-5/US-6).
- The AI attacker also uses its catapult (plan.md Decision #5) —
  targeting the standing wall hex with the least remaining HP each round
  it's available, so it reliably finishes what it starts rather than
  spreading shots across many hexes.

## Functional Requirements

- FR-1: `battle.js` gains a fixed siege wall layout (a wall column and a
  gate row, plan.md content values) and populates `state.walls` — a `Map`
  of wall-hex-key to remaining HP — whenever `createBattle` is called for
  a siege battle; empty `Map` otherwise.
- FR-2: `battle.js`'s internal passability check (used by `moveStack`,
  `reachableHexes`, and `findPath`-based routing) treats every hex still
  present in `state.walls` as impassable, the same way it already treats
  occupied hexes; a destroyed (removed) wall hex is passable immediately.
- FR-3: A new pure export from `battle.js`, `isObstacleHex(state, hex)`,
  is the single source of truth for "is this hex currently a standing
  wall," reused by both `battle.js` internally and `ai.js`'s own battle-
  movement passability check — no duplicated/out-of-sync obstacle logic
  (US-2).
- FR-4: Ranged-attack and spell targeting logic is explicitly unchanged —
  no new obstruction/line-of-sight check is added there (US-3).
- FR-5: A new pure action export from `battle.js`, `attackWall(state,
  side, targetHex)`, implements the catapult (US-4) — attacker-only,
  once-per-round, doesn't advance turn order, mirrors 003 plan.md
  Decision #1's `castSpell` gating pattern but with no mana/spellbook
  requirement and its own independent once-per-round flag.
- FR-6: `main.js`'s battle-map rendering marks standing wall hexes with a
  distinct visual treatment (styled tile, or a wall-segment sprite)
  instead of the normal hex-tile fill, reverting to normal the instant a
  hex is destroyed; a Fire Catapult control (spell-panel-style picker) is
  shown to the player only during a siege, only on their turn window,
  only as the attacker.
- FR-7: `ai.js` gains a catapult-targeting heuristic (US-4's "lowest
  remaining HP standing wall hex") alongside its existing spellcasting
  heuristic (003 plan.md Decision #7).
- FR-8: Starting positions for both sides (001 plan.md's
  `startingPosition`) never land on the wall column, so this feature
  requires no change to how armies are placed at battle start.

## Non-goals (this feature)

- **No siege towers or auto-attacking archers** — the original game's
  wall towers that shoot the attacker are not modeled. The wall (and its
  destruction) is the entire siege-terrain feature.
- **No catapult as a targetable/destroyable unit** — unlike the original
  game (where defenders can kill the catapult to deny further wall
  damage), the attacker's catapult here is an abstract per-round action,
  not a battlefield unit with its own HP or position.
- **No line-of-sight blocking** — ranged attacks and spells continue to
  ignore obstacles/distance entirely, matching 001's existing "no LOS"
  simplification (US-3). The wall (standing or being shot at) is a pure
  movement obstacle.
- **No moat, water, or other terrain types** — only one obstacle type
  (wall) exists, and only one fixed layout (one wall column, one gate).
- **No variation between sieges** — every siege battle uses the identical
  wall/gate layout and the identical wall HP/catapult damage numbers;
  there's no per-Castle or randomized battlefield, and no hero stat
  (e.g. a "Ballistics" skill) affects catapult damage.
- **No repairing/reinforcing walls** — destruction is one-directional;
  nothing restores a destroyed wall hex mid-battle.
- **No obstacles (or catapult) in non-siege battles** — open-field hero-
  vs-hero fights and guard/monster fights remain exactly as 001 shipped
  them, fully open, no exceptions.

## Key Entities (additions to 001/003)

- **BattleState** (`battle.js`) gains `walls: Map<HexKey, hpRemaining>` —
  empty for non-siege battles, populated with the fixed wall layout
  (every hex starting at full HP) for sieges. A hex's presence in this
  map *is* the obstacle check (FR-3); removal on reaching 0 HP is the
  entire "destruction" mechanic.
- **`createBattle`** gains an options parameter carrying `isSiege:
  boolean` (or equivalent) so callers (`main.js`) can request the siege
  layout using the same `isSiegeBattle(state)` check 003 already
  introduced for the backdrop banner.
- **`heroSides.attacker`** (already tracks `mana`/`spellsKnown`/
  `hasCastThisRound` per 003) gains `hasFiredCatapultThisRound: boolean`,
  reset alongside the existing per-round flag at every round wrap.
