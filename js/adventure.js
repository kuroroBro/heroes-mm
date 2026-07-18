// PURE adventure-map rules engine (no DOM). See spec.md US-2/US-3/US-6 and
// plan.md's Decisions #1/#3/#4. Battle resolution itself lives in
// battle.js; this module only tracks *when* a battle starts and applies
// its outcome back onto the map/hero state.

import { key, equals, findPath, inRect } from './hexgrid.js';
import { getHeroType } from './heroTypes.js';
import { getCreature, creaturePower } from './creatures.js';
import { emptyResourcePool, MINE_YIELD } from './resources.js';
import { MAP_WIDTH, MAP_HEIGHT, MAP_OBJECTS, KEEP_PLAYER, KEEP_AI } from './mapObjects.js';

export const MOVEMENT_PER_DAY = 8;
export const DAY_LIMIT = 30;
export const MAX_ARMY_SLOTS = 7;
const DWELLING_MAX_GARRISON_MULT = 10;
const XP_PER_LEVEL = 1000;
const XP_PER_ARMY_VALUE = 2; // XP gained = defeated army value * this multiplier

function homeKeep(owner) {
  return owner === 'player' ? KEEP_PLAYER : KEEP_AI;
}

function otherOwner(owner) {
  return owner === 'player' ? 'ai' : 'player';
}

function createHero(owner, heroTypeId) {
  const heroType = getHeroType(heroTypeId);
  return {
    heroTypeId,
    owner,
    position: homeKeep(owner),
    movementLeft: MOVEMENT_PER_DAY,
    movementMax: MOVEMENT_PER_DAY,
    level: 1,
    xp: 0,
    attack: heroType.attack,
    defense: heroType.defense,
    army: heroType.startingArmy.map((s) => ({ ...s })),
    resources: emptyResourcePool(),
  };
}

export function createAdventure(playerHeroTypeId, aiHeroTypeId) {
  const hexes = new Map();
  for (const { hex, object } of MAP_OBJECTS) {
    hexes.set(key(hex), structuredClone(object));
  }
  return {
    day: 1,
    dayLimit: DAY_LIMIT,
    mapWidth: MAP_WIDTH,
    mapHeight: MAP_HEIGHT,
    hexes,
    heroes: {
      player: createHero('player', playerHeroTypeId),
      ai: createHero('ai', aiHeroTypeId),
    },
    phase: 'playing',
    pendingBattle: null,
    winner: null,
    winReason: null,
  };
}

function getObject(state, hex) {
  return state.hexes.get(key(hex)) || null;
}

function isPassableForMove(state, owner, goal) {
  return (hex) => {
    if (!inRect(hex, state.mapWidth, state.mapHeight)) return false;
    const isGoal = equals(hex, goal);
    const opponent = state.heroes[otherOwner(owner)];
    if (equals(opponent.position, hex)) return isGoal;
    if (getObject(state, hex)) return isGoal;
    return true;
  };
}

// Merge `count` of `creatureTypeId` into `army` (mutates army in place),
// preferring an existing matching stack, else the first free slot up to
// MAX_ARMY_SLOTS. Excess when the army is full and no matching stack
// exists is dropped (documented v1 edge case — see plan.md content values,
// the 4 dwellings + 2 starting stacks fit comfortably under 7 slots).
function mergeIntoArmy(army, creatureTypeId, count) {
  if (count <= 0) return;
  const existing = army.find((s) => s.creatureTypeId === creatureTypeId);
  if (existing) {
    existing.count += count;
    return;
  }
  if (army.length < MAX_ARMY_SLOTS) {
    army.push({ creatureTypeId, count });
  }
}

function armyValue(army) {
  return army.reduce((total, s) => total + creaturePower(getCreature(s.creatureTypeId)) * s.count, 0);
}

// Resolve what happens when a hero successfully enters an unguarded hex
// (no battle needed): capture mines/dwellings, collect dwelling garrison,
// pick up treasure (one-time, removes the object).
function resolveOccupancy(state, owner, hex) {
  const hero = state.heroes[owner];
  const objKey = key(hex);
  const occupant = state.hexes.get(objKey);
  if (!occupant) return;

  if (occupant.type === 'mine') {
    occupant.ownerId = owner;
  } else if (occupant.type === 'dwelling') {
    occupant.ownerId = owner;
    if (occupant.garrison > 0) {
      mergeIntoArmy(hero.army, occupant.creatureTypeId, occupant.garrison);
      occupant.garrison = 0;
    }
  } else if (occupant.type === 'treasure') {
    hero.resources[occupant.resource] = (hero.resources[occupant.resource] || 0) + occupant.amount;
    state.hexes.delete(objKey);
  }
  // 'keep' hexes need no occupancy resolution.
}

function guardArmy(occupant) {
  if (!occupant || !occupant.guard || occupant.guard.count <= 0) return null;
  return [{ ...occupant.guard }];
}

// Attempt to move `owner`'s hero toward `targetHex`. Returns true if the
// hero acted (moved, or a battle started), false if the move was
// rejected outright (out of range, wrong phase, etc.).
export function moveHero(state, owner, targetHex) {
  if (state.phase !== 'playing') return false;
  const hero = state.heroes[owner];
  if (hero.movementLeft <= 0) return false;
  if (!inRect(targetHex, state.mapWidth, state.mapHeight)) return false;

  const path = findPath(hero.position, targetHex, isPassableForMove(state, owner, targetHex), hero.movementLeft);
  if (!path || path.cost <= 0) return false;

  hero.movementLeft -= path.cost;

  const opponent = state.heroes[otherOwner(owner)];
  if (equals(opponent.position, targetHex)) {
    state.phase = 'battle';
    state.pendingBattle = { attackerOwner: owner, defenderKind: 'hero', defenderOwner: otherOwner(owner), hex: targetHex };
    return true;
  }

  const occupant = getObject(state, targetHex);
  const guard = guardArmy(occupant);
  if (guard) {
    state.phase = 'battle';
    state.pendingBattle = { attackerOwner: owner, defenderKind: 'guard', defenderOwner: null, hex: targetHex };
    return true;
  }
  if (occupant && occupant.type === 'monster') {
    // A 'monster' object with no remaining guard was already cleared;
    // treat as empty ground (should not normally happen since cleared
    // monster hexes are deleted in resolveBattleVictory, kept defensive).
    state.hexes.delete(key(targetHex));
  }

  hero.position = targetHex;
  resolveOccupancy(state, owner, targetHex);
  return true;
}

// How far `owner`'s hero can get *this day* toward a longer-term strategic
// target (which may be well beyond today's remaining movement) — used by
// main.js to drive the AI across multiple days (spec.md US-3: "spends all
// reachable movement points pursuing that target across however many of
// its own turns it takes"). Returns the farthest hex along the real path
// reachable within the hero's remaining movement, or null if unreachable
// at all or already there.
export function planMoveTowards(state, owner, targetHex) {
  const hero = state.heroes[owner];
  if (hero.movementLeft <= 0) return null;
  const generousMax = state.mapWidth * state.mapHeight;
  const path = findPath(hero.position, targetHex, isPassableForMove(state, owner, targetHex), generousMax);
  if (!path || path.path.length <= 1) return null;
  const stepIndex = Math.min(path.path.length - 1, hero.movementLeft);
  return path.path[stepIndex];
}

// Everything main.js needs from adventure.js to hand off to battle.js.
export function getPendingBattleArmies(state) {
  const pending = state.pendingBattle;
  if (!pending) return null;
  const attacker = state.heroes[pending.attackerOwner];
  const attackerArmy = attacker.army.map((s) => ({ ...s }));
  const attackerBonus = { attack: attacker.attack, defense: attacker.defense };

  let defenderArmy;
  let defenderBonus = { attack: 0, defense: 0 };
  if (pending.defenderKind === 'hero') {
    const defender = state.heroes[pending.defenderOwner];
    defenderArmy = defender.army.map((s) => ({ ...s }));
    defenderBonus = { attack: defender.attack, defense: defender.defense };
  } else {
    const occupant = getObject(state, pending.hex);
    defenderArmy = guardArmy(occupant) || [];
  }
  return { attackerArmy, attackerBonus, defenderArmy, defenderBonus };
}

// Apply a finished battle's outcome. `winnerSide` is 'attacker' or
// 'defender' (battle.js's vocabulary); `survivingStacks` is that side's
// stacks with post-battle counts.
export function resolveBattleOutcome(state, winnerSide, survivingStacks) {
  const pending = state.pendingBattle;
  if (!pending) return;
  const attackerOwner = pending.attackerOwner;

  if (pending.defenderKind === 'hero') {
    const defenderOwner = pending.defenderOwner;
    const winnerOwner = winnerSide === 'attacker' ? attackerOwner : defenderOwner;
    state.heroes[winnerOwner].army = survivingStacks.map((s) => ({ ...s }));
    state.phase = 'gameover';
    state.winner = winnerOwner;
    state.winReason = 'combat';
    state.pendingBattle = null;
    return;
  }

  // Neutral guard/monster fight.
  const hero = state.heroes[attackerOwner];
  const occupant = getObject(state, pending.hex);

  if (winnerSide === 'attacker') {
    hero.army = survivingStacks.map((s) => ({ ...s }));
    const defeatedValue = armyValue(occupant ? [occupant.guard] : []);
    hero.xp += Math.round(defeatedValue * XP_PER_ARMY_VALUE);
    applyLevelUps(hero);

    if (occupant) {
      if (occupant.type === 'monster') {
        state.hexes.delete(key(pending.hex));
      } else {
        occupant.guard = null;
      }
    }
    hero.position = pending.hex;
    if (occupant && occupant.type !== 'monster') resolveOccupancy(state, attackerOwner, pending.hex);
  } else {
    // Hero's whole army was wiped by the neutral guard — respawn at home
    // (spec.md US-6), guard survives with updated (possibly reduced) count.
    if (occupant) occupant.guard = survivingStacks[0] ? { ...survivingStacks[0] } : null;
    hero.position = homeKeep(attackerOwner);
    hero.army = getHeroType(hero.heroTypeId).startingArmy.map((s) => ({ ...s }));
    hero.movementLeft = 0;
  }

  state.phase = 'playing';
  state.pendingBattle = null;
}

function applyLevelUps(hero) {
  while (hero.xp >= hero.level * XP_PER_LEVEL) {
    hero.level += 1;
    if (hero.level % 2 === 1) hero.attack += 1;
    else hero.defense += 1;
  }
}

export function kingdomScore(state, owner) {
  let score = 0;
  for (const occupant of state.hexes.values()) {
    if (occupant.ownerId !== owner) continue;
    if (occupant.type === 'mine') score += 10;
    else if (occupant.type === 'dwelling') score += 15;
  }
  const hero = state.heroes[owner];
  for (const stack of hero.army) {
    score += stack.count * getCreature(stack.creatureTypeId).tier;
  }
  return score;
}

// Advance to the next day: refill movement, pay out mine/dwelling income,
// check the Day-limit/Kingdom-Score fallback win condition (spec.md US-6,
// plan.md Decision #4). Only valid outside of an active battle.
export function endDay(state) {
  if (state.phase !== 'playing') return false;

  for (const occupant of state.hexes.values()) {
    if (!occupant.ownerId) continue;
    const hero = state.heroes[occupant.ownerId];
    if (occupant.type === 'mine') {
      hero.resources[occupant.resource] += MINE_YIELD[occupant.resource];
    } else if (occupant.type === 'dwelling') {
      const creature = getCreature(occupant.creatureTypeId);
      const max = creature.growthPerDay * DWELLING_MAX_GARRISON_MULT;
      occupant.garrison = Math.min(max, occupant.garrison + creature.growthPerDay);
    }
  }

  state.day += 1;
  for (const owner of ['player', 'ai']) {
    state.heroes[owner].movementLeft = state.heroes[owner].movementMax;
  }

  if (state.day > state.dayLimit) {
    const playerScore = kingdomScore(state, 'player');
    const aiScore = kingdomScore(state, 'ai');
    state.phase = 'gameover';
    state.winReason = 'score';
    if (playerScore === aiScore) state.winner = null;
    else state.winner = playerScore > aiScore ? 'player' : 'ai';
  }

  return true;
}
