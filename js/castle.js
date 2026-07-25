// PURE Castle rules — build dwellings, recruit creatures, daily pool
// accrual, unlock state. No DOM. See specs/002-castle-creatures/spec.md
// and plan.md Decisions #1-#3.
//
// A creature tier is "unlocked" for a hero via capturing its map dwelling
// (adventure.js's resolveOccupancy calls unlock() directly, zero cost) or
// via buildDwelling() here (paid). Either way it's the same boolean flag
// — no bonus for owning both (plan.md Decision #2). Once unlocked, a
// tier's growthPerDay accrues into the hero's recruit pool every endDay;
// recruiting spends resources to move pool creatures into the army.

import { getCreature } from './creatures.js';
import { hasArmyRoom, mergeIntoArmy } from './army.js';
import { SPELLS } from './spells.js';

const POOL_CAP_MULT = 10; // same ceiling v1 used for per-hex dwelling garrison

// Hand-tabulated, explicitly tunable (plan.md Decision #3) — same status
// as v1's MINE_YIELD table. RECRUIT_COST is per unit; BUILD_COST is a
// one-time sink to unlock a tier without ever capturing its map dwelling.
export const RECRUIT_COST = {
  peasant: { gold: 30 },
  pikeman: { gold: 60 },
  archer: { gold: 120 },
  wolf: { gold: 200 },
  orc: { gold: 300, ore: 1 },
  griffin: { gold: 450, crystal: 1 },
  ogre: { gold: 650, mercury: 1 },
  skeleton: { gold: 500 },
  troll: { gold: 900, sulfur: 1 },
  dragon: { gold: 3000, gems: 2, sulfur: 2, mercury: 2 },
};

export const BUILD_COST = {
  peasant: { wood: 200 },
  pikeman: { wood: 400, ore: 200 },
  archer: { wood: 800, ore: 400 },
  wolf: { ore: 1200 },
  orc: { ore: 1500, crystal: 4 },
  griffin: { gold: 2000, crystal: 8 },
  ogre: { gold: 2500, mercury: 8 },
  skeleton: { gold: 1800, sulfur: 6 },
  troll: { gold: 3500, sulfur: 10 },
  dragon: { gold: 8000, gems: 15 },
};

export function initCastle() {
  return { unlocked: new Set(), pool: {} };
}

export function isUnlocked(hero, creatureTypeId) {
  return hero.castle.unlocked.has(creatureTypeId);
}

// Idempotent — safe to call for an already-unlocked tier (capturing a
// second dwelling of a tier you built, or vice versa, is a no-op beyond
// this flag; see spec.md US-4).
export function unlock(hero, creatureTypeId) {
  hero.castle.unlocked.add(creatureTypeId);
  if (!(creatureTypeId in hero.castle.pool)) hero.castle.pool[creatureTypeId] = 0;
}

// Grows every unlocked tier's pool by its growthPerDay, capped at
// growthPerDay * POOL_CAP_MULT. Called once per hero per day from
// adventure.js's endDay.
export function accrueGrowth(hero) {
  for (const creatureTypeId of hero.castle.unlocked) {
    const creature = getCreature(creatureTypeId);
    const max = creature.growthPerDay * POOL_CAP_MULT;
    const current = hero.castle.pool[creatureTypeId] || 0;
    hero.castle.pool[creatureTypeId] = Math.min(max, current + creature.growthPerDay);
  }
}

function canAfford(resources, cost, count) {
  return Object.entries(cost).every(([r, amt]) => (resources[r] || 0) >= amt * count);
}

function payCost(resources, cost, count) {
  for (const [r, amt] of Object.entries(cost)) resources[r] -= amt * count;
}

export function canAffordBuild(hero, creatureTypeId) {
  if (isUnlocked(hero, creatureTypeId)) return false;
  return canAfford(hero.resources, BUILD_COST[creatureTypeId], 1);
}

// All-or-nothing: deducts the full BUILD_COST and unlocks the tier, or
// changes nothing and returns false (spec.md US-2).
export function buildDwelling(state, owner, creatureTypeId) {
  const hero = state.heroes[owner];
  if (!canAffordBuild(hero, creatureTypeId)) return false;
  payCost(hero.resources, BUILD_COST[creatureTypeId], 1);
  unlock(hero, creatureTypeId);
  return true;
}

// The largest `count` for which canAffordRecruit(hero, creatureTypeId,
// count) would be true — used by the UI to clamp a quantity control's
// default/max (spec.md US-3).
export function maxRecruitable(hero, creatureTypeId) {
  if (!isUnlocked(hero, creatureTypeId)) return 0;
  if (!hasArmyRoom(hero.army, creatureTypeId)) return 0;
  const pool = hero.castle.pool[creatureTypeId] || 0;
  if (pool <= 0) return 0;
  let affordable = pool;
  for (const [r, amt] of Object.entries(RECRUIT_COST[creatureTypeId])) {
    affordable = Math.min(affordable, Math.floor((hero.resources[r] || 0) / amt));
  }
  return Math.max(0, affordable);
}

export function canAffordRecruit(hero, creatureTypeId, count) {
  if (count <= 0) return false;
  return count <= maxRecruitable(hero, creatureTypeId);
}

// All-or-nothing: deducts count * RECRUIT_COST, moves `count` from the
// pool into the army, or changes nothing and returns false (spec.md
// US-3 — no partial recruit).
export function recruitCreatures(state, owner, creatureTypeId, count) {
  const hero = state.heroes[owner];
  if (!canAffordRecruit(hero, creatureTypeId, count)) return false;
  payCost(hero.resources, RECRUIT_COST[creatureTypeId], count);
  hero.castle.pool[creatureTypeId] -= count;
  mergeIntoArmy(hero.army, creatureTypeId, count);
  return true;
}

// ---------------------------------------------------------------------
// Spells (specs/003-siege-and-spells) — learned permanently at the
// Castle for a one-time resource cost, exact mirror of buildDwelling.
// Casting itself (spending mana) happens in battle.js, not here.
// ---------------------------------------------------------------------

export function knowsSpell(hero, spellId) {
  return hero.spellbook.has(spellId);
}

export function canAffordLearnSpell(hero, spellId) {
  if (knowsSpell(hero, spellId)) return false;
  const spell = SPELLS.find((s) => s.id === spellId);
  return canAfford(hero.resources, spell.learnCost, 1);
}

// All-or-nothing: deducts the full learnCost and adds the spell to the
// hero's spellbook, or changes nothing and returns false (spec.md US-1).
export function learnSpell(state, owner, spellId) {
  const hero = state.heroes[owner];
  if (!canAffordLearnSpell(hero, spellId)) return false;
  const spell = SPELLS.find((s) => s.id === spellId);
  payCost(hero.resources, spell.learnCost, 1);
  hero.spellbook.add(spellId);
  return true;
}

