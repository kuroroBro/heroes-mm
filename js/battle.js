// PURE tactical hex battle rules engine (no DOM). See spec.md US-4/US-5
// and plan.md's Decision #2 (damage formula) and Decision #1 (shared hex
// math with the adventure map).

import { key, equals, distance, findPath, reachable } from './hexgrid.js';
import { getCreature } from './creatures.js';

export const BATTLE_WIDTH = 11;
export const BATTLE_HEIGHT = 9;

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

export function createBattle(attackerArmy, defenderArmy, attackerBonus, defenderBonus, rng = defaultRng) {
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
  };
  computeTurnOrder(state);
  return state;
}

function speedOf(stack) {
  return getCreature(stack.creatureTypeId).speed;
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

function isPassable(state, ignoreStackId) {
  return (hex) => {
    if (hex.q < 0 || hex.q >= state.width || hex.r < 0 || hex.r >= state.height) return false;
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
    for (const s of state.stacks) s.hasRetaliatedThisRound = false;
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
  const effectiveAttack = attackerCreature.attack + attackerStack.heroBonus.attack;
  let effectiveDefense = defenderCreature.defense + defenderStack.heroBonus.defense;
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

  const damage = computeDamage(attacker, target, state.rng);
  applyDamage(target, damage);

  if (!ranged && target.count > 0 && !target.hasRetaliatedThisRound) {
    const retaliationDamage = computeDamage(target, attacker, state.rng);
    applyDamage(attacker, retaliationDamage);
    target.hasRetaliatedThisRound = true;
  }

  attacker.isDefending = false;
  if (checkBattleEnd(state)) return true;
  advanceTurn(state);
  return true;
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

// Surviving stacks of `side`, in the { creatureTypeId, count } shape
// adventure.js expects back (plan.md/spec.md — battle outcome feeds
// straight back into hero.army).
export function survivingStacks(state, side) {
  return state.stacks
    .filter((s) => s.side === side && s.count > 0)
    .map((s) => ({ creatureTypeId: s.creatureTypeId, count: s.count }));
}
