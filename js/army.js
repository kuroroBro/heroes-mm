// PURE army-stack helpers shared by adventure.js (battle outcomes,
// dwelling captures in v1) and castle.js (recruiting) — extracted so
// castle.js doesn't need to import adventure.js (and vice versa).

import { getCreature, creaturePower } from './creatures.js';

export const MAX_ARMY_SLOTS = 7;

// True if `count` more of `creatureTypeId` can merge into `army` — either
// there's already a matching stack (which can always absorb more) or a
// free slot remains (which becomes a new stack). Room is binary, not a
// number: an existing stack has no size limit.
export function hasArmyRoom(army, creatureTypeId) {
  return army.some((s) => s.creatureTypeId === creatureTypeId) || army.length < MAX_ARMY_SLOTS;
}

// Merge `count` of `creatureTypeId` into `army` (mutates in place),
// preferring an existing matching stack, else the first free slot up to
// MAX_ARMY_SLOTS. Returns how many actually merged (0 if no matching
// stack and no free slot — callers that need to guarantee a full merge
// should check hasArmyRoom first).
export function mergeIntoArmy(army, creatureTypeId, count) {
  if (count <= 0) return 0;
  const existing = army.find((s) => s.creatureTypeId === creatureTypeId);
  if (existing) {
    existing.count += count;
    return count;
  }
  if (army.length < MAX_ARMY_SLOTS) {
    army.push({ creatureTypeId, count });
    return count;
  }
  return 0;
}

export function armyValue(army) {
  return army.reduce((total, s) => total + creaturePower(getCreature(s.creatureTypeId)) * s.count, 0);
}
