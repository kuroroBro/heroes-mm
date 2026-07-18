// PURE AI decision functions (no DOM, no mutation) — spec.md FR-4,
// plan.md Decision #5. Adventure-map targeting and in-battle action
// choices are both plain "given a state, return a decision" functions;
// main.js is responsible for actually applying the returned decision via
// adventure.js/battle.js.

import { distance, reachable } from './hexgrid.js';
import { getCreature, creaturePower } from './creatures.js';

const WINNABLE_POWER_MARGIN = 1.2;

function armyPower(army) {
  return army.reduce((total, s) => total + creaturePower(getCreature(s.creatureTypeId)) * s.count, 0);
}

function guardPower(occupant) {
  if (!occupant || !occupant.guard || occupant.guard.count <= 0) return 0;
  return creaturePower(getCreature(occupant.guard.creatureTypeId)) * occupant.guard.count;
}

function hexFromKey(k) {
  const [q, r] = k.split(',').map(Number);
  return { q, r };
}

// Adventure-map targeting (plan.md Decision #5, spec.md US-3): nearest
// reachable unguarded mine/dwelling not already owned by `owner`; else
// nearest reachable guarded mine/dwelling/monster the owner's army can
// likely beat; else the enemy hero's own position (always engage if
// nothing better is available). Returns a HexCoord or null only if there
// is truly nothing on the map and no enemy hero (should not happen).
export function aiSelectTarget(state, owner) {
  const hero = state.heroes[owner];
  const power = armyPower(hero.army);
  const enemyOwner = owner === 'player' ? 'ai' : 'player';
  const enemyPos = state.heroes[enemyOwner].position;

  let bestFree = null;
  let bestFreeDist = Infinity;
  let bestWinnable = null;
  let bestWinnableDist = Infinity;

  for (const [k, occupant] of state.hexes) {
    if (occupant.type !== 'mine' && occupant.type !== 'dwelling' && occupant.type !== 'monster') continue;
    if (occupant.ownerId === owner) continue;
    const hex = hexFromKey(k);
    const d = distance(hero.position, hex);
    const hasGuard = occupant.guard && occupant.guard.count > 0;

    if (!hasGuard && occupant.type !== 'monster') {
      if (d < bestFreeDist) {
        bestFreeDist = d;
        bestFree = hex;
      }
      continue;
    }
    if (hasGuard && power >= guardPower(occupant) * WINNABLE_POWER_MARGIN) {
      if (d < bestWinnableDist) {
        bestWinnableDist = d;
        bestWinnable = hex;
      }
    }
  }

  if (bestFree) return bestFree;
  if (bestWinnable) return bestWinnable;
  return enemyPos;
}

function battlePassable(state, ignoreStackId) {
  return (hex) => {
    if (hex.q < 0 || hex.q >= state.width || hex.r < 0 || hex.r >= state.height) return false;
    const occupant = state.stacks.find((s) => s.count > 0 && s.position.q === hex.q && s.position.r === hex.r);
    return !occupant || occupant.id === ignoreStackId;
  };
}

function speedOf(stack) {
  return getCreature(stack.creatureTypeId).speed;
}

function remainingHp(stack) {
  return stack.count * getCreature(stack.creatureTypeId).hp - stack.hpDamage;
}

function nearestEnemyStack(state, stack) {
  const enemies = state.stacks.filter((s) => s.count > 0 && s.side !== stack.side);
  if (enemies.length === 0) return null;
  return enemies.reduce((best, e) => (distance(stack.position, e.position) < distance(stack.position, best.position) ? e : best));
}

// Battle movement (plan.md Decision #5): if already adjacent to an enemy,
// or ranged (no need to move to attack, v1 has no LOS blocking), don't
// move. Otherwise, among every hex reachable this turn (bounded by the
// stack's Speed), move to whichever one ends up closest to the nearest
// enemy stack — this reaches an adjacent hex outright when the gap fits
// within Speed, and still makes guaranteed progress every turn when it
// doesn't (no standing still waiting for an unreachable target).
export function aiChooseBattleMove(state, stackId) {
  const stack = state.stacks.find((s) => s.id === stackId);
  if (!stack) return null;
  if (getCreature(stack.creatureTypeId).ranged) return null;

  const enemy = nearestEnemyStack(state, stack);
  if (!enemy) return null;
  if (distance(stack.position, enemy.position) === 1) return null;

  const passable = battlePassable(state, stackId);
  const options = reachable(stack.position, passable, speedOf(stack));

  let best = null;
  let bestDist = Infinity;
  for (const hex of options) {
    if (hex.q === stack.position.q && hex.r === stack.position.r) continue;
    const d = distance(hex, enemy.position);
    if (d < bestDist) {
      bestDist = d;
      best = hex;
    }
  }
  return best ? { targetHex: best } : null;
}

// Battle attack choice (plan.md Decision #5): among legally-attackable
// enemy stacks (adjacent for melee, any for ranged), attack the one with
// the lowest remaining HP pool. Returns { targetId } or null (nothing in
// range this turn).
export function aiChooseBattleAttack(state, stackId) {
  const stack = state.stacks.find((s) => s.id === stackId);
  if (!stack) return null;
  const ranged = getCreature(stack.creatureTypeId).ranged;

  const targets = state.stacks.filter((s) => {
    if (s.count <= 0 || s.side === stack.side) return false;
    return ranged || distance(s.position, stack.position) === 1;
  });
  if (targets.length === 0) return null;

  const best = targets.reduce((weakest, s) => (remainingHp(s) < remainingHp(weakest) ? s : weakest));
  return { targetId: best.id };
}
