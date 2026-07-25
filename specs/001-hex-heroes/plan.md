# Implementation Plan: Hex Heroes

**Spec**: [spec.md](./spec.md)

## Technical Context

| Aspect | Choice | Why |
| --- | --- | --- |
| Language | Vanilla ES2020 modules (HTML/CSS/JS) | No build step; the repo is the deployable artifact. Same call every sibling game makes. |
| Framework | None | Two state machines (adventure + battle) plus render functions per screen; no framework needed at this size. |
| Realtime | None in v1; PeerJS reserved for a future multiplayer round | v1 is single-device (human vs. AI); see Networking model below for the planned shape. |
| Persistence | `localStorage` | Last-picked hero type only in v1 (no save/resume — see spec.md Non-goals). |
| Tests | `node --test` on every pure module | `hexgrid.js`, `adventure.js`, `battle.js`, `ai.js` are all DOM-free and fully unit-testable. |
| Deploy | GitHub Actions → `actions/deploy-pages` | Matches every sibling repo. |

## Architecture

```
index.html            shell + screens (home / setup / adventure / battle / gameover)
css/styles.css         hex-grid rendering (both adventure and battle reuse the same hex-tile CSS), UI chrome
js/hexgrid.js           PURE hex coordinate math — shared by adventure map and battlefield
js/creatures.js          content: 10 creature tiers
js/heroTypes.js          content: 3 hero types (Marshal/Warlord/Sentinel)
js/resources.js          content: 7 resource types + mine yield table
js/mapObjects.js         content: adventure map object placement (fixed v1 layout) + spriteId lookup
js/sprites.js             shared sprite-lookup function (spriteId -> image path), placeholder-aware
js/adventure.js           PURE adventure-map rules engine
js/battle.js              PURE tactical hex battle rules engine
js/ai.js                  PURE AI decision functions (adventure targeting + battle actions)
js/storage.js              localStorage settings
js/main.js                 DOM wiring: screen routing, render loops, input handling, AI turn orchestration
tests/hexgrid.test.mjs
tests/adventure.test.mjs
tests/battle.test.mjs
tests/ai.test.mjs
images/objects/           placeholder SVGs for mines/dwellings/monsters/keep/treasure
images/creatures/          placeholder SVGs for the 10 creature tiers
.github/workflows/deploy.yml
```

### Decision #1: One shared hex-math module for both grids

The adventure map (15×11) and the battlefield (11×9) are both plain hex
grids using **axial coordinates** `{q, r}` internally, converted to pixel
`{x, y}` only at render time (flat-top hex layout). `js/hexgrid.js` exports
grid-size-agnostic functions — `neighbors`, `distance`, `hexesInRange`,
`findPath(start, goal, isPassable, maxCost)` (BFS/Dijkstra with a
per-hex cost of 1) — that both `adventure.js` and `battle.js` call with
their own passability rules. This avoids writing hex math twice and
matches the spec's explicit framing (FR-2) that these are "two
different-sized instances of the same underlying hex grid system."

### Decision #2: Damage formula — reuse the classic HoMM3 attack/defense skew

```
baseDamage = randomInt(dmgMin, dmgMax) * stackCount
if (attack > defense):
  bonus = min(attack - defense, 60) * 0.05      // +5%/point, capped at +300%... 
```
Concretely, using HoMM3's actual published formula (capped, not linear
forever):
```
skew = attacker.attack - defender.defense
if (skew >= 0):  multiplier = 1 + min(skew, 60) * 0.05   // cap +300% at skew=60
if (skew < 0):   multiplier = 1 - min(-skew, 28) * 0.025 // cap -70% at skew=-28... clamp to min 0.3
finalDamage = round(baseDamage * multiplier)
```
This is a well-documented, battle-tested formula (pun intended) — reusing
it beats inventing a new one, and it's simple enough to unit-test exactly
(fixed rng seed → exact expected damage).

Casualties: `remainingHp = stack.count * creature.hp - damageTaken`;
`stack.count = ceil(max(remainingHp, 0) / creature.hp)`. This tracks a
single HP pool per stack rather than per-unit HP, which is the standard
simplification and is what makes `battle.js`'s state trivially
serializable (`{ creatureTypeId, count }` plus a running `hpDamage` field,
not an array of individual units).

### Decision #3: No town-building — dwellings grant creatures passively

> **Superseded by `specs/002-castle-creatures`** (2026-07-22): a captured
> dwelling now unlocks its creature type at the hero's Castle instead of
> instantly merging it into the army, and creatures can also be unlocked
> by building in the Castle without ever finding/fighting the map hex.
> Left below as the historical v1 record of why this was cut in the first
> place — see `specs/002-castle-creatures/plan.md` for the current rules.

Rather than build a town/recruit-queue screen (a large subsystem on its
own — see spec.md Non-goals), a captured **dwelling** hex just accrues
`growthPerDay` creatures of its tied type each day, up to a fixed max
garrison (10× growthPerDay), and revisiting the hex (US-2's capture rule)
merges any waiting creatures into a matching army slot, or a free slot if
none matches. Resources from mines feed **Kingdom Score** only in v1 (see
spec.md US-6) — there's deliberately nothing to spend them on yet, which
keeps the v1 economy legible without a store/recruit UI.

### Decision #4: Fixed 30-day limit + Kingdom Score as the secondary win condition

A pure "defeat the enemy hero" win condition risks a stalemate if the AI
and player simply never find each other on a 15×11 map (especially since
v1's AI reassigns targets daily rather than actively hunting the player
from turn one — see spec.md US-3). The Day 30 / Kingdom Score fallback
(spec.md US-6) guarantees every game actually concludes, without requiring
a real "which hero is winning" heuristic beyond a simple weighted score
that was already needed for AI target-evaluation (Decision #5).

### Decision #5: AI heuristics — cheap, deterministic, testable

**Adventure-map targeting** (`ai.js`): estimate whether the AI's current
army "can likely beat" a target's guard stack by comparing summed
`(attack+defense+hp*0.1)*count` army power on both sides — if the AI's
power ≥ 1.2× the guard's power, it's a viable target. This is intentionally
crude (no formula-accurate damage simulation) — good enough for a
non-frustrating opponent, cheap to compute for every candidate hex every
day, and easy to unit test with fixed fixture armies.

**Battle actions** (`ai.js`, used for both the AI hero's stacks and — for
consistency — could later drive neutral monsters if they ever get in-battle
choices beyond "sit there and get attacked," though v1 monsters don't move
before being engaged): on a stack's turn, if any enemy stack is already
adjacent, attack the adjacent enemy with the lowest current HP pool
(finish off weakened stacks first); else, path toward the nearest enemy
stack and attack if now adjacent; if no enemy is reachable this turn,
Wait. No retreat/regroup logic in v1 (see spec.md Non-goals implicitly —
AI always presses the fight once a battle starts, matching the "AI is
aggressive" framing in US-3).

### Content values

**Resources**: `gold, wood, ore, crystal, mercury, sulfur, gems`. Mine
daily yield: Gold Mine = 1000 gold/day; Sawmill (wood) / Ore Pit = 2/day;
Crystal / Mercury / Sulfur / Gem mines = 1/day. (Baseline values lifted
directly from HoMM3's own mine economy, since they're already
well-balanced relative to each other.)

**Hero types** (`heroTypes.js`):
| id | name | attack | defense | starting army |
| --- | --- | --- | --- | --- |
| marshal | Marshal | 2 | 2 | Pikemen ×10, Archers ×6 |
| warlord | Warlord | 3 | 1 | Wolves ×8, Orcs ×4 |
| sentinel | Sentinel | 1 | 3 | Peasants ×15, Griffins ×3 |

Movement points/day: 8 hexes, all hero types (kept uniform in v1 — no
movement-bias stat). Level-up: every 1000 XP, `level += 1` and Attack/
Defense alternately `+= 1` (Attack on odd levels, Defense on even).

**Creature tiers** (`creatures.js`) — id / tier / attack / defense / hp /
speed / dmg / ranged / growthPerDay:
1. Peasant — 1/1/1/3 — dmg 1-1 — melee — growth 8
2. Pikeman — 3/4/8/4 — dmg 1-2 — melee — growth 6
3. Archer — 5/3/6/4 — dmg 2-3 — ranged — growth 5
4. Wolf — 6/3/7/7 — dmg 2-3 — melee — growth 4
5. Orc — 8/6/15/5 — dmg 3-5 — ranged — growth 3
6. Griffin — 9/9/18/9 — dmg 3-6 — melee — growth 3
7. Ogre — 10/8/40/4 — dmg 5-9 — melee — growth 2
8. Skeleton — 6/6/6/4 — dmg 1-3 — melee — growth 6
9. Troll — 12/10/40/5 — dmg 6-10 — melee — growth 2
10. Dragon — 16/16/180/9 — dmg 25-50 — melee — growth 1

Each creature tier ≥3 that has a dwelling on the map (v1 map places one
dwelling per tier 3/5/7/9, guarded by 2× that tier's own creature as a
classic tactical-strategy self-guard) and one Gold Mine + one of each other
resource mine, laid out across the fixed 15×11 map, symmetric-ish between
the two Keep corners so neither hero has a structural advantage.

### Networking model (planned, not built in v1)

When multiplayer is added, it follows every sibling game's exact pattern:
host-authoritative state, PeerJS/WebRTC over the public broker, a
`redactState` step before broadcast. The interesting design question is
*what* gets redacted — unlike the party games (which hide one secret
answer), this genre's natural hidden information is fog-of-war
(each player shouldn't see the other's unexplored territory or exact army
composition). v1 deliberately has no fog-of-war (spec.md Non-goals)
specifically so that adding it later is additive (a new visibility layer
computed from each hero's position/sight-range) rather than requiring a
redesign of `AdventureState`'s already-fully-visible shape. `ID_PREFIX`
reserved: `hexheroes-room-`.

### Custom art

All map objects, hero tokens, and creature portraits render via
`js/sprites.js`'s `spriteId -> image path` lookup, currently pointing at
hand-authored placeholder SVGs in `images/objects/` and
`images/creatures/` (flat, high-contrast, minimal — legible as small
adventure-map icons and as slightly larger battle-portrait icons from the
same file). Swapping in `image-gen`-produced art later means only adding
files and updating the lookup table — no engine/content-shape changes,
per FR-3.

## Changelog

- **v1** (2026-07-18): Initial build — 15×11 hex adventure map, 11×9 hex
  tactical battlefield, 3 hero types, 10 creature tiers, 7 resources, mines
  + dwellings + neutral guards, simple adventure/battle AI, Day-30/Kingdom
  Score fallback win condition, placeholder sprite art, SDD docs, GitHub
  Pages deploy. No magic, no town-building, no multiplayer yet (all
  explicitly planned future rounds).
