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
};

const CREATURE_SPRITES = {
  'creature-peasant': 'images/creatures/peasant.svg',
  'creature-pikeman': 'images/creatures/pikeman.svg',
  'creature-archer': 'images/creatures/archer.svg',
  'creature-wolf': 'images/creatures/wolf.svg',
  'creature-orc': 'images/creatures/orc.svg',
  'creature-griffin': 'images/creatures/griffin.svg',
  'creature-ogre': 'images/creatures/ogre.svg',
  'creature-skeleton': 'images/creatures/skeleton.svg',
  'creature-troll': 'images/creatures/troll.svg',
  'creature-dragon': 'images/creatures/dragon.svg',
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
