// Shared spriteId -> image path lookup (plan.md "Custom art", spec.md
// FR-3). Every current entry points at a hand-authored placeholder SVG;
// swapping in generated art later means changing paths here only.

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
  'dwelling-peasant': 'images/objects/dwelling-peasant.png',
  'dwelling-pikeman': 'images/objects/dwelling-pikeman.png',
  'dwelling-archer': 'images/objects/dwelling-archer.png',
  'dwelling-wolf': 'images/objects/dwelling-wolf.png',
  'dwelling-orc': 'images/objects/dwelling-orc.png',
  'dwelling-griffin': 'images/objects/dwelling-griffin.png',
  'dwelling-ogre': 'images/objects/dwelling-ogre.png',
  'dwelling-skeleton': 'images/objects/dwelling-skeleton.png',
  'dwelling-troll': 'images/objects/dwelling-troll.png',
  'dwelling-dragon': 'images/objects/dwelling-dragon.png',
};

const CREATURE_SPRITES = {
  'creature-peasant': 'images/creatures/peasant.png',
  'creature-pikeman': 'images/creatures/pikeman.png',
  'creature-archer': 'images/creatures/archer.png',
  'creature-wolf': 'images/creatures/wolf.png',
  'creature-orc': 'images/creatures/orc.png',
  'creature-griffin': 'images/creatures/griffin.png',
  'creature-ogre': 'images/creatures/ogre.png',
  'creature-skeleton': 'images/creatures/skeleton.png',
  'creature-troll': 'images/creatures/troll.png',
  'creature-dragon': 'images/creatures/dragon.png',
};

const HERO_SPRITES = {
  'hero-marshal': 'images/creatures/hero-marshal.svg',
  'hero-warlord': 'images/creatures/hero-warlord.svg',
  'hero-sentinel': 'images/creatures/hero-sentinel.svg',
};

const ALL_SPRITES = { ...OBJECT_SPRITES, ...CREATURE_SPRITES, ...HERO_SPRITES };

const FALLBACK_SPRITE = 'images/objects/unknown.svg';

export function spritePath(spriteId) {
  return ALL_SPRITES[spriteId] || FALLBACK_SPRITE;
}
