# Implementation Plan: Siege Battlefield Obstacles

**Spec**: [spec.md](./spec.md)
**Builds on**: `specs/001-hex-heroes/plan.md` (battle engine, shared
hex-math Decision #1), `specs/003-siege-and-spells/plan.md` (sieges,
`isSiegeBattle`, the free-action/once-per-round pattern `castSpell` set
up in its Decision #1).

## Technical Context

| Aspect | Choice | Why |
| --- | --- | --- |
| Language/framework | Same as 001/003 — vanilla ES2020 modules, no build step | In-place extension of the existing battle engine. |
| New state | `BattleState.walls: Map<HexKey, hpRemaining>` | A hex's presence in the map doubles as the obstacle flag *and* its remaining HP — one structure, not two kept in sync. |
| Tests | `tests/battle.test.mjs` / `tests/ai.test.mjs` additions | Same `node --test` harness; walls and the catapult are pure state/actions, fully unit-testable without touching main.js. |

## Architecture changes

```
js/battle.js       CHANGED — SIEGE_WALL_COLUMN/SIEGE_GATE_ROW/WALL_HP/
                    CATAPULT_DAMAGE constants, siegeWallLayout() (pure
                    layout generator), createBattle(..., { isSiege } =
                    {}) populates state.walls; isPassable() and the new
                    export isObstacleHex() both consult it; new export
                    attackWall(state, side, targetHex) (the catapult
                    action); round-wrap also resets
                    heroSides.attacker.hasFiredCatapultThisRound
js/ai.js            CHANGED — battlePassable() calls isObstacleHex()
                    (Decision #2, unchanged from the prior revision of
                    this plan); new chooseAiCatapultTarget(state)
                    heuristic (Decision #5)
js/adventure.js      UNCHANGED — isSiegeBattle() (003) already tells
                    main.js everything it needs
js/main.js            CHANGED — createBattle call sites pass { isSiege:
                    isSiegeBattle(adventureState) }; renderBattleMap
                    marks standing wall hexes distinctly; a Fire
                    Catapult control (spell-panel-style picker,
                    attacker-only) calls attackWall; AI turn
                    orchestration also tries chooseAiCatapultTarget each
                    round, same cadence as chooseAiSpell (003)
css/styles.css        CHANGED — .hex-tile.obstacle styling
images/objects/        possible NEW asset — a small wall-segment hex
                    texture/icon, or a CSS-only treatment; decided
                    during implementation
tests/battle.test.mjs  CHANGED — wall layout/HP, movement/pathfinding
                    respects standing walls only, destroyed hexes become
                    passable immediately, ranged/spell targeting
                    unaffected, non-siege battles have zero walls,
                    attackWall gating (attacker-only, once/round, damage/
                    destruction math, doesn't advance turn order)
tests/ai.test.mjs      CHANGED — aiChooseBattleMove never paths through
                    a standing wall hex; chooseAiCatapultTarget targets
                    the lowest-HP standing wall hex, null when none
                    stand or already fired this round
```

### Decision #1: Wall HP lives in one `Map`, not a `Set` + parallel HP table

`state.walls: Map<HexKey, number>` — key presence *is* "this hex is a
standing wall," value is remaining HP. `isObstacleHex(state, hex)` is
just `state.walls.has(key(hex))`. Destruction is one line:
`state.walls.delete(hexKey)` once HP reaches 0 — there's no second data
structure that could ever disagree with the first about whether a hex is
currently passable, which was the exact failure mode Decision #2 (below)
is already guarding against for the *player-vs-AI* passability split.

```js
export const SIEGE_WALL_COLUMN = 6;
export const SIEGE_GATE_ROW = 4;
export const WALL_HP = 40;
export const CATAPULT_DAMAGE = 20; // two hits reliably destroy one wall hex

function siegeWallLayout() {
  const walls = new Map();
  for (let r = 0; r < BATTLE_HEIGHT; r++) {
    if (r === SIEGE_GATE_ROW) continue;
    walls.set(key({ q: SIEGE_WALL_COLUMN, r }), WALL_HP);
  }
  return walls;
}
```

Neither the attacker's (`q=1`) nor defender's (`q=BATTLE_WIDTH-2=9`)
starting column collides with `q=6` — confirmed by inspection (spec.md
FR-8), not just assumption, same as the prior revision of this plan.

### Decision #2: One passability source of truth, exported from `battle.js`

Unchanged from the prior revision of this plan, restated because it's
still exactly as load-bearing now that walls can also *disappear*
mid-battle: `ai.js` has its own `battlePassable(state, ignoreStackId)`,
independent of `battle.js`'s internal `isPassable`. Both must consult the
*same* `isObstacleHex(state, hex) => state.walls.has(key(hex))` export, or
the AI could path through a hex that's still standing (stale belief in
one direction) or refuse a hex that was just destroyed (stale belief in
the other direction, now a live risk since walls change during the
battle, not just at setup). A full merge of the two passability functions
into one shared helper remains a larger refactor than this feature needs
and is left alone.

### Decision #3: Movement-only — ranged/spell targeting is untouched

Unchanged from the prior revision: 001's damage/targeting code has zero
line-of-sight concept, and this feature still doesn't add one.
`isObstacleHex`/`state.walls` are only ever consulted by
`isPassable`/pathing. Destroying a wall hex therefore only ever changes
*where stacks can walk* — it was never blocking ranged attacks or spells
in the first place, so there's nothing to update on that side when a wall
comes down.

### Decision #4: The catapult reuses 003's free-action pattern exactly, with its own flag

003 plan.md Decision #1 established the shape for "a hero action that
doesn't consume a creature's turn": requires some stack of the acting
side to be currently active, resolves immediately, never calls
`advanceTurn`, capped at once per round via a flag on `heroSides[side]`
reset at every round wrap. `attackWall` is the same shape, with three
differences from `castSpell`: it's attacker-only (defenders/militia never
get a catapult — spec.md US-4), it costs no mana and needs no
spellbook entry (it's equipment, not magic — checked via a plain `side
=== 'attacker'` guard, not `heroSides.attacker.spellsKnown`), and it
tracks its own `hasFiredCatapultThisRound` flag *independent* of
`hasCastThisRound` — a hero can both cast a spell and fire the catapult
in the same round, since they're different resources (mana vs. a siege
engine) with no shared budget.

```js
export function attackWall(state, side, targetHex) {
  if (state.phase !== 'battle') return false;
  if (side !== 'attacker') return false;
  const heroSide = state.heroSides.attacker;
  if (!heroSide || heroSide.hasFiredCatapultThisRound) return false;
  const active = getStack(state, state.activeStackId);
  if (!active || active.side !== side) return false;
  const hexKey = key(targetHex);
  if (!state.walls.has(hexKey)) return false;

  const remaining = state.walls.get(hexKey) - CATAPULT_DAMAGE;
  if (remaining <= 0) state.walls.delete(hexKey);
  else state.walls.set(hexKey, remaining);

  heroSide.hasFiredCatapultThisRound = true;
  return true;
}
```

`heroSide` here is guaranteed non-null whenever `side === 'attacker'`,
since 003 FR-3 already established the attacker is always a hero in every
battle type — no extra null-handling needed beyond what `castSpell`
already does defensively.

### Decision #5: AI catapult heuristic — finish what you start

`chooseAiCatapultTarget(state)`, called once per round alongside the
existing `chooseAiSpell` call (003 plan.md Decision #7's cadence): if the
AI is the attacker, hasn't fired this round, and at least one wall hex is
still standing, target the standing hex with the *lowest* remaining HP —
the same "finish off the weakest" shape `aiChooseBattleAttack` already
uses for creature targets (001 plan.md Decision #5), rather than
spreading damage thin across multiple hexes. Cheap, deterministic, and
consistent with every other AI heuristic in this codebase.

### Content values

| constant | value | meaning |
| --- | --- | --- |
| `SIEGE_WALL_COLUMN` | `6` | fixed `q` for every wall hex |
| `SIEGE_GATE_ROW` | `4` | the one `r` at that column that's never a wall |
| `WALL_HP` | `40` | each wall hex's starting HP |
| `CATAPULT_DAMAGE` | `20` | flat damage per catapult shot — two shots destroy one wall hex, an intentionally clean, easy-to-plan-around ratio |

Hand-tabulated, same "explicitly tunable" status as every other content
constant in this project (001 plan.md's mine yields, 003's spell costs)
— not balance-tested, easy to retune once the feature is actually played.
`WALL_HP` (40) is deliberately in the same range as a mid-tier creature
stack's total HP pool, so breaking a wall hex reads as "about as costly
as killing a real stack," not a trivial afterthought.

## Changelog

- **v1.4 (design)** (2026-07-25): Spec + plan authored — static,
  indestructible walls, no catapult.
- **v1.4.1 (design)** (2026-07-25): Revised to destructible walls with
  per-hex HP and an attacker-only catapult free action (this document).
  Not yet implemented — see tasks.md for the phased build-out.
