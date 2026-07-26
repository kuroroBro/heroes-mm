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
import { getFaction } from './factions.js';
import { hasArmyRoom, mergeIntoArmy } from './army.js';
import { SPELLS } from './spells.js';

const POOL_CAP_MULT = 10; // same ceiling v1 used for per-hex dwelling garrison

// Hand-tabulated, explicitly tunable (specs/005-castle-factions plan.md
// Decision #6) — same status as v1's MINE_YIELD table. RECRUIT_COST is
// per unit; BUILD_COST is a one-time sink to unlock a tier without ever
// capturing its map dwelling. Every reused creature's cost (peasant
// through dragon) is unchanged from before specs/005; the 18 entries
// added there and the 7 Sunborn entries added by specs/006-sunborn-
// faction are priced against their creaturePower()-equivalent neighbor
// in creatures.js's tables, following the same wood/ore-early,
// gold+scarce-resource-later pattern the original 10 already established.
export const RECRUIT_COST = {
  // Human
  peasant: { gold: 30 },
  pikeman: { gold: 60 },
  archer: { gold: 120 },
  swordsman: { gold: 300 },
  griffin: { gold: 450, crystal: 1 },
  cavalier: { gold: 1470, crystal: 1 },
  dragon: { gold: 3000, gems: 2, sulfur: 2, mercury: 2 },
  // Orc
  goblin: { gold: 40 },
  wolf: { gold: 200 },
  orc: { gold: 300, ore: 1 },
  'orc-chieftain': { gold: 500, ore: 1 },
  ogre: { gold: 650, mercury: 1 },
  troll: { gold: 900, sulfur: 1 },
  behemoth: { gold: 2600, sulfur: 2 },
  // Undead
  skeleton: { gold: 500 },
  zombie: { gold: 550 },
  ghost: { gold: 750 },
  wraith: { gold: 1000, sulfur: 1 },
  vampire: { gold: 1400, sulfur: 1 },
  lich: { gold: 1900, mercury: 1, sulfur: 1 },
  'bone-dragon': { gold: 3400, gems: 2, sulfur: 3 },
  // Enkantos
  duwende: { gold: 50 },
  santilmo: { gold: 220 },
  manananggal: { gold: 350 },
  tikbalang: { gold: 550, crystal: 1 },
  aswang: { gold: 800, crystal: 1 },
  kapre: { gold: 1600, mercury: 1 },
  bakunawa: { gold: 2900, gems: 2, crystal: 2 },
  // Sunborn (specs/006-sunborn-faction) — priced a step above Enkantos's
  // equivalent tier throughout (deliberate: the newest faction shouldn't
  // undercut existing ones), leaning on sulfur/gems as its characteristic
  // scarce resource (brimstone/light, fitting a fire order) rather than
  // crystal/mercury.
  spark: { gold: 55 },
  salamander: { gold: 230 },
  'flame-dancer': { gold: 370 },
  'ash-drake': { gold: 580, sulfur: 1 },
  'sun-priest': { gold: 850, sulfur: 1 },
  'cinder-wyvern': { gold: 1700, sulfur: 2 },
  phoenix: { gold: 3100, gems: 2, sulfur: 2 },
};

// wood/ore figures sized against MINE_YIELD (now 20/day each) so early
// tiers are affordable in roughly 5-20 days from a single captured mine
// of that type, leaving real time left in the 30-day game to actually use
// what got built; later tiers lean on gold (abundant via KEEP_GOLD_YIELD
// and gold mines) plus a small amount of a scarce resource, matching the
// original 10's own convention.
export const BUILD_COST = {
  // Human
  peasant: { wood: 50 },
  pikeman: { wood: 80, ore: 60 },
  archer: { wood: 150, ore: 100 },
  swordsman: { wood: 250, ore: 150 },
  griffin: { gold: 2000, crystal: 8 },
  cavalier: { gold: 4500, crystal: 10 },
  dragon: { gold: 8000, gems: 15 },
  // Orc
  goblin: { wood: 70 },
  wolf: { ore: 150 },
  orc: { ore: 200, crystal: 4 },
  'orc-chieftain': { ore: 350, crystal: 6 },
  ogre: { gold: 2500, mercury: 8 },
  troll: { gold: 3500, sulfur: 10 },
  behemoth: { gold: 7000, sulfur: 14 },
  // Undead
  skeleton: { gold: 1800, sulfur: 6 },
  zombie: { gold: 1900, sulfur: 4 },
  ghost: { gold: 2100, sulfur: 5 },
  wraith: { gold: 2600, sulfur: 6 },
  vampire: { gold: 3200, sulfur: 8 },
  lich: { gold: 4200, mercury: 6, sulfur: 6 },
  'bone-dragon': { gold: 9000, gems: 16, sulfur: 10 },
  // Enkantos
  duwende: { wood: 80 },
  santilmo: { wood: 180, ore: 100 },
  manananggal: { wood: 280, ore: 180 },
  tikbalang: { gold: 2200, crystal: 6 },
  aswang: { gold: 2800, crystal: 9 },
  kapre: { gold: 4000, mercury: 9 },
  bakunawa: { gold: 7800, gems: 14 },
  // Sunborn
  spark: { wood: 85 },
  salamander: { wood: 190, ore: 110 },
  'flame-dancer': { wood: 300, ore: 190 },
  'ash-drake': { gold: 2300, sulfur: 6 },
  'sun-priest': { gold: 2900, sulfur: 9 },
  'cinder-wyvern': { gold: 4200, gems: 9 },
  phoenix: { gold: 8100, gems: 16 },
};

// The hero's own faction's 7 creatureTypeIds, in tier order (specs/005-
// castle-factions spec.md FR-3) — the Castle screen's main list, and what
// chooseAiCastleActions (ai.js) scopes its build/recruit loop to, so an
// AI hero never tries to build another faction's dwellings.
export function castleRosterFor(hero) {
  return getFaction(hero.heroTypeId).creatures;
}

export function initCastle() {
  return { unlocked: new Set(), pool: {}, built: new Set() };
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

// A hero loses the ability to recruit a creature type once the map
// dwelling it came from is captured by someone else — unless that hero
// also separately paid to `buildDwelling` it, which is a permanent,
// resource-bought unlock with no map hex behind it to lose. Called by
// adventure.js's resolveOccupancy for the *previous* owner whenever a
// dwelling's ownerId actually changes. Never touches the hero's `army`
// (already-recruited creatures stay exactly where they are — see
// tests/adventure.test.mjs's "a dwelling changing hands..." coverage);
// this only revokes the *future* unlock/pool for that creature type.
export function revokeCaptureUnlock(hero, creatureTypeId) {
  if (hero.castle.built.has(creatureTypeId)) return; // built independently — keep it
  hero.castle.unlocked.delete(creatureTypeId);
  delete hero.castle.pool[creatureTypeId];
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
  hero.castle.built.add(creatureTypeId);
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

