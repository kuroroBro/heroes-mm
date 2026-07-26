// Shared spriteId -> image path lookup (plan.md "Custom art", spec.md
// FR-3). Swapping in generated art later means changing paths here only.
//
// specs/005-castle-factions note: all 28 creatures, all 4 hero tokens,
// and all 28 dwelling icons now have real art — the 11 new Human/Orc/
// Undead creatures, the new Enkantos hero token, and the 18 new dwelling
// icons were all generated via image-gen once the local Codex CLI was
// upgraded (an earlier pass hit a hard version-mismatch error against
// every one of these); Enkantos's 7 creatures (and 6 of its 7 attack
// effects) are real art copied directly from pinoy-board (plan.md
// Decision #3).

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
  'dwelling-swordsman': 'images/objects/dwelling-swordsman.png',
  'dwelling-griffin': 'images/objects/dwelling-griffin.png',
  'dwelling-cavalier': 'images/objects/dwelling-cavalier.png',
  'dwelling-dragon': 'images/objects/dwelling-dragon.png',
  // Orc
  'dwelling-goblin': 'images/objects/dwelling-goblin.png',
  'dwelling-wolf': 'images/objects/dwelling-wolf.png',
  'dwelling-orc': 'images/objects/dwelling-orc.png',
  'dwelling-orc-chieftain': 'images/objects/dwelling-orc-chieftain.png',
  'dwelling-ogre': 'images/objects/dwelling-ogre.png',
  'dwelling-troll': 'images/objects/dwelling-troll.png',
  'dwelling-behemoth': 'images/objects/dwelling-behemoth.png',
  // Undead
  'dwelling-skeleton': 'images/objects/dwelling-skeleton.png',
  'dwelling-zombie': 'images/objects/dwelling-zombie.png',
  'dwelling-ghost': 'images/objects/dwelling-ghost.png',
  'dwelling-wraith': 'images/objects/dwelling-wraith.png',
  'dwelling-vampire': 'images/objects/dwelling-vampire.png',
  'dwelling-lich': 'images/objects/dwelling-lich.png',
  'dwelling-bone-dragon': 'images/objects/dwelling-bone-dragon.png',
  // Enkantos
  'dwelling-duwende': 'images/objects/dwelling-duwende.png',
  'dwelling-santilmo': 'images/objects/dwelling-santilmo.png',
  'dwelling-manananggal': 'images/objects/dwelling-manananggal.png',
  'dwelling-tikbalang': 'images/objects/dwelling-tikbalang.png',
  'dwelling-aswang': 'images/objects/dwelling-aswang.png',
  'dwelling-kapre': 'images/objects/dwelling-kapre.png',
  'dwelling-bakunawa': 'images/objects/dwelling-bakunawa.png',
  // Sunborn (specs/006-sunborn-faction)
  'dwelling-spark': 'images/objects/dwelling-spark.png',
  'dwelling-salamander': 'images/objects/dwelling-salamander.png',
  'dwelling-flame-dancer': 'images/objects/dwelling-flame-dancer.png',
  'dwelling-ash-drake': 'images/objects/dwelling-ash-drake.png',
  'dwelling-sun-priest': 'images/objects/dwelling-sun-priest.png',
  'dwelling-cinder-wyvern': 'images/objects/dwelling-cinder-wyvern.png',
  'dwelling-phoenix': 'images/objects/dwelling-phoenix.png',
  // Yokai (specs/008-yokai-faction)
  'dwelling-kappa': 'images/objects/dwelling-kappa.png',
  'dwelling-tengu': 'images/objects/dwelling-tengu.png',
  'dwelling-oni': 'images/objects/dwelling-oni.png',
  'dwelling-onmyoji': 'images/objects/dwelling-onmyoji.png',
  'dwelling-orochi': 'images/objects/dwelling-orochi.png',
  'dwelling-kitsune': 'images/objects/dwelling-kitsune.png',
  'dwelling-amaterasu': 'images/objects/dwelling-amaterasu.png',
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
  // Sunborn (specs/006-sunborn-faction) — original content, not reused
  'creature-spark': 'images/creatures/spark.png',
  'creature-salamander': 'images/creatures/salamander.png',
  'creature-flame-dancer': 'images/creatures/flame-dancer.png',
  'creature-ash-drake': 'images/creatures/ash-drake.png',
  'creature-sun-priest': 'images/creatures/sun-priest.png',
  'creature-cinder-wyvern': 'images/creatures/cinder-wyvern.png',
  'creature-phoenix': 'images/creatures/phoenix.png',
  // Yokai (specs/008-yokai-faction) — original content, not reused
  'creature-kappa': 'images/creatures/kappa.png',
  'creature-tengu': 'images/creatures/tengu.png',
  'creature-oni': 'images/creatures/oni.png',
  'creature-onmyoji': 'images/creatures/onmyoji.png',
  'creature-orochi': 'images/creatures/orochi.png',
  'creature-kitsune': 'images/creatures/kitsune.png',
  'creature-amaterasu': 'images/creatures/amaterasu.png',
};

const HERO_SPRITES = {
  'hero-human': 'images/creatures/hero-human.png',
  'hero-orc': 'images/creatures/hero-orc.png',
  'hero-undead': 'images/creatures/hero-undead.png',
  'hero-enkantos': 'images/creatures/hero-enkantos.png',
  'hero-sunborn': 'images/creatures/hero-sunborn.png',
  'hero-yokai': 'images/creatures/hero-yokai.png',
};

// The battle screen's flying attack-effect icon (js/main.js's
// showAttackEffect), one per creature id, themed to how that creature
// actually fights. Every creature across all 4 factions now has a
// dedicated one: the original 10 and the 11 new Human/Orc/Undead/Santilmo
// icons are generated art in the same dark-painterly weapon/limb-on-black
// style; the other 6 Enkantos icons are reused directly from pinoy-board's
// own attack/enemy/ effect icons (same real-art-reuse pattern as the
// creature portraits — already 256x256 RGBA with true alpha, no
// restyling needed).
const ATTACK_SPRITES = {
  'attack-peasant': 'images/creatures/attacks/attack-peasant.png',
  'attack-pikeman': 'images/creatures/attacks/attack-pikeman.png',
  'attack-archer': 'images/creatures/attacks/attack-archer.png',
  'attack-swordsman': 'images/creatures/attacks/attack-swordsman.png',
  'attack-griffin': 'images/creatures/attacks/attack-griffin.png',
  'attack-cavalier': 'images/creatures/attacks/attack-cavalier.png',
  'attack-dragon': 'images/creatures/attacks/attack-dragon.png',
  // Orc
  'attack-goblin': 'images/creatures/attacks/attack-goblin.png',
  'attack-wolf': 'images/creatures/attacks/attack-wolf.png',
  'attack-orc': 'images/creatures/attacks/attack-orc.png',
  'attack-orc-chieftain': 'images/creatures/attacks/attack-orc-chieftain.png',
  'attack-ogre': 'images/creatures/attacks/attack-ogre.png',
  'attack-troll': 'images/creatures/attacks/attack-troll.png',
  'attack-behemoth': 'images/creatures/attacks/attack-behemoth.png',
  // Undead
  'attack-skeleton': 'images/creatures/attacks/attack-skeleton.png',
  'attack-zombie': 'images/creatures/attacks/attack-zombie.png',
  'attack-ghost': 'images/creatures/attacks/attack-ghost.png',
  'attack-wraith': 'images/creatures/attacks/attack-wraith.png',
  'attack-vampire': 'images/creatures/attacks/attack-vampire.png',
  'attack-lich': 'images/creatures/attacks/attack-lich.png',
  'attack-bone-dragon': 'images/creatures/attacks/attack-bone-dragon.png',
  // Enkantos (pinoy-board reuse, except santilmo which is generated)
  'attack-duwende': 'images/creatures/attacks/attack-duwende.png',
  'attack-santilmo': 'images/creatures/attacks/attack-santilmo.png',
  'attack-manananggal': 'images/creatures/attacks/attack-manananggal.png',
  'attack-tikbalang': 'images/creatures/attacks/attack-tikbalang.png',
  'attack-aswang': 'images/creatures/attacks/attack-aswang.png',
  'attack-kapre': 'images/creatures/attacks/attack-kapre.png',
  'attack-bakunawa': 'images/creatures/attacks/attack-bakunawa.png',
  // Sunborn (specs/006-sunborn-faction)
  'attack-spark': 'images/creatures/attacks/attack-spark.png',
  'attack-salamander': 'images/creatures/attacks/attack-salamander.png',
  'attack-flame-dancer': 'images/creatures/attacks/attack-flame-dancer.png',
  'attack-ash-drake': 'images/creatures/attacks/attack-ash-drake.png',
  'attack-sun-priest': 'images/creatures/attacks/attack-sun-priest.png',
  'attack-cinder-wyvern': 'images/creatures/attacks/attack-cinder-wyvern.png',
  'attack-phoenix': 'images/creatures/attacks/attack-phoenix.png',
  // Yokai (specs/008-yokai-faction)
  'attack-kappa': 'images/creatures/attacks/attack-kappa.png',
  'attack-tengu': 'images/creatures/attacks/attack-tengu.png',
  'attack-oni': 'images/creatures/attacks/attack-oni.png',
  'attack-onmyoji': 'images/creatures/attacks/attack-onmyoji.png',
  'attack-orochi': 'images/creatures/attacks/attack-orochi.png',
  'attack-kitsune': 'images/creatures/attacks/attack-kitsune.png',
  'attack-amaterasu': 'images/creatures/attacks/attack-amaterasu.png',
};

const ALL_SPRITES = { ...OBJECT_SPRITES, ...CREATURE_SPRITES, ...HERO_SPRITES, ...ATTACK_SPRITES };

const FALLBACK_SPRITE = 'images/objects/unknown.svg';

export function spritePath(spriteId) {
  return ALL_SPRITES[spriteId] || FALLBACK_SPRITE;
}
