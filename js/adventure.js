// PURE adventure-map rules engine (no DOM). See spec.md US-2/US-3/US-6 and
// plan.md's Decisions #1/#3/#4. Battle resolution itself lives in
// battle.js; this module only tracks *when* a battle starts and applies
// its outcome back onto the map/hero state.

import { key, equals, findPath, inRect } from './hexgrid.js';
import { getHeroType } from './heroTypes.js';
import { getCreature } from './creatures.js';
import { RESOURCES, emptyResourcePool, MINE_YIELD } from './resources.js';
import { MAP_WIDTH, MAP_HEIGHT, MAP_OBJECTS, KEEP_PLAYER, KEEP_AI } from './mapObjects.js';
import { MAX_ARMY_SLOTS, armyValue } from './army.js';
import { initCastle, unlock, accrueGrowth } from './castle.js';

export { MAX_ARMY_SLOTS };
export const MOVEMENT_PER_DAY = 8;
export const DAY_LIMIT = 30;
export const MANA_MAX = 50; // uniform across hero types, same precedent as MOVEMENT_PER_DAY
export const HOME_TURF_DEFENSE_BONUS = 2; // specs/003-siege-and-spells US-6
export const SIEGE_LOOT_FRACTION = 0.4; // specs/003-siege-and-spells US-5
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
    castle: initCastle(),
    mana: 0,
    manaMax: MANA_MAX,
    spellbook: new Set(),
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

// Resolve what happens when a hero successfully enters an unguarded hex
// (no battle needed): capture mines/dwellings (capturing a dwelling
// unlocks its creature type in the hero's Castle — see castle.js and
// specs/002-castle-creatures/spec.md US-4 — rather than an instant army
// merge), pick up treasure (one-time, removes the object).
function resolveOccupancy(state, owner, hex) {
  const hero = state.heroes[owner];
  const objKey = key(hex);
  const occupant = state.hexes.get(objKey);
  if (!occupant) return;

  if (occupant.type === 'mine') {
    occupant.ownerId = owner;
  } else if (occupant.type === 'dwelling') {
    occupant.ownerId = owner;
    unlock(hero, occupant.creatureTypeId);
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
  // The enemy's Keep, with their hero away (had the hero been standing
  // there, the opponent-position check above already fired). An army
  // lives with its hero, not a separate garrison, so an away hero's Keep
  // has nothing defending it — same as an unguarded mine/dwelling,
  // this resolves immediately (loot, no battle) rather than drafting any
  // kind of stand-in defense from the Castle's recruit pool.
  if (occupant && occupant.type === 'keep' && occupant.ownerId !== owner) {
    const defender = state.heroes[occupant.ownerId];
    for (const r of RESOURCES) {
      const looted = Math.floor((defender.resources[r] || 0) * SIEGE_LOOT_FRACTION);
      defender.resources[r] -= looted;
      hero.resources[r] += looted;
    }
    hero.position = targetHex;
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

// True if the current pending battle is a siege — a hero-vs-hero fight
// happening at the defender's own Keep (spec.md US-4: "fought as a siege
// ... rather than a plain field battle", same fight that gets the
// home-turf bonus in getPendingBattleArmies below). Used by main.js to
// decide whether to show the siege battlefield backdrop. (An away hero's
// undefended Keep never reaches battle.js at all — see moveHero.)
export function isSiegeBattle(state) {
  const pending = state.pendingBattle;
  if (!pending) return false;
  return pending.defenderKind === 'hero' && equals(pending.hex, homeKeep(pending.defenderOwner));
}

// Everything main.js needs from adventure.js to hand off to battle.js.
// The attacker is always a hero (spec.md US-3), so attackerBonus always
// carries mana/spellsKnown; the defender only does for defenderKind ===
// 'hero' (a neutral guard has no hero, so no spellcasting on that side —
// battle.js's heroSideFrom treats an absent `mana` field as "no caster").
export function getPendingBattleArmies(state) {
  const pending = state.pendingBattle;
  if (!pending) return null;
  const attacker = state.heroes[pending.attackerOwner];
  const attackerArmy = attacker.army.map((s) => ({ ...s }));
  const attackerBonus = {
    attack: attacker.attack, defense: attacker.defense,
    mana: attacker.mana, spellsKnown: [...attacker.spellbook],
  };

  let defenderArmy;
  let defenderBonus = { attack: 0, defense: 0 };
  if (pending.defenderKind === 'hero') {
    const defender = state.heroes[pending.defenderOwner];
    defenderArmy = defender.army.map((s) => ({ ...s }));
    defenderBonus = {
      attack: defender.attack, defense: defender.defense,
      mana: defender.mana, spellsKnown: [...defender.spellbook],
    };
    // Home-turf defense bonus when this hero-vs-hero fight is happening
    // at the defender's own Keep (specs/003-siege-and-spells US-6).
    if (equals(pending.hex, homeKeep(pending.defenderOwner))) {
      defenderBonus.defense += HOME_TURF_DEFENSE_BONUS;
    }
  } else {
    const occupant = getObject(state, pending.hex);
    defenderArmy = guardArmy(occupant) || [];
  }
  return { attackerArmy, attackerBonus, defenderArmy, defenderBonus };
}

// Apply a finished battle's outcome. `winnerSide` is 'attacker' or
// 'defender' (battle.js's vocabulary); `survivingStacks` is that side's
// stacks with post-battle counts. `remainingMana` (specs/003-siege-and-
// spells) is `{ attacker?, defender? }` — the battle-final mana for
// whichever sides had a hero (battle.js's `state.heroSides`), synced back
// onto the adventure-level hero before any respawn logic below might
// override it with a full restore.
export function resolveBattleOutcome(state, winnerSide, survivingStacks, remainingMana = {}) {
  const pending = state.pendingBattle;
  if (!pending) return;
  const attackerOwner = pending.attackerOwner;
  const attacker = state.heroes[attackerOwner];
  if (remainingMana.attacker != null) attacker.mana = remainingMana.attacker;

  if (pending.defenderKind === 'hero') {
    const defenderOwner = pending.defenderOwner;
    const defender = state.heroes[defenderOwner];
    if (remainingMana.defender != null) defender.mana = remainingMana.defender;
    const winnerOwner = winnerSide === 'attacker' ? attackerOwner : defenderOwner;
    state.heroes[winnerOwner].army = survivingStacks.map((s) => ({ ...s }));
    state.phase = 'gameover';
    state.winner = winnerOwner;
    state.winReason = 'combat';
    state.pendingBattle = null;
    return;
  }

  // Neutral guard/monster fight.
  const occupant = getObject(state, pending.hex);

  if (winnerSide === 'attacker') {
    attacker.army = survivingStacks.map((s) => ({ ...s }));
    const defeatedValue = armyValue(occupant ? [occupant.guard] : []);
    attacker.xp += Math.round(defeatedValue * XP_PER_ARMY_VALUE);
    applyLevelUps(attacker);

    if (occupant) {
      if (occupant.type === 'monster') {
        state.hexes.delete(key(pending.hex));
      } else {
        occupant.guard = null;
      }
    }
    attacker.position = pending.hex;
    if (occupant && occupant.type !== 'monster') resolveOccupancy(state, attackerOwner, pending.hex);
  } else {
    // Hero's whole army was wiped by the neutral guard — respawn at home
    // (spec.md US-6), guard survives with updated (possibly reduced) count.
    if (occupant) occupant.guard = survivingStacks[0] ? { ...survivingStacks[0] } : null;
    attacker.position = homeKeep(attackerOwner);
    attacker.army = getHeroType(attacker.heroTypeId).startingArmy.map((s) => ({ ...s }));
    attacker.movementLeft = 0;
    attacker.mana = attacker.manaMax;
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

// Dwelling scoring is sourced from the hero's Castle (unique unlocked
// creature types), not owned map hexes, since a tier can now be unlocked
// by building it — see specs/002-castle-creatures/plan.md Decision #5.
export function kingdomScore(state, owner) {
  let score = 0;
  for (const occupant of state.hexes.values()) {
    if (occupant.ownerId === owner && occupant.type === 'mine') score += 10;
  }
  const hero = state.heroes[owner];
  score += hero.castle.unlocked.size * 15;
  for (const stack of hero.army) {
    score += stack.count * getCreature(stack.creatureTypeId).tier;
  }
  return score;
}

// Advance to the next day: refill movement, pay out mine income and
// Castle pool growth, check the Day-limit/Kingdom-Score fallback win
// condition (spec.md US-6, plan.md Decision #4). Only valid outside of an
// active battle.
export function endDay(state) {
  if (state.phase !== 'playing') return false;

  for (const occupant of state.hexes.values()) {
    if (!occupant.ownerId || occupant.type !== 'mine') continue;
    state.heroes[occupant.ownerId].resources[occupant.resource] += MINE_YIELD[occupant.resource];
  }

  state.day += 1;
  for (const owner of ['player', 'ai']) {
    const hero = state.heroes[owner];
    hero.movementLeft = hero.movementMax;
    hero.mana = hero.manaMax;
    accrueGrowth(hero);
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
