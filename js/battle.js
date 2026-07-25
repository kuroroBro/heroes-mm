// PURE tactical hex battle rules engine (no DOM). See spec.md US-4/US-5
// and plan.md's Decision #2 (damage formula) and Decision #1 (shared hex
// math with the adventure map).

import { key, equals, distance, findPath, reachable } from './hexgrid.js';
import { getCreature } from './creatures.js';
import { getSpell } from './spells.js';

export const BATTLE_WIDTH = 11;
export const BATTLE_HEIGHT = 9;

// specs/004-siege-battlefield content values (plan.md Decision #1): a
// fixed wall column with one open gate row, and how much a catapult shot
// (attackWall) chips off a standing wall hex's HP.
export const SIEGE_WALL_COLUMN = 6;
export const SIEGE_GATE_ROW = 4;
export const WALL_HP = 40;
export const CATAPULT_DAMAGE = 20; // two hits reliably destroy one wall hex

function defaultRng() {
  return Math.random();
}

function randomInt(min, max, rng) {
  return min + Math.floor(rng() * (max - min + 1));
}

// Attacker stacks line up down the left edge (q=1), defender stacks down
// the right edge (q=BATTLE_WIDTH-2), one row apart, centered vertically.
function startingPosition(side, index, total) {
  const q = side === 'attacker' ? 1 : BATTLE_WIDTH - 2;
  const spread = Math.min(total, BATTLE_HEIGHT);
  const startRow = Math.floor((BATTLE_HEIGHT - spread) / 2);
  const r = startRow + (index % spread);
  return { q, r };
}

// A side "has a hero" (and so can cast spells) only if its bonus object
// explicitly carries a `mana` figure — every existing guard/monster/
// militia call site just passes { attack, defense }, which naturally
// means that side has no caster (specs/003-siege-and-spells FR-3).
// `hasFiredCatapultThisRound` is harmless to include for the defender
// too (specs/004-siege-battlefield: only the attacker ever fires one,
// enforced in attackWall, not here).
function heroSideFrom(bonus) {
  if (!bonus || bonus.mana === undefined) return null;
  return {
    mana: bonus.mana, spellsKnown: new Set(bonus.spellsKnown || []),
    hasCastThisRound: false, hasFiredCatapultThisRound: false,
  };
}

// specs/004-siege-battlefield Decision #1: every non-gate hex in
// SIEGE_WALL_COLUMN, each starting at full WALL_HP. A hex's presence in
// the returned Map *is* the "this hex is a standing wall" flag — see
// isObstacleHex.
function siegeWallLayout() {
  const walls = new Map();
  for (let r = 0; r < BATTLE_HEIGHT; r++) {
    if (r === SIEGE_GATE_ROW) continue;
    walls.set(key({ q: SIEGE_WALL_COLUMN, r }), WALL_HP);
  }
  return walls;
}

// `options.isSiege` requests the siege wall layout (specs/004-siege-
// battlefield). `rng` stays in its original position (many existing
// callers, mostly tests, pass it positionally) — pass `undefined` for
// `rng` to keep the default while still supplying `options`.
export function createBattle(attackerArmy, defenderArmy, attackerBonus, defenderBonus, rng = defaultRng, options = {}) {
  const stacks = [];
  attackerArmy.forEach((s, i) => {
    stacks.push({
      id: `attacker-${i}`,
      side: 'attacker',
      creatureTypeId: s.creatureTypeId,
      count: s.count,
      hpDamage: 0,
      position: startingPosition('attacker', i, attackerArmy.length),
      hasRetaliatedThisRound: false,
      isDefending: false,
      heroBonus: attackerBonus || { attack: 0, defense: 0 },
      buffs: [],
    });
  });
  defenderArmy.forEach((s, i) => {
    stacks.push({
      id: `defender-${i}`,
      side: 'defender',
      creatureTypeId: s.creatureTypeId,
      count: s.count,
      hpDamage: 0,
      position: startingPosition('defender', i, defenderArmy.length),
      hasRetaliatedThisRound: false,
      isDefending: false,
      heroBonus: defenderBonus || { attack: 0, defense: 0 },
      buffs: [],
    });
  });

  const state = {
    width: BATTLE_WIDTH,
    height: BATTLE_HEIGHT,
    stacks,
    round: 1,
    activeStackId: null,
    phase: 'battle',
    winnerSide: null,
    rng,
    heroSides: {
      attacker: heroSideFrom(attackerBonus),
      defender: heroSideFrom(defenderBonus),
    },
    walls: options.isSiege ? siegeWallLayout() : new Map(),
  };
  computeTurnOrder(state);
  // Every pre-existing caller always passes two non-empty armies (a
  // guard fight's guard is never empty by construction, a hero's army is
  // never empty by invariant), so this was previously unreachable. An
  // undefended Castle's militia (specs/003-siege-and-spells US-5) can now
  // legitimately be empty — checkBattleEnd only ever runs as a side
  // effect of an action, so a battle starting already-decided needs this
  // explicit check or it would stall forever with nothing left to fight.
  checkBattleEnd(state);
  return state;
}

// Sum of every currently-active buff/debuff this stack has for `stat`
// (specs/003-siege-and-spells Decision #3) — positive for a buff,
// negative for a debuff, 0 if none.
function buffTotal(stack, stat) {
  return (stack.buffs || []).reduce((sum, b) => (b.stat === stat ? sum + b.amount : sum), 0);
}

function speedOf(stack) {
  return getCreature(stack.creatureTypeId).speed + buffTotal(stack, 'speed');
}

function aliveStacks(state) {
  return state.stacks.filter((s) => s.count > 0);
}

// Recompute whose turn it is: sort surviving stacks by Speed descending
// (stable tie-break: attacker before defender, then original array order).
function computeTurnOrder(state) {
  const alive = aliveStacks(state);
  if (alive.length === 0) {
    state.activeStackId = null;
    return;
  }
  const sorted = [...alive].sort((a, b) => {
    if (speedOf(b) !== speedOf(a)) return speedOf(b) - speedOf(a);
    if (a.side !== b.side) return a.side === 'attacker' ? -1 : 1;
    return 0;
  });
  state.activeStackId = sorted[0].id;
}

export function getStack(state, id) {
  return state.stacks.find((s) => s.id === id) || null;
}

function getStackAt(state, hex) {
  return state.stacks.find((s) => s.count > 0 && equals(s.position, hex)) || null;
}

// specs/004-siege-battlefield FR-3: the single source of truth for "is
// this hex currently a standing wall" — a hex's presence in state.walls
// (populated once at createBattle time, shrinking as attackWall destroys
// hexes) is the whole check. Reused by ai.js's own passability function
// so player and AI pathfinding can never disagree about a wall.
export function isObstacleHex(state, hex) {
  return state.walls.has(key(hex));
}

function isPassable(state, ignoreStackId) {
  return (hex) => {
    if (hex.q < 0 || hex.q >= state.width || hex.r < 0 || hex.r >= state.height) return false;
    if (isObstacleHex(state, hex)) return false;
    const occupant = getStackAt(state, hex);
    if (!occupant) return true;
    return occupant.id === ignoreStackId;
  };
}

export function reachableHexes(state, stackId) {
  const stack = getStack(state, stackId);
  if (!stack) return [];
  return reachable(stack.position, isPassable(state, stackId), speedOf(stack));
}

function checkBattleEnd(state) {
  const attackersAlive = aliveStacks(state).some((s) => s.side === 'attacker');
  const defendersAlive = aliveStacks(state).some((s) => s.side === 'defender');
  if (!attackersAlive || !defendersAlive) {
    state.phase = 'over';
    state.winnerSide = attackersAlive ? 'attacker' : 'defender';
    state.activeStackId = null;
    return true;
  }
  return false;
}

// Advance to the next stack's turn (used after an action resolves, or to
// skip a now-dead stack). Wraps to a new round when every surviving stack
// has acted, resetting retaliation flags.
function advanceTurn(state) {
  if (checkBattleEnd(state)) return;
  const alive = aliveStacks(state);
  const order = [...alive].sort((a, b) => {
    if (speedOf(b) !== speedOf(a)) return speedOf(b) - speedOf(a);
    if (a.side !== b.side) return a.side === 'attacker' ? -1 : 1;
    return 0;
  });
  const currentIndex = order.findIndex((s) => s.id === state.activeStackId);
  const nextIndex = currentIndex + 1;
  if (nextIndex >= order.length) {
    state.round += 1;
    for (const s of state.stacks) {
      s.hasRetaliatedThisRound = false;
      s.buffs = s.buffs.map((b) => ({ ...b, roundsLeft: b.roundsLeft - 1 })).filter((b) => b.roundsLeft > 0);
    }
    for (const side of ['attacker', 'defender']) {
      if (state.heroSides[side]) {
        state.heroSides[side].hasCastThisRound = false;
        state.heroSides[side].hasFiredCatapultThisRound = false;
      }
    }
    state.activeStackId = order[0].id;
  } else {
    state.activeStackId = order[nextIndex].id;
  }
}

// Damage formula: plan.md Decision #2 (HoMM3's attack/defense skew,
// capped multiplier).
export function computeDamage(attackerStack, defenderStack, rng) {
  const attackerCreature = getCreature(attackerStack.creatureTypeId);
  const defenderCreature = getCreature(defenderStack.creatureTypeId);
  const effectiveAttack = attackerCreature.attack + attackerStack.heroBonus.attack + buffTotal(attackerStack, 'attack');
  let effectiveDefense = defenderCreature.defense + defenderStack.heroBonus.defense + buffTotal(defenderStack, 'defense');
  if (defenderStack.isDefending) effectiveDefense += 3;

  const base = randomInt(attackerCreature.dmgMin, attackerCreature.dmgMax, rng) * attackerStack.count;
  const skew = effectiveAttack - effectiveDefense;
  let multiplier;
  if (skew >= 0) multiplier = 1 + Math.min(skew, 60) * 0.05;
  else multiplier = Math.max(1 - Math.min(-skew, 28) * 0.025, 0.3);
  return Math.max(1, Math.round(base * multiplier));
}

// Invariant maintained after every call: stack.count * creature.hp -
// stack.hpDamage === true remaining HP. hpDamage must be recomputed
// relative to the *new* (post-death) count, not the pre-damage count —
// otherwise rounding a partial kill up to a whole creature silently
// grants the stack a few points of phantom HP back.
function applyDamage(stack, damage) {
  const creature = getCreature(stack.creatureTypeId);
  const totalHp = stack.count * creature.hp;
  const remaining = Math.max(0, totalHp - stack.hpDamage - damage);
  const newCount = Math.ceil(remaining / creature.hp);
  stack.hpDamage = newCount * creature.hp - remaining;
  stack.count = newCount;
  if (stack.count <= 0) {
    stack.count = 0;
    stack.hpDamage = 0;
  }
}

export function remainingHp(stack) {
  return stack.count * getCreature(stack.creatureTypeId).hp - stack.hpDamage;
}

// Move `stackId` to `targetHex` if reachable this turn. Does not end the
// turn by itself if the stack is now adjacent to an enemy (spec.md US-5 —
// the caller/UI offers an attack next); otherwise ends the turn.
export function moveStack(state, stackId, targetHex) {
  if (state.phase !== 'battle') return false;
  if (state.activeStackId !== stackId) return false;
  const stack = getStack(state, stackId);
  if (!stack || stack.count <= 0) return false;

  const path = findPath(stack.position, targetHex, isPassable(state, stackId), speedOf(stack));
  if (!path) return false;

  stack.position = targetHex;
  const adjacentEnemy = state.stacks.some(
    (s) => s.count > 0 && s.side !== stack.side && distance(s.position, stack.position) === 1,
  );
  if (!adjacentEnemy) advanceTurn(state);
  return true;
}

function canTargetRanged(state, attacker, target) {
  return getCreature(attacker.creatureTypeId).ranged; // v1: no obstacles/LOS blocking (spec.md Non-goals)
}

// Attack an enemy stack. Melee requires adjacency (post-move); ranged
// creatures may attack from anywhere on the field. Ends the acting
// stack's turn.
// On success, returns a small report of what just happened (damage dealt,
// whether the target died, any retaliation, and both stacks' hex
// positions) instead of a bare `true` — the UI (main.js) uses this to show
// floating damage numbers and hit/lunge animations. Positions are included
// directly, not just ids, because a killing blow can end the battle and
// null out the UI's whole battleState (via its own finishBattleIfOver)
// before the UI gets a chance to display anything — the report has to be
// self-contained so displaying it never needs to look anything back up in
// state that might not exist anymore by then. Every failure path still
// returns exactly `false` (not an object), preserving existing
// truthy/falsy call sites and `assert.equal(..., false)` tests.
export function attackStack(state, attackerId, targetId) {
  if (state.phase !== 'battle') return false;
  if (state.activeStackId !== attackerId) return false;
  const attacker = getStack(state, attackerId);
  const target = getStack(state, targetId);
  if (!attacker || !target || attacker.count <= 0 || target.count <= 0) return false;
  if (attacker.side === target.side) return false;

  const ranged = getCreature(attacker.creatureTypeId).ranged;
  const adjacent = distance(attacker.position, target.position) === 1;
  if (!ranged && !adjacent) return false;
  if (ranged && !canTargetRanged(state, attacker, target)) return false;

  const attackerHex = { ...attacker.position };
  const targetHex = { ...target.position };
  const damage = computeDamage(attacker, target, state.rng);
  applyDamage(target, damage);
  const targetDied = target.count <= 0;

  let retaliation = null;
  if (!ranged && target.count > 0 && !target.hasRetaliatedThisRound) {
    const retaliationDamage = computeDamage(target, attacker, state.rng);
    applyDamage(attacker, retaliationDamage);
    target.hasRetaliatedThisRound = true;
    retaliation = { damage: retaliationDamage, attackerDied: attacker.count <= 0 };
  }

  attacker.isDefending = false;
  // creatureTypeId travels alongside each stack's own id/hex for the same
  // self-contained reason as the rest of this report (see comment above):
  // the UI picks a per-creature attack sprite (main.js's
  // showAttackEffect) from this alone, never by looking the stack back up
  // in state.
  const report = {
    ok: true, attackerId, targetId, attackerHex, targetHex,
    attackerCreatureTypeId: attacker.creatureTypeId, targetCreatureTypeId: target.creatureTypeId,
    ranged, damage, targetDied, retaliation,
  };
  if (checkBattleEnd(state)) return report;
  advanceTurn(state);
  return report;
}

export function waitStack(state, stackId) {
  if (state.phase !== 'battle') return false;
  if (state.activeStackId !== stackId) return false;
  advanceTurn(state);
  return true;
}

export function defendStack(state, stackId) {
  if (state.phase !== 'battle') return false;
  if (state.activeStackId !== stackId) return false;
  const stack = getStack(state, stackId);
  if (!stack) return false;
  stack.isDefending = true;
  advanceTurn(state);
  return true;
}

// Reduce hpDamage (restoring remaining HP) without ever exceeding the
// stack's current headcount's max HP — a heal cannot revive creatures
// already lost from the stack (specs/003-siege-and-spells Non-goals: no
// resurrection).
function applyHeal(stack, amount) {
  stack.hpDamage = Math.max(0, stack.hpDamage - amount);
}

// specs/003-siege-and-spells Decision #1: whether `side` can currently
// cast `spellId` at all — a stack belonging to `side` must be the active
// stack (casting is a free action available during your own side's turn
// window, not gated to a specific stack), the hero must know the spell,
// not have already cast this round, and have enough mana. Shared by
// castSpell itself and by UI/AI code that wants to know what's legal
// without actually casting.
export function canCastSpell(state, side, spellId) {
  if (state.phase !== 'battle') return false;
  const heroSide = state.heroSides[side];
  if (!heroSide || heroSide.hasCastThisRound) return false;
  if (!heroSide.spellsKnown.has(spellId)) return false;
  const active = getStack(state, state.activeStackId);
  if (!active || active.side !== side) return false;
  return heroSide.mana >= getSpell(spellId).manaCost;
}

// Resolves which live stacks a spell affects: `targetId` picks exactly
// one stack for a single-target spell (null/not-found -> no valid
// target), or every live stack on the relevant side for an "all" spell.
function resolveSpellTargets(state, side, spell, targetId) {
  const targetsEnemies = spell.target === 'singleEnemy' || spell.target === 'allEnemies';
  const pool = state.stacks.filter((s) => s.count > 0 && (targetsEnemies ? s.side !== side : s.side === side));
  if (spell.target === 'allEnemies' || spell.target === 'allAllies') return pool;
  const target = pool.find((s) => s.id === targetId);
  return target ? [target] : null;
}

function applySpellEffect(spell, targets) {
  if (spell.effect === 'damage') {
    for (const t of targets) applyDamage(t, spell.power);
  } else if (spell.effect === 'heal') {
    for (const t of targets) applyHeal(t, spell.power);
  } else {
    // buff/debuff: replace (don't stack) any existing modifier of the
    // same stat, per spec.md US-3 ("recast simply resets the duration").
    for (const t of targets) {
      t.buffs = t.buffs.filter((b) => b.stat !== spell.stat);
      t.buffs.push({ stat: spell.stat, amount: spell.amount, roundsLeft: spell.durationRounds });
    }
  }
}

// Cast `spellId` for `side`. A free action — unlike every other action in
// this file, it does NOT call advanceTurn (specs/003-siege-and-spells
// Decision #1: hero casting is independent of creature turn order).
// `targetId` is required for single-target spells, ignored for "all"
// spells.
// On success, returns which stacks the spell actually landed on — ids
// *and* hex positions, not just ids, for the same reason attackStack's
// report includes both (see its comment): a damage spell can end the
// battle and null the UI's battleState before it displays anything, so
// the report has to carry everything display needs on its own.
// `casterStackId`/`casterHex` are the active stack at the moment of
// casting, used by the UI as a stand-in hex position for the
// (position-less) hero (`main.js` already has the SPELLS content table to
// look up power/effect/target by `spellId`, so the report doesn't
// duplicate the spell's own data). Captured now rather than left for the
// caller to work out later because casting doesn't call advanceTurn, but
// a move/attack immediately after (same free-action turn) can, so
// `state.activeStackId` may no longer point at the caster by the time
// anyone reads it back. Failure paths stay exactly `false`, same
// reasoning as attackStack's report above.
export function castSpell(state, side, spellId, targetId) {
  if (!canCastSpell(state, side, spellId)) return false;
  const spell = getSpell(spellId);
  const targets = resolveSpellTargets(state, side, spell, targetId);
  if (!targets) return false;

  const casterStackId = state.activeStackId;
  const casterHex = { ...getStack(state, casterStackId).position };
  const targetReports = targets.map((t) => ({ id: t.id, hex: { ...t.position } }));
  applySpellEffect(spell, targets);

  const heroSide = state.heroSides[side];
  heroSide.mana -= spell.manaCost;
  heroSide.hasCastThisRound = true;
  checkBattleEnd(state);
  return { ok: true, side, spellId, casterStackId, casterHex, targets: targetReports };
}

// The catapult (specs/004-siege-battlefield US-4/Decision #4) — the
// attacker's free, once-per-round, siege-only action: fires at a
// standing wall hex for CATAPULT_DAMAGE, destroying it (removing it from
// state.walls, so it's immediately passable) once its HP reaches 0. Same
// free-action shape as castSpell (doesn't consume the turn, doesn't call
// advanceTurn) but no mana/spellbook requirement and its own independent
// once-per-round flag — a hero can both cast a spell and fire the
// catapult in the same round. Only the attacker ever has one; there is
// no defender/militia equivalent.
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

// Surviving stacks of `side`, in the { creatureTypeId, count } shape
// adventure.js expects back (plan.md/spec.md — battle outcome feeds
// straight back into hero.army).
export function survivingStacks(state, side) {
  return state.stacks
    .filter((s) => s.side === side && s.count > 0)
    .map((s) => ({ creatureTypeId: s.creatureTypeId, count: s.count }));
}
