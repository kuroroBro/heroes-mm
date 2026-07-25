// PURE AI decision functions (no DOM, no mutation) — spec.md FR-4,
// plan.md Decision #5. Adventure-map targeting and in-battle action
// choices are both plain "given a state, return a decision" functions;
// main.js is responsible for actually applying the returned decision via
// adventure.js/battle.js.

import { distance, reachable, equals } from './hexgrid.js';
import { getCreature, creaturePower, CREATURES } from './creatures.js';
import {
  canAffordBuild, buildDwelling, maxRecruitable, recruitCreatures,
  canAffordLearnSpell, learnSpell,
} from './castle.js';
import { canCastSpell, isObstacleHex } from './battle.js';
import { SPELLS } from './spells.js';

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
// likely beat; else — specs/003-siege-and-spells Decision #8 — the
// enemy's Keep, if reachable and their hero isn't standing there (that's
// just the plain enemy-hero fallback below, not a raid) — an away hero's
// Keep has no defense of its own, so this is always a free raid, no power
// check needed; else the enemy hero's own position (always engage if
// nothing better is available). Returns a HexCoord or null only if there
// is truly nothing on the map and no enemy hero (should not happen).
export function aiSelectTarget(state, owner) {
  const hero = state.heroes[owner];
  const power = armyPower(hero.army);
  const enemyOwner = owner === 'player' ? 'ai' : 'player';
  const enemyHero = state.heroes[enemyOwner];
  const enemyPos = enemyHero.position;

  let bestFree = null;
  let bestFreeDist = Infinity;
  let bestWinnable = null;
  let bestWinnableDist = Infinity;
  let siegeTarget = null;
  let siegeDist = Infinity;

  for (const [k, occupant] of state.hexes) {
    const hex = hexFromKey(k);
    const d = distance(hero.position, hex);

    if (occupant.type === 'keep') {
      if (occupant.ownerId === enemyOwner && !equals(enemyHero.position, hex) && d < siegeDist) {
        siegeDist = d;
        siegeTarget = hex;
      }
      continue;
    }

    if (occupant.type !== 'mine' && occupant.type !== 'dwelling' && occupant.type !== 'monster') continue;
    if (occupant.ownerId === owner) continue;
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
  if (siegeTarget) return siegeTarget;
  return enemyPos;
}

// specs/004-siege-battlefield Decision #2: must consult the exact same
// isObstacleHex source battle.js's own internal passability check uses —
// otherwise the AI could believe a standing wall hex is reachable (or a
// destroyed one still blocked) and stall trying to act on that belief.
function battlePassable(state, ignoreStackId) {
  return (hex) => {
    if (hex.q < 0 || hex.q >= state.width || hex.r < 0 || hex.r >= state.height) return false;
    if (isObstacleHex(state, hex)) return false;
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

// Battle spellcasting (specs/003-siege-and-spells Decision #7): prefer
// Fireball against 2+ enemy stacks, else Magic Arrow on the weakest
// enemy, else a self-buff (Bless/Haste) when currently behind on army
// power, else save mana. Returns { spellId, targetId? } or null. Callers
// check this once per round for a side with a hero present, same cadence
// canCastSpell already gates internally (once per round, known+affordable).
export function chooseAiSpell(state, side) {
  const enemyStacks = state.stacks.filter((s) => s.count > 0 && s.side !== side);
  if (enemyStacks.length === 0) return null;

  if (enemyStacks.length >= 2 && canCastSpell(state, side, 'fireball')) {
    return { spellId: 'fireball' };
  }
  if (canCastSpell(state, side, 'magicArrow')) {
    const weakest = enemyStacks.reduce((w, s) => (remainingHp(s) < remainingHp(w) ? s : w));
    return { spellId: 'magicArrow', targetId: weakest.id };
  }
  const allyStacks = state.stacks.filter((s) => s.count > 0 && s.side === side);
  if (armyPower(allyStacks) < armyPower(enemyStacks)) {
    if (canCastSpell(state, side, 'bless')) return { spellId: 'bless' };
    if (canCastSpell(state, side, 'haste')) return { spellId: 'haste' };
  }
  return null;
}

// The AI's catapult use (specs/004-siege-battlefield Decision #5):
// "finish off the weakest" — same shape as aiChooseBattleAttack's target
// choice — among currently-standing wall hexes, target the one with the
// least remaining HP, so shots concentrate on breaking one gap rather
// than spreading thin across many. Returns a HexCoord or null if there's
// nothing to shoot at (no walls at all, or none still standing) or the
// AI isn't the attacker — callers (main.js) still need to check
// state.heroSides.attacker.hasFiredCatapultThisRound themselves the same
// way they already do for chooseAiSpell, since that's enforced by
// attackWall itself, not this pure decision function.
export function chooseAiCatapultTarget(state, side) {
  if (side !== 'attacker' || !state.walls || state.walls.size === 0) return null;
  let best = null;
  let bestHp = Infinity;
  for (const [hexKey, hp] of state.walls) {
    if (hp < bestHp) {
      bestHp = hp;
      best = hexFromKey(hexKey);
    }
  }
  return best;
}

// Castle management (specs/002-castle-creatures/plan.md Decision #4,
// extended by specs/003-siege-and-spells): once per AI day, build the
// lowest-tier not-yet-unlocked dwelling it can currently afford (at most
// one build/day, so the AI's economy grows smoothly rather than dumping
// days of saved resources into one build the instant it can afford it),
// then greedily recruit lowest-tier-first from its pool until nothing
// more is affordable or the army is full, then likewise learn the
// cheapest not-yet-known spell it can afford (at most one/day, same
// smoothing rationale as the dwelling build). Mutates `state` directly
// (state.heroes[owner].resources/castle/army/spellbook), same
// mutate-in-place convention as adventure.js/battle.js.
export function chooseAiCastleActions(state, owner) {
  const hero = state.heroes[owner];
  for (const creature of CREATURES) {
    if (canAffordBuild(hero, creature.id)) {
      buildDwelling(state, owner, creature.id);
      break;
    }
  }
  for (const creature of CREATURES) {
    const count = maxRecruitable(hero, creature.id);
    if (count > 0) recruitCreatures(state, owner, creature.id, count);
  }
  for (const spell of SPELLS) {
    if (canAffordLearnSpell(hero, spell.id)) {
      learnSpell(state, owner, spell.id);
      break;
    }
  }
}
