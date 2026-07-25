// Shared spriteId -> image path lookup (plan.md "Custom art", spec.md
// FR-3). Swapping in generated art later means changing paths here only.
//
// specs/005-castle-factions note: all 28 creatures and all 4 hero tokens
// now have real art — the 11 new Human/Orc/Undead creatures and the new
// Enkantos hero token were generated via image-gen once the local Codex
// CLI was upgraded (an earlier pass hit a hard version-mismatch error
// against every one of these); Enkantos's 7 creatures are real art
// copied directly from pinoy-board (plan.md Decision #3). The 18 new
// dwelling icons are still flat placeholder SVGs
// (scripts/gen-placeholder-sprites.mjs's style) — that wasn't part of
// this retry, only the creature/hero sprites that had actually failed.

const OBJECT_SPRITES = {
  'mine-gold': 'images/objects/mine-gold.svg',
  'mine-wood': 'images/objects/mine-wood.svg',
  'mine-ore': 'images/objects/mine-ore.svg',
  'mine-crystal': 'images/objects/mine-crystal.svg',
  'mine-mercury': 'images/objects/mine-mercury.svg',
  'mine-sulfur': 'images/objects/mine-sulfur.svg',
  'mine-gems': 'images/objects/mine-gems.svg',
  dwelling: 'images/objects/dwelling.svg',
  keep: 'images/objects/keep.svg',
  treasure: 'images/objects/treasure.svg',
  monster: 'images/objects/monster.svg',
  castle: 'images/objects/castle.png',
  'wall-segment': 'images/objects/wall-segment.png',
  catapult: 'images/objects/catapult.png',
  // Human
  'dwelling-peasant': 'images/objects/dwelling-peasant.png',
  'dwelling-pikeman': 'images/objects/dwelling-pikeman.png',
  'dwelling-archer': 'images/objects/dwelling-archer.png',
  'dwelling-swordsman': 'images/objects/dwelling-swordsman.svg',
  'dwelling-griffin': 'images/objects/dwelling-griffin.png',
  'dwelling-cavalier': 'images/objects/dwelling-cavalier.svg',
  'dwelling-dragon': 'images/objects/dwelling-dragon.png',
  // Orc
  'dwelling-goblin': 'images/objects/dwelling-goblin.svg',
  'dwelling-wolf': 'images/objects/dwelling-wolf.png',
  'dwelling-orc': 'images/objects/dwelling-orc.png',
  'dwelling-orc-chieftain': 'images/objects/dwelling-orc-chieftain.svg',
  'dwelling-ogre': 'images/objects/dwelling-ogre.png',
  'dwelling-troll': 'images/objects/dwelling-troll.png',
  'dwelling-behemoth': 'images/objects/dwelling-behemoth.svg',
  // Undead
  'dwelling-skeleton': 'images/objects/dwelling-skeleton.png',
  'dwelling-zombie': 'images/objects/dwelling-zombie.svg',
  'dwelling-ghost': 'images/objects/dwelling-ghost.svg',
  'dwelling-wraith': 'images/objects/dwelling-wraith.svg',
  'dwelling-vampire': 'images/objects/dwelling-vampire.svg',
  'dwelling-lich': 'images/objects/dwelling-lich.svg',
  'dwelling-bone-dragon': 'images/objects/dwelling-bone-dragon.svg',
  // Enkantos
  'dwelling-duwende': 'images/objects/dwelling-duwende.svg',
  'dwelling-santilmo': 'images/objects/dwelling-santilmo.svg',
  'dwelling-manananggal': 'images/objects/dwelling-manananggal.svg',
  'dwelling-tikbalang': 'images/objects/dwelling-tikbalang.svg',
  'dwelling-aswang': 'images/objects/dwelling-aswang.svg',
  'dwelling-kapre': 'images/objects/dwelling-kapre.svg',
  'dwelling-bakunawa': 'images/objects/dwelling-bakunawa.svg',
};

const CREATURE_SPRITES = {
  // Human
  'creature-peasant': 'images/creatures/peasant.png',
  'creature-pikeman': 'images/creatures/pikeman.png',
  'creature-archer': 'images/creatures/archer.png',
  'creature-swordsman': 'images/creatures/swordsman.png',
  'creature-griffin': 'images/creatures/griffin.png',
  'creature-cavalier': 'images/creatures/cavalier.png',
  'creature-dragon': 'images/creatures/dragon.png',
  // Orc
  'creature-goblin': 'images/creatures/goblin.png',
  'creature-wolf': 'images/creatures/wolf.png',
  'creature-orc': 'images/creatures/orc.png',
  'creature-orc-chieftain': 'images/creatures/orc-chieftain.png',
  'creature-ogre': 'images/creatures/ogre.png',
  'creature-troll': 'images/creatures/troll.png',
  'creature-behemoth': 'images/creatures/behemoth.png',
  // Undead
  'creature-skeleton': 'images/creatures/skeleton.png',
  'creature-zombie': 'images/creatures/zombie.png',
  'creature-ghost': 'images/creatures/ghost.png',
  'creature-wraith': 'images/creatures/wraith.png',
  'creature-vampire': 'images/creatures/vampire.png',
  'creature-lich': 'images/creatures/lich.png',
  'creature-bone-dragon': 'images/creatures/bone-dragon.png',
  // Enkantos — real art, copied directly from pinoy-board (plan.md Decision #3)
  'creature-duwende': 'images/creatures/duwende.png',
  'creature-santilmo': 'images/creatures/santilmo.png',
  'creature-manananggal': 'images/creatures/manananggal.png',
  'creature-tikbalang': 'images/creatures/tikbalang.png',
  'creature-aswang': 'images/creatures/aswang.png',
  'creature-kapre': 'images/creatures/kapre.png',
  'creature-bakunawa': 'images/creatures/bakunawa.png',
};

const HERO_SPRITES = {
  'hero-human': 'images/creatures/hero-human.svg',
  'hero-orc': 'images/creatures/hero-orc.svg',
  'hero-undead': 'images/creatures/hero-undead.svg',
  'hero-enkantos': 'images/creatures/hero-enkantos.png',
};

// The battle screen's flying attack-effect icon (js/main.js's
// showAttackEffect), one per creature id, themed to how that creature
// actually fights. The original 10 have a dedicated one; 6 of Enkantos's
// 7 do too, reused directly from pinoy-board's own attack/enemy/ effect
// icons (same real-art-reuse pattern as the creature portraits — these
// are already 256x256 RGBA with true alpha, no restyling needed).
// Santilmo has no matching pinoy-board attack icon and the other 11 new
// Human/Orc/Undead creatures have no dedicated one yet — all fall back
// to FALLBACK_SPRITE below rather than a dangling path.
const ATTACK_SPRITES = {
  'attack-peasant': 'images/creatures/attacks/attack-peasant.png',
  'attack-pikeman': 'images/creatures/attacks/attack-pikeman.png',
  'attack-archer': 'images/creatures/attacks/attack-archer.png',
  'attack-wolf': 'images/creatures/attacks/attack-wolf.png',
  'attack-orc': 'images/creatures/attacks/attack-orc.png',
  'attack-griffin': 'images/creatures/attacks/attack-griffin.png',
  'attack-ogre': 'images/creatures/attacks/attack-ogre.png',
  'attack-skeleton': 'images/creatures/attacks/attack-skeleton.png',
  'attack-troll': 'images/creatures/attacks/attack-troll.png',
  'attack-dragon': 'images/creatures/attacks/attack-dragon.png',
  // Enkantos (pinoy-board reuse)
  'attack-duwende': 'images/creatures/attacks/attack-duwende.png',
  'attack-manananggal': 'images/creatures/attacks/attack-manananggal.png',
  'attack-tikbalang': 'images/creatures/attacks/attack-tikbalang.png',
  'attack-aswang': 'images/creatures/attacks/attack-aswang.png',
  'attack-kapre': 'images/creatures/attacks/attack-kapre.png',
  'attack-bakunawa': 'images/creatures/attacks/attack-bakunawa.png',
};

const ALL_SPRITES = { ...OBJECT_SPRITES, ...CREATURE_SPRITES, ...HERO_SPRITES, ...ATTACK_SPRITES };

const FALLBACK_SPRITE = 'images/objects/unknown.svg';

export function spritePath(spriteId) {
  return ALL_SPRITES[spriteId] || FALLBACK_SPRITE;
}
