import { key, equals, axialToPixel, rectHexes, distance as hexDistance } from './hexgrid.js';
import { RESOURCES, MINE_YIELD, KEEP_GOLD_YIELD } from './resources.js';
import { getCreature } from './creatures.js';
import { FACTIONS, getFaction } from './factions.js';
import { spritePath } from './sprites.js';
import {
  createAdventure, moveHero, endDay, kingdomScore, kingdomScoreBreakdown, getPendingBattleArmies,
  resolveBattleOutcome, resolveFinalBattleOutcome, planMoveTowards, isSiegeBattle,
} from './adventure.js';
import {
  createBattle, getStack, moveStack, attackStack, waitStack, defendStack,
  reachableHexes, survivingStacks, castSpell, canCastSpell, attackWall, isObstacleHex,
  SIEGE_GATE_ROW,
} from './battle.js';
import {
  aiSelectTarget, aiChooseBattleMove, aiChooseBattleAttack, chooseAiCastleActions, chooseAiSpell,
  chooseAiCatapultTarget,
} from './ai.js';
import {
  isUnlocked, canAffordBuild, buildDwelling, maxRecruitable, recruitCreatures, BUILD_COST, RECRUIT_COST,
  knowsSpell, canAffordLearnSpell, learnSpell, castleRosterFor,
} from './castle.js';
import { SPELLS } from './spells.js';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from './storage.js';

const $ = (id) => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';

const SCREENS = ['screen-home', 'screen-setup', 'screen-adventure', 'screen-castle', 'screen-battle', 'screen-gameover'];
function showScreen(id) {
  for (const s of SCREENS) $(s).hidden = s !== id;
}

// ---------- module state ----------
let settings = loadSettings();
let selectedHeroTypeId = settings.heroTypeId;
let adventureState = null;
let battleState = null;
let battleContext = null; // { attackerOwner, defenderOwner } captured at battle start
let aiDayInProgress = false;
let pendingSpellCast = null; // spellId awaiting a battlefield target click, or null
let pendingCatapultTarget = false; // true while picking a wall hex to fire the catapult at
let isFinalBattle = false; // true while battleState is the Day-limit final-battle tie-breaker
// Hex-key -> pixel-center map from the battle map's most recent render,
// and its hex size — set at the end of renderBattleMap, read afterward by
// showAttackEffects/showSpellEffect (called just after a render, never
// during one) so they can place floating numbers/flight icons without
// recomputing the whole layout themselves.
let battleMapPositions = null;
let battleMapHexSize = 0;

// ==================================================================
// Hex rendering helpers (shared shape for adventure + battle grids)
// ==================================================================
function hexCorners(cx, cy, size) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i);
    pts.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

function layoutHexes(hexes, size) {
  const raw = hexes.map((h) => ({ hex: h, ...axialToPixel(h, size) }));
  const xs = raw.map((p) => p.x);
  const ys = raw.map((p) => p.y);
  const pad = size * 1.05;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const maxX = Math.max(...xs) + pad;
  const maxY = Math.max(...ys) + pad;
  const positions = new Map();
  for (const p of raw) positions.set(key(p.hex), { x: p.x - minX, y: p.y - minY });
  return { positions, width: maxX - minX, height: maxY - minY };
}

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// Hex ground textures (from this workspace's pinoy-board project's
// battleground hex skins). One <pattern> per texture, sized to exactly
// fill whatever bounding box it's applied to (patternUnits +
// patternContentUnits both objectBoundingBox, width/height 1) — the
// fractional sizing means the same pattern definition works for both the
// adventure map's and battlefield's hexes despite their different hex
// sizes. svg.innerHTML = '' clears these each render, so every render
// call re-adds them.
//
// IDs are namespaced with the target <svg>'s own element id (e.g.
// "adv-map"/"battle-map"). Both screens' SVGs stay in the DOM at once —
// screen switching only toggles `hidden`, it never removes markup — so
// two identically-id'd <pattern> elements would collide: url(#terrain-
// grass) resolves to the *first* matching id in the whole document,
// regardless of which SVG subtree references it, which silently broke
// the second-rendered grid's fill.
const TERRAIN_PATTERNS = { grass: 'images/terrain/grass-hex.png', stone: 'images/terrain/stone-hex.png' };
function addTerrainDefs(svg) {
  const defs = svgEl('defs', {});
  for (const [id, href] of Object.entries(TERRAIN_PATTERNS)) {
    const pattern = svgEl('pattern', {
      id: `terrain-${id}-${svg.id}`, patternUnits: 'objectBoundingBox', patternContentUnits: 'objectBoundingBox',
      width: 1, height: 1,
    });
    pattern.appendChild(svgEl('image', { href, x: 0, y: 0, width: 1, height: 1, preserveAspectRatio: 'xMidYMid slice' }));
    defs.appendChild(pattern);
  }
  svg.appendChild(defs);
  return (id) => `url(#terrain-${id}-${svg.id})`;
}

// Shared radial gradient behind the .battle-spotlight circle (a plain SVG
// <circle> can't itself have a soft-edged radial fill without one). Always
// namespaced/re-added alongside the terrain defs above since svg.innerHTML
// = '' clears it every render too.
function addSpotlightGradientDef(svg) {
  const defs = svgEl('defs', {});
  const gradient = svgEl('radialGradient', { id: 'battle-spotlight-gradient' });
  gradient.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#ffd23f', 'stop-opacity': 0.38 }));
  gradient.appendChild(svgEl('stop', { offset: '45%', 'stop-color': '#ffd23f', 'stop-opacity': 0.16 }));
  gradient.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#ffd23f', 'stop-opacity': 0 }));
  defs.appendChild(gradient);
  svg.appendChild(defs);
}

// ==================================================================
// HOME / SETUP
// ==================================================================
$('btn-how-to-play').addEventListener('click', () => $('dialog-how-to-play').showModal());
$('btn-close-how-to-play').addEventListener('click', () => $('dialog-how-to-play').close());

$('btn-new-game').addEventListener('click', () => {
  renderHeroTypeCards();
  $('setup-defeats-to-win').value = String(settings.defeatsToWin);
  showScreen('screen-setup');
});
$('btn-setup-back').addEventListener('click', () => showScreen('screen-home'));

function renderHeroTypeCards() {
  const container = $('hero-type-cards');
  container.innerHTML = '';
  for (const faction of FACTIONS) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'hero-type-card' + (faction.id === selectedHeroTypeId ? ' selected' : '');
    const armySummary = faction.startingArmy
      .map((s) => `${s.count} ${getCreature(s.creatureTypeId).name}`)
      .join(', ');
    // specs/005-castle-factions spec.md US-1: a compact tier-order roster
    // preview (name only, not full stats — same information density as
    // the rest of this card) so picking a faction also previews what its
    // Castle will eventually offer.
    const rosterSummary = faction.creatures.map((id) => getCreature(id).name).join(' → ');
    card.innerHTML = `
      <img src="${spritePath(faction.spriteId)}" alt="" width="48" height="48">
      <h3>${faction.name}</h3>
      <p class="hero-type-stats">ATK ${faction.attack} / DEF ${faction.defense}</p>
      <p class="hero-type-army">${armySummary}</p>
      <p class="hero-type-roster">${rosterSummary}</p>
    `;
    card.addEventListener('click', () => {
      selectedHeroTypeId = faction.id;
      renderHeroTypeCards();
    });
    container.appendChild(card);
  }
}

$('btn-start-game').addEventListener('click', () => {
  const rawDefeats = Math.round(Number($('setup-defeats-to-win').value));
  const defeatsToWin = Math.min(10, Math.max(1, Number.isFinite(rawDefeats) ? rawDefeats : DEFAULT_SETTINGS.defeatsToWin));
  settings = { ...settings, heroTypeId: selectedHeroTypeId, defeatsToWin };
  saveSettings(settings);
  const otherTypes = FACTIONS.filter((f) => f.id !== selectedHeroTypeId);
  const aiHeroTypeId = otherTypes[Math.floor(Math.random() * otherTypes.length)].id;
  adventureState = createAdventure(selectedHeroTypeId, aiHeroTypeId, { defeatsToWin });
  aiDayInProgress = false;
  resetInspectorUI();
  showScreen('screen-adventure');
  renderAdventure();
});

// ==================================================================
// ADVENTURE MAP
// ==================================================================
const ADV_HEX_SIZE = 26;

function renderAdventure() {
  const state = adventureState;
  // A day transition, battle resolution, etc. can move the hero or change
  // what's reachable out from under a previously-armed hex — always
  // require a fresh arm/confirm pair after any such full re-render.
  pendingMoveHexKey = null;
  $('adv-day').textContent = state.day;
  $('adv-day-limit').textContent = state.dayLimit;
  $('adv-moves').textContent = state.heroes.player.movementLeft;
  $('adv-hero-name').textContent = getFaction(state.heroes.player.heroTypeId).name;
  $('adv-hero-level').textContent = state.heroes.player.level;
  $('adv-defeats').textContent =
    `${state.heroes.ai.defeatsSuffered}-${state.heroes.player.defeatsSuffered} / ${state.defeatsToWin}`;

  renderAdventureMap();
  renderArmyList($('adv-army-list'), state.heroes.player.army);
  renderResourceList(state.heroes.player.resources);
}

function renderResourceList(resources) {
  const list = $('adv-resource-list');
  list.innerHTML = '';
  for (const r of RESOURCES) {
    const li = document.createElement('li');
    li.textContent = `${r}: ${resources[r]}`;
    list.appendChild(li);
  }
}

function renderArmyList(list, army) {
  list.innerHTML = '';
  if (army.length === 0) {
    const li = document.createElement('li');
    li.textContent = '(no creatures)';
    list.appendChild(li);
    return;
  }
  for (const stack of army) {
    const creature = getCreature(stack.creatureTypeId);
    const li = document.createElement('li');
    li.className = 'army-list-item';
    li.innerHTML = `<img src="${spritePath(creature.spriteId)}" alt="" width="22" height="22"> <span><strong>${creature.name}</strong> x${stack.count}</span>`;
    
    const tooltipText = `${creature.name} (Tier ${creature.tier} ${creature.ranged ? 'Ranged' : 'Melee'})\nCount: ${stack.count} (Total HP: ${stack.count * creature.hp})\nATK: ${creature.attack} | DEF: ${creature.defense}\nHP: ${creature.hp} | DMG: ${creature.dmgMin}-${creature.dmgMax} | SPD: ${creature.speed}`;
    li.setAttribute('title', tooltipText);

    li.addEventListener('mouseenter', (e) => showCreatureInspector(creature, stack.count, e));
    li.addEventListener('mousemove', (e) => showCreatureInspector(creature, stack.count, e));
    li.addEventListener('mouseleave', hideMapTooltip);
    li.addEventListener('click', () => openCreatureCardDialog(creature.id));

    list.appendChild(li);
  }
}

function showCreatureInspector(creature, count, mouseEvt = null) {
  const titleEl = $('inspector-title');
  const bodyEl = $('inspector-body');
  const typeText = creature.ranged ? '🏹 Ranged Unit' : '⚔️ Melee Unit';
  const badgeColor = '#4fc3f7';

  if (titleEl) {
    titleEl.textContent = `🐾 ${creature.name} (Tier ${creature.tier})`;
    titleEl.style.color = badgeColor;
  }

  const totalHp = count * creature.hp;
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div style="margin-bottom:0.3rem"><strong>${count}x ${creature.name}s in your army</strong></div>
      <div style="margin-bottom:0.15rem">• Type: ${typeText} (Tier ${creature.tier})</div>
      <div style="margin-bottom:0.15rem">• Attack: <strong>${creature.attack}</strong> | Defense: <strong>${creature.defense}</strong></div>
      <div style="margin-bottom:0.15rem">• HP: <strong>${creature.hp}</strong> / unit (Total HP: <strong>${totalHp}</strong>)</div>
      <div style="margin-bottom:0.15rem">• Damage: <strong>${creature.dmgMin}-${creature.dmgMax}</strong> | Speed: <strong>${creature.speed}</strong></div>
      <div style="margin-bottom:0.15rem">• Base Growth: <strong>${creature.growthPerDay}</strong>/day</div>
    `;
  }

  const tooltip = $('adv-map-tooltip');
  if (tooltip && mouseEvt) {
    tooltip.hidden = false;
    tooltip.innerHTML = `
      <div style="font-weight:bold; color:${badgeColor}">🐾 ${creature.name} (Tier ${creature.tier})</div>
      <div style="font-size:0.8rem; color:#cbb98f">${count}x in army (Total HP: ${totalHp})</div>
      <div style="font-size:0.78rem; margin-top:4px; border-top:1px solid rgba(255,255,255,0.2); padding-top:4px">
        <div>• ATK: ${creature.attack} | DEF: ${creature.defense}</div>
        <div>• HP: ${creature.hp} | DMG: ${creature.dmgMin}-${creature.dmgMax}</div>
        <div>• SPD: ${creature.speed} | ${typeText}</div>
      </div>
    `;
    const wrap = $('adv-map-wrap');
    if (wrap) {
      const rect = wrap.getBoundingClientRect();
      const x = mouseEvt.clientX - rect.left + 14;
      const y = mouseEvt.clientY - rect.top + 14;
      tooltip.style.left = `${Math.min(x, rect.width - 220)}px`;
      tooltip.style.top = `${Math.min(y, rect.height - 100)}px`;
    }
  }
}

let activeMapFilter = 'all';

const RESOURCE_CONFIG = {
  gold: { symbol: '$', label: 'Gold', color: '#ffd54f', text: '#5d4037' },
  wood: { symbol: '🪵', label: 'Wood', color: '#8d6e63', text: '#ffffff' },
  ore: { symbol: '⛰️', label: 'Ore', color: '#78909c', text: '#ffffff' },
  crystal: { symbol: '💎', label: 'Crystal', color: '#26c6da', text: '#004d40' },
  mercury: { symbol: '🧪', label: 'Mercury', color: '#ff5252', text: '#ffffff' },
  sulfur: { symbol: '💥', label: 'Sulfur', color: '#ffab00', text: '#3e2723' },
  gems: { symbol: '💍', label: 'Gems', color: '#ea80fc', text: '#4a148c' },
};

function initMapLegend() {
  const legendBar = $('map-legend-bar');
  if (!legendBar) return;
  const buttons = legendBar.querySelectorAll('.legend-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeMapFilter = btn.dataset.filter || 'all';
      if (adventureState) renderAdventureMap();
    });
  });

  // Collapsible on demand (the filter row can crowd out the map on a
  // small/mobile screen) — persisted so a collapse only has to happen
  // once, not every session.
  const toggleBtn = $('btn-toggle-legend');
  const setCollapsed = (collapsed) => {
    legendBar.classList.toggle('collapsed', collapsed);
    toggleBtn.textContent = collapsed ? 'Show ▼' : 'Hide ▲';
    toggleBtn.setAttribute('aria-expanded', String(!collapsed));
  };
  setCollapsed(settings.legendCollapsed);
  toggleBtn.addEventListener('click', () => {
    settings = { ...settings, legendCollapsed: !legendBar.classList.contains('collapsed') };
    saveSettings(settings);
    setCollapsed(settings.legendCollapsed);
  });
}
setTimeout(initMapLegend, 0);

function getHexInspectionDetails(hex) {
  if (!adventureState) return null;
  const state = adventureState;

  for (const owner of ['player', 'ai']) {
    const hero = state.heroes[owner];
    if (equals(hero.position, hex)) {
      const heroType = getFaction(hero.heroTypeId);
      const isPlayer = owner === 'player';
      const armyDesc = hero.army.map((s) => `${s.count} ${getCreature(s.creatureTypeId).name}`).join(', ') || 'No army';
      return {
        category: 'hero',
        title: `${isPlayer ? '🛡️ Player Hero' : '⚔️ Enemy Hero'}: ${heroType.name}`,
        subtitle: `Level ${hero.level} ${heroType.name} (${isPlayer ? 'Your Hero' : 'AI Opponent'})`,
        details: [
          `Attack: ${hero.attack} / Defense: ${hero.defense}`,
          `Army: ${armyDesc}`,
          isPlayer ? `Movement left: ${hero.movementLeft}/${hero.movementMax}` : 'Click to attack if reachable'
        ],
        badgeColor: isPlayer ? '#4fc3f7' : '#ff6b4a',
      };
    }
  }

  const occupant = state.hexes.get(key(hex));
  if (!occupant) {
    const dist = hexDistance(state.heroes.player.position, hex);
    return {
      category: 'empty',
      title: '🟩 Grassland Hex',
      subtitle: `Coordinates (${hex.q}, ${hex.r})`,
      details: [
        `Distance from Hero: ${dist} hex${dist === 1 ? '' : 'es'}`,
        dist <= state.heroes.player.movementLeft ? 'Reachable today' : 'Out of range today'
      ],
      badgeColor: '#5a4327',
    };
  }

  if (occupant.type === 'keep') {
    const ownerName = occupant.ownerId ? (occupant.ownerId === 'player' ? 'Your Keep' : 'AI Enemy Keep') : 'Neutral Keep';
    return {
      category: 'keep',
      title: `🏰 Castle Fortress (${ownerName})`,
      subtitle: occupant.ownerId === 'player' ? 'Your Home Base & Castle' : 'Enemy Fortress (Siege Target)',
      details: [
        `Owner: ${occupant.ownerId ? occupant.ownerId.toUpperCase() : 'Unclaimed'}`,
        `Produces +${KEEP_GOLD_YIELD} Gold per day for its owner`,
        occupant.ownerId === 'player' ? 'Click 🏰 Castle button to recruit creatures & learn spells.' : 'Move hero onto enemy keep to initiate a Siege!'
      ],
      badgeColor: occupant.ownerId === 'player' ? '#4fc3f7' : (occupant.ownerId === 'ai' ? '#ff6b4a' : '#ffd23f'),
    };
  }

  if (occupant.type === 'mine') {
    const resConf = RESOURCE_CONFIG[occupant.resource] || { symbol: '⛏️', label: occupant.resource, color: '#ffd54f' };
    const ownerName = occupant.ownerId ? (occupant.ownerId === 'player' ? 'You' : 'AI Enemy') : 'Unclaimed';
    const guardDesc = occupant.guard ? `Guarded by ${occupant.guard.count} ${getCreature(occupant.guard.creatureTypeId).name}s` : 'Unguarded';
    return {
      category: 'mine',
      title: `${resConf.symbol} ${resConf.label} Mine`,
      subtitle: `Produces +${MINE_YIELD[occupant.resource]} ${resConf.label} per day when captured`,
      details: [
        `Owner: ${ownerName}`,
        `Guard Status: ${guardDesc}`,
        occupant.ownerId === 'player' ? 'Generating daily yield for your kingdom' : 'Capture to claim daily resource yield'
      ],
      badgeColor: resConf.color,
    };
  }

  if (occupant.type === 'monster') {
    const guard = occupant.guard;
    const creature = guard ? getCreature(guard.creatureTypeId) : null;
    const name = creature ? creature.name : 'Roaming Monster';
    const count = guard ? guard.count : 0;
    return {
      category: 'monster',
      title: `💀 Hostile Monster: ${count} ${name}s`,
      subtitle: `Tier ${creature ? creature.tier : 1} Wild Monster Stack`,
      details: [
        `Count: ${count} ${name}s`,
        `Stats: ATK ${creature ? creature.attack : 1} / DEF ${creature ? creature.defense : 1} / HP ${creature ? creature.hp : 1}`,
        'Defeat in battle to claim XP & clear path'
      ],
      badgeColor: '#ff5252',
    };
  }

  if (occupant.type === 'dwelling') {
    const creature = occupant.creatureTypeId ? getCreature(occupant.creatureTypeId) : null;
    const name = creature ? creature.name : 'Creature';
    const ownerName = occupant.ownerId ? (occupant.ownerId === 'player' ? 'Captured by You' : 'Captured by AI') : 'Unclaimed';
    const guardDesc = occupant.guard ? `Guarded by ${occupant.guard.count} ${getCreature(occupant.guard.creatureTypeId).name}s` : 'Unguarded';
    return {
      category: 'dwelling',
      title: `🛖 ${name} Dwelling`,
      subtitle: `Unlocks ${name} recruitment at Castle`,
      details: [
        `Status: ${ownerName}`,
        `Guard Status: ${guardDesc}`,
        'Capture to unlock this creature tier in your Castle'
      ],
      badgeColor: '#81c784',
    };
  }

  if (occupant.type === 'treasure') {
    return {
      category: 'treasure',
      title: `💎 Treasure Chest (${occupant.amount} ${occupant.resource})`,
      subtitle: 'Free resource pick-up on hex',
      details: [
        `Contains: ${occupant.amount} ${occupant.resource}`,
        'Walk onto hex to pick up treasure instantly'
      ],
      badgeColor: '#ffd54f',
    };
  }

  return null;
}

function updateInspectorUI(hex, mouseEvt = null) {
  const info = getHexInspectionDetails(hex);
  if (!info) return;

  const titleEl = $('inspector-title');
  const bodyEl = $('inspector-body');
  if (titleEl) {
    titleEl.textContent = info.title;
    titleEl.style.color = info.badgeColor || 'var(--accent)';
  }
  if (bodyEl) {
    bodyEl.innerHTML = `<div style="margin-bottom:0.3rem"><strong>${info.subtitle}</strong></div>` +
      info.details.map((d) => `<div style="margin-bottom:0.15rem">• ${d}</div>`).join('');
  }

  const tooltip = $('adv-map-tooltip');
  if (tooltip && mouseEvt) {
    tooltip.hidden = false;
    const detailsHtml = info.details.map((d) => `<div style="margin-top:2px">• ${d}</div>`).join('');
    tooltip.innerHTML = `<div style="font-weight:bold; color:${info.badgeColor || '#fff'}">${info.title}</div><div style="font-size:0.8rem; color:#cbb98f">${info.subtitle}</div><div style="font-size:0.78rem; margin-top:4px; border-top:1px solid rgba(255,255,255,0.2); padding-top:4px">${detailsHtml}</div>`;
    const wrap = $('adv-map-wrap');
    if (wrap) {
      const rect = wrap.getBoundingClientRect();
      const x = mouseEvt.clientX - rect.left + 14;
      const y = mouseEvt.clientY - rect.top + 14;
      tooltip.style.left = `${Math.min(x, rect.width - 240)}px`;
      tooltip.style.top = `${Math.min(y, rect.height - 100)}px`;
    }
  }
}

function hideMapTooltip() {
  const tooltip = $('adv-map-tooltip');
  if (tooltip) tooltip.hidden = true;
}

function resetInspectorUI() {
  const titleEl = $('inspector-title');
  const bodyEl = $('inspector-body');
  if (titleEl) {
    titleEl.textContent = 'Select a hex';
    titleEl.style.color = '';
  }
  if (bodyEl) bodyEl.textContent = 'Hover or click any object on the map to inspect details.';
}

// Adventure-map movement is arm-then-confirm: clicking a hex the first
// time (or a different hex than whatever was already armed) only selects
// it — shows its Map Inspector info and a pulsing highlight — without
// moving. Clicking that SAME hex again is what actually commits the
// move. Guards against stray/misclicks actually relocating the hero
// (especially on mobile, where a tap doesn't get a hover preview first).
let pendingMoveHexKey = null;

function drawMapSvgBadge(svg, cx, cy, text, bgFill = '#241a10', textFill = '#f5ead2', borderFill = '#5a4327', fontSize = 9) {
  const g = svgEl('g', { class: 'map-badge-group', 'pointer-events': 'none' });
  const padX = 4;
  const textWidth = Math.max(12, text.length * (fontSize * 0.6));
  const width = textWidth + padX * 2;
  const height = fontSize + 4;
  const rect = svgEl('rect', {
    x: cx - width / 2,
    y: cy - height / 2,
    width,
    height,
    rx: 3,
    fill: bgFill,
    stroke: borderFill,
    'stroke-width': 1.2,
  });
  const txt = svgEl('text', {
    x: cx,
    y: cy + fontSize * 0.35,
    'font-size': `${fontSize}px`,
    'font-weight': 'bold',
    'font-family': 'var(--font-body), sans-serif',
    fill: textFill,
    'text-anchor': 'middle',
  });
  txt.textContent = text;
  g.appendChild(rect);
  g.appendChild(txt);
  svg.appendChild(g);
}

function renderAdventureMap() {
  const state = adventureState;
  const svg = $('adv-map');
  svg.innerHTML = '';
  const terrainFill = addTerrainDefs(svg);
  const allHexes = rectHexes(state.mapWidth, state.mapHeight);
  const { positions, width, height } = layoutHexes(allHexes, ADV_HEX_SIZE);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const inRangeHexes = new Set(
    allHexes
      .filter((h) => hexDistance(state.heroes.player.position, h) <= state.heroes.player.movementLeft)
      .map(key),
  );

  for (const hex of allHexes) {
    const pos = positions.get(key(hex));
    const occupant = state.hexes.get(key(hex));
    const inRange = state.phase === 'playing' && inRangeHexes.has(key(hex));
    const points = hexCorners(pos.x, pos.y, ADV_HEX_SIZE - 1);

    // Check legend filter matching
    let isFilterMatch = false;
    if (activeMapFilter !== 'all') {
      if (occupant && occupant.type === activeMapFilter) isFilterMatch = true;
      if (activeMapFilter === 'hero') {
        if (equals(state.heroes.player.position, hex) || equals(state.heroes.ai.position, hex)) {
          isFilterMatch = true;
        }
      }
    }

    const tileClass = 'hex-tile' + (isFilterMatch ? ' filter-matched' : '');
    const poly = svgEl('polygon', { points, class: tileClass, fill: terrainFill('grass') });
    
    // Add inspector hover listeners
    poly.addEventListener('mouseenter', (e) => updateInspectorUI(hex, e));
    poly.addEventListener('mousemove', (e) => updateInspectorUI(hex, e));
    poly.addEventListener('mouseleave', hideMapTooltip);
    poly.addEventListener('click', () => handleAdventureHexClick(hex));
    svg.appendChild(poly);

    if (inRange) {
      svg.appendChild(svgEl('polygon', { points, class: 'hex-tile-tint in-range' }));
    }

    if (key(hex) === pendingMoveHexKey) {
      svg.appendChild(svgEl('polygon', { points, class: 'hex-tile-highlight pending-move' }));
    }

    if (isFilterMatch) {
      const highlight = svgEl('polygon', { points, class: 'hex-tile-highlight' });
      svg.appendChild(highlight);
    }

    if (occupant) {
      // 1. Pedestals / Aura Glows depending on object category
      if (occupant.type === 'keep') {
        const keepAura = svgEl('circle', {
          cx: pos.x, cy: pos.y + 4, r: ADV_HEX_SIZE * 0.95,
          class: `keep-pedestal owner-${occupant.ownerId || 'neutral'}`,
        });
        svg.appendChild(keepAura);
      } else if (occupant.type === 'monster') {
        const monsterAura = svgEl('circle', {
          cx: pos.x, cy: pos.y + 2, r: ADV_HEX_SIZE * 0.85, class: 'threat-aura-pulse',
        });
        svg.appendChild(monsterAura);
      } else if (occupant.type === 'treasure') {
        const treasureAura = svgEl('circle', {
          cx: pos.x, cy: pos.y + 2, r: ADV_HEX_SIZE * 0.75, class: 'treasure-aura-glow',
        });
        svg.appendChild(treasureAura);
      }

      // 2. Object Sprite Graphic
      let iconSize = ADV_HEX_SIZE * 1.25;
      if (occupant.type === 'keep') iconSize = ADV_HEX_SIZE * 1.55;

      const img = svgEl('image', {
        href: spritePath(occupant.spriteId),
        x: pos.x - iconSize / 2,
        y: pos.y - iconSize / 2 - (occupant.type === 'keep' ? 4 : 0),
        width: iconSize,
        height: iconSize,
        class: `hex-object-icon object-type-${occupant.type}`,
      });
      img.addEventListener('mouseenter', (e) => updateInspectorUI(hex, e));
      img.addEventListener('mousemove', (e) => updateInspectorUI(hex, e));
      img.addEventListener('mouseleave', hideMapTooltip);
      img.addEventListener('click', () => handleAdventureHexClick(hex));
      svg.appendChild(img);

      // 3. Ownership Rings & Category Badges
      if (occupant.ownerId) {
        const ring = svgEl('circle', {
          cx: pos.x, cy: pos.y, r: ADV_HEX_SIZE - 2, class: `owner-ring owner-${occupant.ownerId}`,
        });
        svg.appendChild(ring);
      }

      // 4. Specific Badge Overlays for instant readability
      if (occupant.type === 'keep') {
        drawMapSvgBadge(svg, pos.x, pos.y + ADV_HEX_SIZE - 6, occupant.ownerId ? occupant.ownerId.toUpperCase() : 'CASTLE', occupant.ownerId === 'player' ? '#1565c0' : (occupant.ownerId === 'ai' ? '#c62828' : '#37474f'), '#ffffff', '#ffd54f', 8);
      } else if (occupant.type === 'mine') {
        const resConf = RESOURCE_CONFIG[occupant.resource];
        if (resConf) {
          drawMapSvgBadge(svg, pos.x + ADV_HEX_SIZE * 0.45, pos.y - ADV_HEX_SIZE * 0.45, resConf.symbol, resConf.color, resConf.text, '#212121', 10);
        }
      } else if (occupant.type === 'monster') {
        const guard = occupant.guard;
        if (guard) {
          const creature = getCreature(guard.creatureTypeId);
          drawMapSvgBadge(svg, pos.x, pos.y + ADV_HEX_SIZE - 6, `${guard.count}x ${creature.name}`, '#b71c1c', '#ffffff', '#ff5252', 8);
        }
      } else if (occupant.type === 'dwelling') {
        const creature = occupant.creatureTypeId ? getCreature(occupant.creatureTypeId) : null;
        if (creature) {
          drawMapSvgBadge(svg, pos.x, pos.y + ADV_HEX_SIZE - 6, creature.name, '#2e7d32', '#ffffff', '#81c784', 8);
        }
      } else if (occupant.type === 'treasure') {
        drawMapSvgBadge(svg, pos.x, pos.y + ADV_HEX_SIZE - 6, `+$${occupant.amount}`, '#ff8f00', '#3e2723', '#ffd54f', 8);
      }
    }
  }

  // Render Hero Tokens with Pedestals, Auras, and Hero Crest Badges
  for (const owner of ['player', 'ai']) {
    const hero = state.heroes[owner];
    const pos = positions.get(key(hero.position));
    if (!pos) continue;
    const heroType = getFaction(hero.heroTypeId);
    const size = ADV_HEX_SIZE * 1.5;

    // Glowing Hero Pedestal Aura
    const heroAura = svgEl('circle', {
      cx: pos.x, cy: pos.y, r: ADV_HEX_SIZE * 1.1,
      class: `hero-pedestal-aura owner-${owner}`,
    });
    svg.appendChild(heroAura);

    // Hero Outer Ring
    svg.appendChild(svgEl('circle', { cx: pos.x, cy: pos.y, r: ADV_HEX_SIZE - 2, class: `owner-ring owner-${owner} hero-ring` }));

    // Hero Image Token
    const heroImg = svgEl('image', {
      href: spritePath(heroType.spriteId), x: pos.x - size / 2, y: pos.y - size / 2, width: size, height: size,
      class: `hero-token owner-${owner}`,
    });
    heroImg.addEventListener('mouseenter', (e) => updateInspectorUI(hero.position, e));
    heroImg.addEventListener('mousemove', (e) => updateInspectorUI(hero.position, e));
    heroImg.addEventListener('mouseleave', hideMapTooltip);
    heroImg.addEventListener('click', () => handleAdventureHexClick(hero.position));
    svg.appendChild(heroImg);

    // Hero Level Badge
    const isPlayer = owner === 'player';
    const label = `${isPlayer ? 'LV' : 'AI'}${hero.level} ${heroType.name}`;
    drawMapSvgBadge(svg, pos.x, pos.y - ADV_HEX_SIZE * 0.75, label, isPlayer ? '#0288d1' : '#d32f2f', '#ffffff', isPlayer ? '#81d4fa' : '#ff8a80', 9);
  }
}

function handleAdventureHexClick(hex) {
  if (!adventureState || adventureState.phase !== 'playing' || aiDayInProgress) return;
  const hexKey = key(hex);
  if (pendingMoveHexKey !== hexKey) {
    pendingMoveHexKey = hexKey;
    updateInspectorUI(hex);
    renderAdventureMap();
    return;
  }
  pendingMoveHexKey = null;
  const ok = moveHero(adventureState, 'player', hex);
  if (!ok) { renderAdventureMap(); return; }
  renderAdventure();
  if (adventureState.phase === 'battle') startBattleFromPending();
}

$('btn-end-day').addEventListener('click', () => {
  if (!adventureState || adventureState.phase !== 'playing' || aiDayInProgress) return;
  aiDayInProgress = true;
  continueAiDay();
});

function continueAiDay() {
  if (!aiDayInProgress) return;
  if (!adventureState || adventureState.phase !== 'playing') return;
  const aiHero = adventureState.heroes.ai;
  if (aiHero.movementLeft <= 0) {
    finishAiDay();
    return;
  }
  const target = aiSelectTarget(adventureState, 'ai');
  const nextHex = target ? planMoveTowards(adventureState, 'ai', target) : null;
  if (!nextHex) {
    finishAiDay();
    return;
  }
  const ok = moveHero(adventureState, 'ai', nextHex);
  renderAdventure();
  if (!ok) {
    finishAiDay();
    return;
  }
  if (adventureState.phase === 'battle') {
    const pending = adventureState.pendingBattle;
    if (pending.defenderKind === 'hero' && pending.defenderOwner === 'player') {
      startBattleFromPending(); // AI attacked the player — interactive fight
    } else {
      autoResolveNeutralBattle();
      setTimeout(continueAiDay, 120);
    }
    return;
  }
  setTimeout(continueAiDay, 120);
}

function finishAiDay() {
  aiDayInProgress = false;
  endDay(adventureState);
  chooseAiCastleActions(adventureState, 'ai');
  renderAdventure();
  if (adventureState.phase === 'gameover') {
    // Combat-decided endings (hero-vs-hero defeat count reached) already
    // got their closure from the battle scroll — go straight to the
    // score screen. Only the Day-limit/Kingdom-Score ending offers a
    // final-battle alternative, since that's the only ending the player
    // hasn't already had a direct hand in via combat.
    if (adventureState.winReason === 'score') offerFinalBattle();
    else showGameOver();
  }
}

// ==================================================================
// CASTLE
// ==================================================================
function formatCost(cost) {
  return Object.entries(cost).map(([r, amt]) => `${amt} ${r}`).join(', ');
}

$('btn-open-castle').addEventListener('click', () => {
  if (!adventureState || adventureState.phase !== 'playing' || aiDayInProgress) return;
  renderCastle();
  showScreen('screen-castle');
});
$('btn-castle-back').addEventListener('click', () => {
  showScreen('screen-adventure');
  renderAdventure();
});

function openCreatureCardDialog(creatureId) {
  const creature = getCreature(creatureId);
  if (!creature) return;

  const avatarEl = $('creature-card-avatar');
  const dwellingIconEl = $('creature-card-dwelling-icon');
  const nameEl = $('creature-card-name');
  const badgeEl = $('creature-card-badge');

  if (avatarEl) avatarEl.src = spritePath(creature.spriteId);
  if (dwellingIconEl) dwellingIconEl.src = spritePath('dwelling-' + creature.id);
  if (nameEl) nameEl.textContent = creature.name;
  if (badgeEl) badgeEl.textContent = `Tier ${creature.tier} · ${creature.ranged ? '🏹 Ranged Unit' : '⚔️ Melee Unit'}`;

  const attackEl = $('cc-stat-attack');
  const defenseEl = $('cc-stat-defense');
  const hpEl = $('cc-stat-hp');
  const damageEl = $('cc-stat-damage');
  const speedEl = $('cc-stat-speed');
  const growthEl = $('cc-stat-growth');

  if (attackEl) attackEl.textContent = creature.attack;
  if (defenseEl) defenseEl.textContent = creature.defense;
  if (hpEl) hpEl.textContent = creature.hp;
  if (damageEl) damageEl.textContent = `${creature.dmgMin}-${creature.dmgMax}`;
  if (speedEl) speedEl.textContent = creature.speed;
  if (growthEl) growthEl.textContent = `+${creature.growthPerDay}/day`;

  const recruitCostEl = $('cc-recruit-cost');
  const buildCostEl = $('cc-build-cost');

  if (recruitCostEl) recruitCostEl.textContent = formatCost(RECRUIT_COST[creature.id]) + ' each';
  if (buildCostEl) buildCostEl.textContent = formatCost(BUILD_COST[creature.id]);

  const dialog = $('dialog-creature-card');
  if (dialog) dialog.showModal();
}

$('btn-close-creature-card').addEventListener('click', () => {
  const dialog = $('dialog-creature-card');
  if (dialog) dialog.close();
});

$('dialog-creature-card').addEventListener('click', (e) => {
  const dialog = $('dialog-creature-card');
  if (e.target === dialog) dialog.close();
});

// Builds one Castle-screen creature row (used both for the hero's own
// 7-creature faction roster and, separately, for any off-faction
// creature captured on the map — specs/005-castle-factions spec.md
// FR-3/US-2: capturing an off-faction dwelling still unlocks it, it just
// doesn't belong to the main list).
function renderCastleRow(list, hero, creature) {
  const unlocked = isUnlocked(hero, creature.id);
  const li = document.createElement('li');
  li.className = 'castle-row' + (unlocked ? '' : ' locked');

  const info = document.createElement('div');
  info.className = 'castle-row-info';
  info.style.cursor = 'pointer';
  info.title = `Click to view ${creature.name} attributes card`;
  info.addEventListener('click', () => openCreatureCardDialog(creature.id));

  if (unlocked) {
    const pool = hero.castle.pool[creature.id] || 0;
    info.innerHTML = `<div class="castle-row-name">${creature.name} (tier ${creature.tier}) ℹ️</div>
      <div class="castle-row-detail">Pool: ${pool} (+${creature.growthPerDay}/day) · recruit cost: ${formatCost(RECRUIT_COST[creature.id])} each</div>`;
  } else {
    info.innerHTML = `<div class="castle-row-name">${creature.name} (tier ${creature.tier}) ℹ️</div>
      <div class="castle-row-detail">Not built — build cost: ${formatCost(BUILD_COST[creature.id])}</div>`;
  }

  const actions = document.createElement('div');
  actions.className = 'castle-row-actions';

  const cardBtn = document.createElement('button');
  cardBtn.type = 'button';
  cardBtn.className = 'btn btn-ghost btn-small';
  cardBtn.textContent = 'ℹ️ Card';
  cardBtn.title = `View ${creature.name} Attributes Card`;
  cardBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openCreatureCardDialog(creature.id);
  });

  if (unlocked) {
    const max = maxRecruitable(hero, creature.id);
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = String(max);
    input.value = String(max);
    input.disabled = max === 0;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary btn-small';
    btn.textContent = 'Recruit';
    btn.disabled = max === 0;
    btn.addEventListener('click', () => {
      const count = Math.max(0, Math.min(max, Number(input.value) || 0));
      if (count > 0 && recruitCreatures(adventureState, 'player', creature.id, count)) renderCastle();
    });
    actions.append(cardBtn, input, btn);
  } else {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-secondary btn-small';
    btn.textContent = 'Build';
    btn.disabled = !canAffordBuild(hero, creature.id);
    btn.addEventListener('click', () => {
      if (buildDwelling(adventureState, 'player', creature.id)) renderCastle();
    });
    actions.append(cardBtn, btn);
  }

  const img = document.createElement('img');
  img.src = spritePath('dwelling-' + creature.id);
  img.alt = '';
  img.width = 40;
  img.height = 40;
  img.style.cursor = 'pointer';
  img.title = `Click to view ${creature.name} attributes card`;
  img.addEventListener('click', () => openCreatureCardDialog(creature.id));

  li.append(img, info, actions);
  list.appendChild(li);
}

function renderCastle() {
  const hero = adventureState.heroes.player;
  $('castle-resources').textContent = RESOURCES.map((r) => `${r}: ${hero.resources[r]}`).join(' · ');

  const roster = castleRosterFor(hero);
  const list = $('castle-rows');
  list.innerHTML = '';
  for (const creatureTypeId of roster) {
    renderCastleRow(list, hero, getCreature(creatureTypeId));
  }

  // Off-faction unlocks (specs/005-castle-factions US-2) — a hero can
  // still capture another faction's dwelling on the map; it unlocks like
  // always, it just shows here instead of interleaved with the 7 rows
  // above.
  const otherList = $('castle-rows-other');
  const otherTitle = $('castle-rows-other-title');
  otherList.innerHTML = '';
  const otherUnlocked = [...hero.castle.unlocked].filter((id) => !roster.includes(id));
  otherTitle.hidden = otherUnlocked.length === 0;
  for (const creatureTypeId of otherUnlocked) {
    renderCastleRow(otherList, hero, getCreature(creatureTypeId));
  }

  renderCastleSpells(hero);
}

function renderCastleSpells(hero) {
  const list = $('castle-spell-rows');
  list.innerHTML = '';
  for (const spell of SPELLS) {
    const known = knowsSpell(hero, spell.id);
    const li = document.createElement('li');
    li.className = 'castle-row' + (known ? '' : ' locked');

    const info = document.createElement('div');
    info.className = 'castle-row-info';
    const effectSummary = spell.effect === 'damage' ? `${spell.power} dmg, ${spell.target === 'allEnemies' ? 'all enemies' : 'one enemy'}`
      : spell.effect === 'heal' ? `restore ${spell.power} HP, one ally`
      : `${spell.amount > 0 ? '+' : ''}${spell.amount} ${spell.stat}, ${spell.target === 'allAllies' ? 'all allies' : 'all enemies'}, ${spell.durationRounds} rounds`;
    if (known) {
      info.innerHTML = `<div class="castle-row-name">${spell.name}</div>
        <div class="castle-row-detail">${effectSummary} · mana cost: ${spell.manaCost}</div>`;
    } else {
      info.innerHTML = `<div class="castle-row-name">${spell.name}</div>
        <div class="castle-row-detail">${effectSummary} · mana cost: ${spell.manaCost}</div>
        <div class="castle-row-detail">Not learned — learn cost: ${formatCost(spell.learnCost)}</div>`;
    }

    const actions = document.createElement('div');
    actions.className = 'castle-row-actions';
    if (!known) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-secondary btn-small';
      btn.textContent = 'Learn';
      btn.disabled = !canAffordLearnSpell(hero, spell.id);
      btn.addEventListener('click', () => {
        if (learnSpell(adventureState, 'player', spell.id)) renderCastle();
      });
      actions.append(btn);
    }

    li.append(info, actions);
    list.appendChild(li);
  }
}

// ==================================================================
// BATTLE
// ==================================================================
const BATTLE_HEX_SIZE = 32;

function battleSideOwner(side) {
  if (!battleContext) return null;
  return side === 'attacker' ? battleContext.attackerOwner : battleContext.defenderOwner;
}

// Which battle.js `side` ('attacker'/'defender') the human player
// controls in the current battle, or null if the player has no hero in
// this fight at all (shouldn't normally happen — the player is always
// either the attacker or, when the AI reaches them, the defender).
function playerBattleSide() {
  if (battleContext?.attackerOwner === 'player') return 'attacker';
  if (battleContext?.defenderOwner === 'player') return 'defender';
  return null;
}

// battle.js's per-side remaining mana, in the shape resolveBattleOutcome
// expects (null for a side with no hero — synced back onto the
// adventure-level hero, specs/003-siege-and-spells FR-4).
function remainingManaFrom(state) {
  return {
    attacker: state.heroSides.attacker ? state.heroSides.attacker.mana : null,
    defender: state.heroSides.defender ? state.heroSides.defender.mana : null,
  };
}

function startBattleFromPending() {
  const pending = adventureState.pendingBattle;
  const armies = getPendingBattleArmies(adventureState);
  const isSiege = isSiegeBattle(adventureState);
  battleContext = {
    attackerOwner: pending.attackerOwner,
    defenderOwner: pending.defenderKind === 'hero' ? pending.defenderOwner : null,
    isSiege,
  };
  battleState = createBattle(
    armies.attackerArmy, armies.defenderArmy, armies.attackerBonus, armies.defenderBonus,
    undefined, { isSiege },
  );
  pendingSpellCast = null;
  pendingCatapultTarget = false;
  showScreen('screen-battle');
  stepBattleAuto();
}

function stepBattleAuto() {
  if (!battleState) return;
  if (battleState.phase !== 'battle') {
    renderBattle();
    finishBattleIfOver();
    return;
  }
  const active = getStack(battleState, battleState.activeStackId);
  if (!active) {
    finishBattleIfOver();
    return;
  }
  renderBattle();
  const owner = battleSideOwner(active.side);
  if (owner === 'player') return; // wait for the human to click
  setTimeout(() => {
    if (!battleState || battleState.phase !== 'battle') return;
    const effects = playAiBattleTurn(battleState, active.id);
    // renderBattle() inside this call synchronously redraws the map with
    // the new post-action state before it returns, so appending effect
    // elements right after (not before) is what keeps them from being
    // wiped out by that same render's innerHTML = '' reset.
    stepBattleAuto();
    for (const effect of effects) showEffect(effect);
  }, 380);
}

// Returns every attack/spell result that happened this turn (empty array
// if the stack only moved/waited) so the caller can play visual feedback
// for each — see the comment at its call site above for why that has to
// happen after, not during, this function.
function playAiBattleTurn(state, stackId) {
  const effects = [];
  const stack = getStack(state, stackId);
  if (stack) {
    // Spellcasting and the catapult are both free actions gated once-per-
    // round by battle.js itself (castSpell/attackWall no-op harmlessly if
    // already used, or if this side has no hero/isn't the attacker — a
    // neutral guard/militia stack calling these every turn is fine).
    // Tried before the stack's own move/attack since neither consumes
    // the turn.
    const spellDecision = chooseAiSpell(state, stack.side);
    if (spellDecision) {
      const result = castSpell(state, stack.side, spellDecision.spellId, spellDecision.targetId);
      if (result) effects.push({ kind: 'spell', result });
    }
    const catapultTarget = chooseAiCatapultTarget(state, stack.side);
    if (catapultTarget) attackWall(state, stack.side, catapultTarget);
  }
  const moveDecision = aiChooseBattleMove(state, stackId);
  if (moveDecision) moveStack(state, stackId, moveDecision.targetHex);
  if (state.activeStackId === stackId && state.phase === 'battle') {
    const atk = aiChooseBattleAttack(state, stackId);
    if (atk) {
      const result = attackStack(state, stackId, atk.targetId);
      if (result) effects.push({ kind: 'attack', result });
    } else waitStack(state, stackId);
  }
  return effects;
}

function finishBattleIfOver() {
  if (!battleState || battleState.phase !== 'over') return;
  const winnerSide = battleState.winnerSide;
  const survivors = survivingStacks(battleState, winnerSide);

  if (isFinalBattle) {
    finishFinalBattle(winnerSide, survivors);
    return;
  }

  // Captured *before* resolveBattleOutcome mutates everything (it clears
  // state.pendingBattle, overwrites occupant.ownerId/guard, changes
  // hero.xp/level, etc.) so describeBattleOutcome below can still narrate
  // what the fight was actually over and what changed as a result.
  const pending = adventureState.pendingBattle;
  const involvesPlayer = pending.attackerOwner === 'player' || pending.defenderOwner === 'player';
  const occupantSnap = snapshotOccupant(pending.hex);
  const attackerHeroBefore = adventureState.heroes[pending.attackerOwner];
  const xpBefore = attackerHeroBefore.xp;
  const levelBefore = attackerHeroBefore.level;

  resolveBattleOutcome(adventureState, winnerSide, survivors, remainingManaFrom(battleState));
  battleState = null;
  battleContext = null;
  pendingSpellCast = null;
  pendingCatapultTarget = false;

  if (involvesPlayer) {
    const lines = describeBattleOutcome(pending, occupantSnap, xpBefore, levelBefore, winnerSide);
    showScrollNotification(lines, proceedAfterBattle);
  } else {
    proceedAfterBattle();
  }
}

function proceedAfterBattle() {
  if (adventureState.phase === 'gameover') {
    showGameOver();
    return;
  }
  showScreen('screen-adventure');
  renderAdventure();
  if (aiDayInProgress) continueAiDay();
}

// The Day-limit final-battle tie-breaker (see offerFinalBattle) always
// ends the game on the spot — no defeatsToWin gate, no respawn, and no
// "did this involve the player" check (it always does: only the player
// can trigger this offer). Narrated with its own scroll (not
// describeBattleOutcome, which assumes the normal defeatsSuffered-gated
// hero-vs-hero flow and would misreport "Nth defeat" text here).
function finishFinalBattle(winnerSide, survivors) {
  const pending = adventureState.pendingBattle;
  const winnerOwner = winnerSide === 'attacker' ? pending.attackerOwner : pending.defenderOwner;
  resolveFinalBattleOutcome(adventureState, winnerSide, survivors, remainingManaFrom(battleState));
  battleState = null;
  battleContext = null;
  pendingSpellCast = null;
  pendingCatapultTarget = false;
  isFinalBattle = false;

  const lines = winnerOwner === 'player'
    ? ['Victory! Your final battle settles it — you win the war.']
    : ["Defeat! The AI's final battle victory settles it — the war is lost."];
  showScrollNotification(lines, showGameOver);
}

// Offered once the Day-limit is reached (finishAiDay, in place of jumping
// straight to showGameOver) — lets the player fight one decisive
// hero-vs-hero battle instead of just accepting the Kingdom Score
// verdict. Declining proceeds exactly as before this feature existed.
function offerFinalBattle() {
  const state = adventureState;
  const playerScore = kingdomScore(state, 'player');
  const aiScore = kingdomScore(state, 'ai');
  const verdict = playerScore === aiScore ? "it's a draw"
    : playerScore > aiScore ? 'you win' : 'the AI wins';
  $('final-battle-summary').textContent =
    `Kingdom Score says ${verdict} (You: ${playerScore} pts, AI: ${aiScore} pts).`;
  $('dialog-final-battle-offer').showModal();
}

$('btn-final-battle-no').addEventListener('click', () => {
  $('dialog-final-battle-offer').close();
  showGameOver();
});

$('btn-final-battle-yes').addEventListener('click', () => {
  $('dialog-final-battle-offer').close();
  startFinalBattle();
});

// Teleports the player's hero onto the AI hero's current hex (bypassing
// normal movement/pathing entirely — this is a special one-off duel, not
// a real move) and starts an interactive hero-vs-hero fight through the
// exact same createBattle/startBattleFromPending path a normal encounter
// uses, so siege treatment (home-turf bonus, wall) still applies
// correctly if the AI happens to be standing at their own Keep.
function startFinalBattle() {
  const state = adventureState;
  const hex = state.heroes.ai.position;
  state.phase = 'battle';
  state.pendingBattle = { attackerOwner: 'player', defenderKind: 'hero', defenderOwner: 'ai', hex };
  isFinalBattle = true;
  startBattleFromPending();
}

// A hex's guarded-object fields relevant to narrating a just-finished
// fight, snapshotted before resolveBattleOutcome overwrites ownerId/guard
// (dwelling capture) or deletes the hex entirely (monster defeated).
function snapshotOccupant(hex) {
  const occupant = adventureState.hexes.get(key(hex));
  if (!occupant) return null;
  return { type: occupant.type, creatureTypeId: occupant.creatureTypeId, resource: occupant.resource, ownerId: occupant.ownerId };
}

function battleOwnerLabel(owner) {
  return owner === 'player' ? 'You' : 'The AI';
}

// Builds the ScrollPopup-style narrative lines for a just-finished battle
// that the player was involved in (as attacker, defender, or the guard
// fight is their own). `pending`/`occupantSnap`/`xpBefore`/`levelBefore`
// are all snapshotted before resolveBattleOutcome ran (see
// finishBattleIfOver) since that call already mutated the state this
// needs to read.
function describeBattleOutcome(pending, occupantSnap, xpBefore, levelBefore, winnerSide) {
  const state = adventureState;
  const attackerOwner = pending.attackerOwner;
  const lines = [];

  if (pending.defenderKind === 'hero') {
    const defenderOwner = pending.defenderOwner;
    const winnerOwner = winnerSide === 'attacker' ? attackerOwner : defenderOwner;
    const loserOwner = winnerOwner === attackerOwner ? defenderOwner : attackerOwner;
    lines.push(
      winnerOwner === 'player'
        ? "Victory! You defeated the AI's hero in battle."
        : 'Defeat! The AI defeated your hero in battle.',
    );
    const loserDefeats = state.heroes[loserOwner].defeatsSuffered;
    if (state.phase === 'gameover') {
      lines.push(
        loserOwner === 'player'
          ? `That was your ${loserDefeats}${loserDefeats === 1 ? 'st' : loserDefeats === 2 ? 'nd' : 'rd'} defeat — the game is over.`
          : `That was the AI's ${loserDefeats}${loserDefeats === 1 ? 'st' : loserDefeats === 2 ? 'nd' : 'rd'} defeat — the game is over.`,
      );
    } else {
      lines.push(
        loserOwner === 'player'
          ? `Your hero respawns at your Keep with a fresh army. (${loserDefeats}/${state.defeatsToWin} defeats)`
          : `The AI's hero respawns at their Keep with a fresh army. (${loserDefeats}/${state.defeatsToWin} defeats)`,
      );
    }
    return lines;
  }

  // A guard fight only ever reaches this scroll when the player is the
  // one attacking (main.js's autoResolveNeutralBattle handles the AI's
  // own guard fights instantly with no scroll, since the player isn't
  // involved in those at all — see finishBattleIfOver's involvesPlayer).
  if (winnerSide === 'attacker') {
    lines.push('Victory! Your army defeated the guard.');
    if (occupantSnap) {
      if (occupantSnap.type === 'mine') {
        lines.push(`You captured the ${occupantSnap.resource} mine.`);
      } else if (occupantSnap.type === 'dwelling') {
        const creatureName = getCreature(occupantSnap.creatureTypeId).name;
        lines.push(`You captured the ${creatureName} dwelling — it's now unlocked at your Castle.`);
        if (occupantSnap.ownerId && occupantSnap.ownerId !== attackerOwner) {
          lines.push(`The AI can no longer recruit ${creatureName} from it.`);
        }
      } else if (occupantSnap.type === 'monster') {
        lines.push('The monster guarding this hex has been destroyed.');
      }
    }
    const xpGained = state.heroes.player.xp - xpBefore;
    if (xpGained > 0) {
      lines.push(`You gained ${xpGained} XP${state.heroes.player.level > levelBefore ? ' and leveled up!' : '.'}`);
    }
  } else {
    lines.push('Defeat! Your army was wiped out by the guard.');
    lines.push('You respawn at your Keep with a fresh starting army.');
  }
  return lines;
}

// Generic ScrollPopup-style narrative modal (see css/styles.css's
// .scroll-overlay) — an unrolling parchment scroll with wooden rollers,
// used for any one-off narration moment. `onClose` fires once the player
// dismisses it; nothing else waits on the scroll except through that
// callback (battle results defer their screen transition to it — see
// finishBattleIfOver/proceedAfterBattle).
function showScrollNotification(lines, onClose) {
  const overlay = $('scroll-notification');
  const linesEl = $('scroll-lines');
  linesEl.innerHTML = '';
  for (const line of lines) {
    const p = document.createElement('p');
    p.className = 'scroll-line';
    p.textContent = line;
    linesEl.appendChild(p);
  }
  overlay.hidden = false;
  const btn = $('btn-scroll-continue');
  const handleClose = () => {
    overlay.hidden = true;
    btn.removeEventListener('click', handleClose);
    onClose();
  };
  btn.addEventListener('click', handleClose);
}

function autoResolveNeutralBattle() {
  const pending = adventureState.pendingBattle;
  const armies = getPendingBattleArmies(adventureState);
  const context = {
    attackerOwner: pending.attackerOwner,
    defenderOwner: null,
  };
  const bs = createBattle(
    armies.attackerArmy, armies.defenderArmy, armies.attackerBonus, armies.defenderBonus,
    undefined, { isSiege: isSiegeBattle(adventureState) },
  );
  let guard = 0;
  while (bs.phase === 'battle' && guard < 1000) {
    const active = getStack(bs, bs.activeStackId);
    if (!active) break;
    playAiBattleTurn(bs, active.id);
    guard++;
  }
  const survivors = survivingStacks(bs, bs.winnerSide || 'attacker');
  resolveBattleOutcome(adventureState, bs.winnerSide || 'attacker', survivors, remainingManaFrom(bs));
}

function renderBattle() {
  const state = battleState;
  if (!state) return;
  $('battle-round').textContent = state.round;

  const active = getStack(state, state.activeStackId);
  const owner = active ? battleSideOwner(active.side) : null;
  const ownerLabel = owner === 'player' ? 'Your turn' : owner === 'ai' ? "AI's turn" : 'Neutral guard';
  const ownerEl = $('battle-turn-owner');
  ownerEl.textContent = ownerLabel;
  ownerEl.className = 'pill ' + (owner === 'player' ? 'turn-player' : owner === 'ai' ? 'turn-ai' : 'turn-neutral');

  $('battle-siege-wall').hidden = !battleContext?.isSiege;

  renderTurnOrder(state);
  renderBattleMap(state);

  const controls = $('battle-controls');
  if (active && owner === 'player') {
    controls.hidden = false;
    $('battle-active-label').textContent = `${getCreature(active.creatureTypeId).name} (${active.count})`;
  } else {
    controls.hidden = true;
  }

  renderBattleSpellPanel(state, active, owner);
  renderBattleCatapultPanel(state, active, owner);
}

// Shown only when the player is the attacker in a siege, it's their turn
// window, and at least one wall hex is still standing — the catapult
// (specs/004-siege-battlefield US-4) has no defender/militia equivalent.
function renderBattleCatapultPanel(state, active, owner) {
  const panel = $('battle-catapult-panel');
  const side = playerBattleSide();
  const show = active && owner === 'player' && side === 'attacker' && battleContext?.isSiege && state.walls.size > 0;
  panel.hidden = !show;
  if (!show) {
    pendingCatapultTarget = false;
    return;
  }
  const btn = $('btn-fire-catapult');
  btn.disabled = state.heroSides.attacker.hasFiredCatapultThisRound;
  btn.classList.toggle('active', pendingCatapultTarget);
}

$('btn-fire-catapult').addEventListener('click', () => {
  pendingSpellCast = null;
  pendingCatapultTarget = !pendingCatapultTarget;
  renderBattle();
});

// Shown whenever it's the player's own turn window (spellcasting is a
// free action available whenever any of your stacks is active, not just
// the one currently up — specs/003-siege-and-spells Decision #1) and
// their hero knows at least one spell.
function renderBattleSpellPanel(state, active, owner) {
  const panel = $('battle-spell-panel');
  const hero = adventureState.heroes.player;
  const side = playerBattleSide();
  const show = active && owner === 'player' && side && hero.spellbook.size > 0;
  panel.hidden = !show;
  if (!show) {
    pendingSpellCast = null;
    return;
  }

  // state.heroSides[side].mana is the live, in-battle figure that
  // castSpell actually decrements; adventureState's hero.mana is only a
  // pre-battle snapshot that doesn't get synced back until the battle
  // ends (resolveBattleOutcome), so displaying it here would leave the
  // mana pill frozen at its pre-battle value for the whole fight.
  $('battle-mana').textContent = state.heroSides[side].mana;
  $('battle-mana-max').textContent = hero.manaMax;

  const wrap = $('battle-spell-buttons');
  wrap.innerHTML = '';
  for (const spell of SPELLS) {
    if (!hero.spellbook.has(spell.id)) continue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-secondary btn-small' + (pendingSpellCast === spell.id ? ' active' : '');
    btn.textContent = `${spell.name} (${spell.manaCost} mana)`;
    btn.disabled = !canCastSpell(state, side, spell.id);
    btn.addEventListener('click', () => handleSpellButtonClick(spell));
    wrap.appendChild(btn);
  }
}

function handleSpellButtonClick(spell) {
  pendingCatapultTarget = false;
  const needsTarget = spell.target === 'singleEnemy' || spell.target === 'singleAlly';
  if (!needsTarget) {
    castSpellAndRender(spell.id);
    return;
  }
  pendingSpellCast = pendingSpellCast === spell.id ? null : spell.id;
  renderBattle();
}

function castSpellAndRender(spellId, targetId) {
  const side = playerBattleSide();
  const result = castSpell(battleState, side, spellId, targetId);
  pendingSpellCast = null;
  if (result) {
    stepBattleAuto(); // renders the post-cast state first, see stepBattleAuto's own comment
    showEffect({ kind: 'spell', result });
  } else {
    renderBattle();
  }
}

function renderTurnOrder(state) {
  const bar = $('battle-turn-order');
  bar.innerHTML = '';
  const alive = state.stacks.filter((s) => s.count > 0);
  const sorted = [...alive].sort((a, b) => getCreature(b.creatureTypeId).speed - getCreature(a.creatureTypeId).speed);
  for (const s of sorted) {
    const creature = getCreature(s.creatureTypeId);
    const chip = document.createElement('div');
    chip.className = 'turn-chip side-' + s.side + (s.id === state.activeStackId ? ' active' : '');
    chip.title = creature.name;
    chip.innerHTML = `<img src="${spritePath(creature.spriteId)}" alt="" width="20" height="20">`;
    chip.addEventListener('click', () => openCreatureCardDialog(creature.id));
    bar.appendChild(chip);
  }
}

function renderBattleMap(state) {
  const svg = $('battle-map');
  svg.innerHTML = '';
  const terrainFill = addTerrainDefs(svg);
  addSpotlightGradientDef(svg);
  const allHexes = rectHexes(state.width, state.height);
  const { positions, width, height } = layoutHexes(allHexes, BATTLE_HEX_SIZE);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  // #battle-effects sits on top of this SVG (same coordinate space, kept
  // in sync here) but is deliberately never cleared by a render — see its
  // own CSS comment for why (in-flight effect animations would otherwise
  // get destroyed by any unrelated stack's turn causing a re-render).
  $('battle-effects').setAttribute('viewBox', `0 0 ${width} ${height}`);

  const active = getStack(state, state.activeStackId);
  const isPlayerTurn = active && battleSideOwner(active.side) === 'player';
  const reachable = isPlayerTurn ? new Set(reachableHexes(state, active.id).map(key)) : new Set();

  const wallHexes = [];
  for (const hex of allHexes) {
    const pos = positions.get(key(hex));
    const inRange = reachable.has(key(hex));
    const isWall = isObstacleHex(state, hex);
    const isCatapultTarget = pendingCatapultTarget && isWall;
    const points = hexCorners(pos.x, pos.y, BATTLE_HEX_SIZE - 1);
    const poly = svgEl('polygon', {
      points, class: 'hex-tile' + (isWall ? ' obstacle' : ''),
      fill: isWall ? terrainFill('stone') : terrainFill('grass'),
    });
    poly.addEventListener('click', () => handleBattleHexClick(hex));
    svg.appendChild(poly);
    if (isCatapultTarget) {
      svg.appendChild(svgEl('polygon', { points, class: 'hex-tile-tint catapult-target' }));
    } else if (inRange) {
      svg.appendChild(svgEl('polygon', { points, class: 'hex-tile-tint in-range' }));
    }
    if (isWall) wallHexes.push({ hex, pos });
  }

  // Spotlight (pinoy-board's CombatScreen technique): a warm glow behind
  // whichever stack is currently active, so it's easy to spot at a glance
  // whose turn it is even before reading the "Your turn"/"AI's turn" pill.
  // Drawn right after the ground tiles and before every sprite/decor
  // layer so it reads as ground-level light, not an overlay hiding
  // anything on top of it.
  if (active) {
    const pos = positions.get(key(active.position));
    if (pos) {
      const r = BATTLE_HEX_SIZE * 2.2;
      svg.appendChild(svgEl('circle', {
        cx: pos.x, cy: pos.y, r, class: 'battle-spotlight', fill: 'url(#battle-spotlight-gradient)',
      }));
    }
  }

  // Wall-segment sprites, slightly oversized so consecutive wall hexes
  // (same column, adjacent rows) read as one continuous wall rather than
  // separate tiles with gaps. Not click-interactive — the hex-tile
  // polygon underneath already handles clicks (including catapult
  // targeting), same pointer-events: none rationale as .battle-stack-sprite.
  const WALL_SPRITE_SIZE = BATTLE_HEX_SIZE * 1.5;
  for (const { pos } of wallHexes) {
    svg.appendChild(svgEl('image', {
      href: spritePath('wall-segment'),
      x: pos.x - WALL_SPRITE_SIZE / 2,
      y: pos.y - WALL_SPRITE_SIZE / 2,
      width: WALL_SPRITE_SIZE, height: WALL_SPRITE_SIZE,
      class: 'battle-decor-sprite',
    }));
  }

  // The catapult (specs/004-siege-battlefield) is flavor only — not a
  // targetable/positioned unit (spec.md Non-goals) — shown once at a
  // fixed spot behind the attacker's own edge whenever the battle is a
  // siege, regardless of which side the player controls.
  if (battleContext?.isSiege) {
    const catapultPos = positions.get(key({ q: 0, r: SIEGE_GATE_ROW }));
    if (catapultPos) {
      const size = BATTLE_HEX_SIZE * 1.8;
      svg.appendChild(svgEl('image', {
        href: spritePath('catapult'),
        x: catapultPos.x - size / 2,
        y: catapultPos.y - size / 2,
        width: size, height: size,
        class: 'battle-decor-sprite',
      }));
    }
  }

  const pendingSpell = pendingSpellCast ? SPELLS.find((s) => s.id === pendingSpellCast) : null;

  // Full-body sprites render much larger than their hex (pinoy-board's
  // CombatToken renders ~1.6-2x its tile and lets it overflow into
  // neighboring tiles, rather than containing it) — deliberately
  // oversized and overflowing, anchored so the character's feet sit near
  // the hex center rather than the sprite's own bounding-box center.
  const STACK_SPRITE_SIZE = BATTLE_HEX_SIZE * 3.2;
  const STACK_SPRITE_ANCHOR = 0.62; // fraction of height above the hex center

  // Two passes: every sprite first, then every ring/label. Oversized,
  // vertically-overlapping sprites (e.g. two stacks in adjacent rows)
  // would otherwise cover a neighboring stack's own ring/count label if
  // interleaved single-pass — this guarantees rings/labels always render
  // above every sprite, not just their own.
  //
  // Sprite draw order is also depth-sorted by screen y (painter's
  // algorithm), not left as raw attacker-then-defender array order —
  // otherwise whichever side happens to come second in state.stacks
  // always buries the other's sprite whenever stacks end up crowded
  // together (e.g. several stacks converging on the same corner after a
  // few rounds of movement), regardless of which one is actually
  // "in front" on screen. Sorting by y means the stack positioned lower
  // on the map (closer to the viewer) is the one drawn on top, so
  // overlap reads as normal depth rather than an arbitrary stack going
  // missing.
  const liveStacks = state.stacks
    .filter((s) => s.count > 0 && positions.get(key(s.position)))
    .sort((a, b) => positions.get(key(a.position)).y - positions.get(key(b.position)).y);

  for (const stack of liveStacks) {
    const pos = positions.get(key(stack.position));
    const creature = getCreature(stack.creatureTypeId);
    // Oversized sprites overlap neighboring hexes, so they must not
    // intercept clicks meant for those hexes — pointer-events: none
    // (CSS) lets every click fall through to the actual hex polygon
    // underneath, which already routes clicks (including attacks/spell
    // targets) by hex coordinate regardless of which element is on top.
    const image = svgEl('image', {
      href: spritePath(creature.spriteId),
      x: pos.x - STACK_SPRITE_SIZE / 2,
      y: pos.y - STACK_SPRITE_SIZE * STACK_SPRITE_ANCHOR,
      width: STACK_SPRITE_SIZE, height: STACK_SPRITE_SIZE,
      class: 'battle-stack-sprite',
      'data-stack-id': stack.id,
    });
    // Every creature's own art faces right (the attacker's side, which
    // starts on the map's left edge facing the defender on the right —
    // see images/creatures/*.png). The defender starts on the right edge
    // facing the opposite way, so their sprites need a horizontal mirror
    // to actually face the attacker instead of facing off the edge of the
    // battlefield. Wrapped in its own <g> (mirrored around the sprite's
    // own hex-center x, not the whole SVG's origin) rather than flipping
    // the <image> directly with a CSS class, so this static per-side flip
    // can never be clobbered by the stack-hit/stack-lunge CSS animations
    // (js/main.js's flashStackSprite) — those set `transform` on the
    // <image> itself for their own shake/scale keyframes, which would
    // silently override (not compose with) a flip living on that same
    // element and CSS property.
    if (stack.side === 'defender') {
      const g = svgEl('g', { transform: `translate(${pos.x}, 0) scale(-1, 1) translate(${-pos.x}, 0)` });
      g.appendChild(image);
      svg.appendChild(g);
    } else {
      svg.appendChild(image);
    }
  }

  for (const stack of liveStacks) {
    const pos = positions.get(key(stack.position));
    const owner = battleSideOwner(stack.side);
    const ringClass = owner === 'player' ? 'owner-player' : owner === 'ai' ? 'owner-ai' : 'owner-neutral';
    const isSpellTarget = pendingSpell && active
      && (pendingSpell.target === 'singleAlly' ? stack.side === active.side : stack.side !== active.side);

    svg.appendChild(svgEl('circle', {
      cx: pos.x, cy: pos.y, r: BATTLE_HEX_SIZE - 3,
      class: 'owner-ring ' + ringClass + (stack.id === state.activeStackId ? ' hero-ring' : '') + (isSpellTarget ? ' spell-target' : ''),
    }));

    const label = svgEl('text', {
      x: pos.x, y: pos.y + BATTLE_HEX_SIZE - 4, class: 'stack-count-label', 'text-anchor': 'middle',
    });
    label.textContent = stack.count;
    svg.appendChild(label);
  }

  battleMapPositions = positions;
  battleMapHexSize = BATTLE_HEX_SIZE;
}

// ==================================================================
// BATTLE VISUAL EFFECTS (pinoy-board CombatScreen technique, adapted from
// HTML/React to this project's plain SVG battle map: a themed icon flies
// from attacker to target and pops on arrival, a floating "-12"/"+8"
// number drifts up from the point of impact, and the target/attacker
// sprites get a brief hit-flash/lunge reaction — see AttackEffect.tsx and
// index.css's float-up/attack-effect-flight keyframes in that project).
// Appended directly into the already-rendered #battle-map SVG rather than
// threaded through renderBattleMap's own render pass, since these fire
// *after* a render (see stepBattleAuto/castSpellAndRender/
// handleBattleHexClick's call sites) so they aren't immediately wiped out
// by the innerHTML = '' reset every render does.
// ==================================================================

// Pixel position for a hex, from the last render's own position map. Takes
// a plain {q,r} hex (not a stack id + battleState lookup) deliberately —
// attackStack/castSpell's results already carry each stack's hex directly
// (see their own comments in battle.js) precisely so this never has to
// read anything back out of battleState, which a killing blow can null
// out (via finishBattleIfOver) before this ever runs.
function hexPixelPos(hex) {
  if (!hex || !battleMapPositions) return null;
  return battleMapPositions.get(key(hex));
}

function flashStackSprite(stackId, className, durationMs) {
  const el = $('battle-map').querySelector(`.battle-stack-sprite[data-stack-id="${stackId}"]`);
  if (!el) return;
  el.classList.remove(className); // restart the animation if it's still running from a prior hit
  void el.getBoundingClientRect(); // force reflow so re-adding the class below re-triggers the animation
  el.classList.add(className);
  setTimeout(() => el.classList.remove(className), durationMs);
}

// Owner feedback: the effects felt too fast at their original speed —
// every duration below is 3x its original value (and css/styles.css's
// matching keyframe animation-durations are scaled the same 3x, since
// each setTimeout here just controls how long an element stays in the
// DOM before removal, not the animation's own pacing).
const EFFECT_SPEED = 3;
const FLIGHT_MS = 480 * EFFECT_SPEED;
const FLOAT_MS = 900 * EFFECT_SPEED;
const LUNGE_MS = 240 * EFFECT_SPEED;
const HIT_MS = 420 * EFFECT_SPEED;
const HEAL_MS = 500 * EFFECT_SPEED;
// Owner feedback: the damage number/hit-flash landed before the flying
// icon visually reached its target, and (for retaliation) the return
// volley launched while the first icon was still mid-flight — both read
// as "the attack effects aren't synced" / "can't tell where it came
// from". battle-attack-flight (css/styles.css) reaches ~92% of the
// distance by its 70% keyframe and finishes popping/fading by 100%, so
// "impact" is derived from FLIGHT_MS itself (~75% of it) instead of being
// an unrelated fixed delay that happened to only roughly line up at one
// specific EFFECT_SPEED. Retaliation now waits for the full flight to
// finish before its own return-flight starts, so the two never overlap —
// attack lands, *then* the retaliating stack's volley flies back.
const IMPACT_DELAY_MS = Math.round(FLIGHT_MS * 0.75);
const REST_OF_FLIGHT_MS = FLIGHT_MS - IMPACT_DELAY_MS;

// Serializes every attack/spell effect (see showEffect below) so two
// actions landing close together in game time — a retaliation right after
// the original hit, or an unrelated follow-up attack from the next
// stack's own turn — never animate on top of each other. Without this,
// "attack flies out" and "damage lands" could visually interleave between
// two different, unrelated attacks, which is exactly what read as
// "unsynced"/"can't tell where it came from": queueEffectStep chains each
// phase onto a shared promise, so a queued step's callback only fires
// once every previously queued step has fully finished playing out.
let effectChain = Promise.resolve();
function queueEffectStep(playFn, holdMs) {
  effectChain = effectChain.then(() => new Promise((resolve) => {
    playFn();
    setTimeout(resolve, holdMs);
  }));
}

function spawnFloatingNumber(pos, text, kind) {
  if (!pos) return;
  const el = svgEl('text', {
    x: pos.x, y: pos.y - battleMapHexSize * 0.8, 'text-anchor': 'middle',
    class: 'battle-float battle-float--' + kind,
  });
  el.textContent = text;
  $('battle-effects').appendChild(el);
  setTimeout(() => el.remove(), FLOAT_MS);
}

// Emoji-text version — still used for spell effects (showSpellEffect
// below), which aren't tied to any one creature.
function spawnFlightEffect(fromPos, toPos, icon) {
  if (!fromPos || !toPos) return;
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  const el = svgEl('text', {
    x: fromPos.x, y: fromPos.y, 'text-anchor': 'middle', 'dominant-baseline': 'central',
    class: 'battle-attack-flight',
    style: `--fx-dx:${dx}px; --fx-dy:${dy}px;`,
  });
  el.textContent = icon;
  $('battle-effects').appendChild(el);
  setTimeout(() => el.remove(), FLIGHT_MS);
}

// Image version — one themed sprite per creature (js/sprites.js's
// ATTACK_SPRITES, e.g. the wolf's claws or the dragon's fire breath)
// instead of a generic sword/bow emoji, so an attack visually reads as
// "that specific creature's attack" rather than a stand-in icon. Same
// flight/pop keyframe as the emoji version (battle-attack-flight doesn't
// care what kind of element it's animating), just built as an <image>.
const ATTACK_ICON_SIZE_MULT = 1.7; // relative to battleMapHexSize
function spawnFlightImage(fromPos, toPos, creatureTypeId) {
  if (!fromPos || !toPos) return;
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  const size = battleMapHexSize * ATTACK_ICON_SIZE_MULT;
  const el = svgEl('image', {
    href: spritePath('attack-' + creatureTypeId),
    x: fromPos.x - size / 2, y: fromPos.y - size / 2, width: size, height: size,
    class: 'battle-attack-flight',
    style: `--fx-dx:${dx}px; --fx-dy:${dy}px;`,
  });
  $('battle-effects').appendChild(el);
  setTimeout(() => el.remove(), FLIGHT_MS);
}

const SPELL_ICON = { damage: '🔥', heal: '✨', buff: '⬆️', debuff: '⬇️' };

function showAttackEffect(result) {
  const {
    attackerId, targetId, attackerHex, targetHex, attackerCreatureTypeId, targetCreatureTypeId,
    damage, targetDied, retaliation,
  } = result;
  const fromPos = hexPixelPos(attackerHex);
  const toPos = hexPixelPos(targetHex);

  // Phase 1: the icon flies out (lunge fires with it, not queued — it's
  // the attacker's own reaction, not something that needs to "land").
  queueEffectStep(() => {
    spawnFlightImage(fromPos, toPos, attackerCreatureTypeId);
    flashStackSprite(attackerId, 'stack-lunge', LUNGE_MS);
  }, IMPACT_DELAY_MS);
  // Phase 2: only once the icon has visually arrived does the damage
  // number/hit-flash appear, and only once that's held on screen for the
  // rest of the flight's natural duration does anything queued after this
  // (retaliation, or a completely different attack) get to start.
  queueEffectStep(() => {
    spawnFloatingNumber(toPos, `-${damage}`, 'dmg');
    if (!targetDied) flashStackSprite(targetId, 'stack-hit', HIT_MS);
  }, REST_OF_FLIGHT_MS);

  if (retaliation) {
    // The retaliator is whichever stack was on the receiving end of the
    // original attack, so its own attack sprite (not the original
    // attacker's) is what flies back — targetCreatureTypeId, not
    // attackerCreatureTypeId.
    queueEffectStep(() => {
      spawnFlightImage(toPos, fromPos, targetCreatureTypeId);
    }, IMPACT_DELAY_MS);
    queueEffectStep(() => {
      spawnFloatingNumber(fromPos, `-${retaliation.damage}`, 'dmg');
      if (!retaliation.attackerDied) flashStackSprite(attackerId, 'stack-hit', HIT_MS);
    }, REST_OF_FLIGHT_MS);
  }
}

function showSpellEffect(result) {
  const spell = SPELLS.find((s) => s.id === result.spellId);
  if (!spell) return;
  const fromPos = hexPixelPos(result.casterHex);
  const icon = SPELL_ICON[spell.effect] || SPELL_ICON.damage;

  // A spell's targets (e.g. "all enemies") were all struck by the same
  // cast at the same instant, so they fly out and land together as one
  // queued step each — only the spell as a *whole* is serialized against
  // other, unrelated actions, the same way a single attack is above.
  queueEffectStep(() => {
    for (const target of result.targets) spawnFlightEffect(fromPos, hexPixelPos(target.hex), icon);
  }, IMPACT_DELAY_MS);
  queueEffectStep(() => {
    for (const target of result.targets) {
      const toPos = hexPixelPos(target.hex);
      if (spell.effect === 'damage') {
        spawnFloatingNumber(toPos, `-${spell.power}`, 'dmg');
        flashStackSprite(target.id, 'stack-hit', HIT_MS);
      } else if (spell.effect === 'heal') {
        spawnFloatingNumber(toPos, `+${spell.power}`, 'heal');
        flashStackSprite(target.id, 'stack-heal', HEAL_MS);
      } else {
        const buffed = spell.amount > 0;
        spawnFloatingNumber(toPos, `${buffed ? '+' : ''}${spell.amount} ${spell.stat}`, buffed ? 'buff' : 'debuff');
      }
    }
  }, REST_OF_FLIGHT_MS);
}

function showEffect({ kind, result }) {
  if (kind === 'attack') showAttackEffect(result);
  else showSpellEffect(result);
}

function handleBattleHexClick(hex) {
  if (!battleState || battleState.phase !== 'battle') return;
  const active = getStack(battleState, battleState.activeStackId);
  if (!active || battleSideOwner(active.side) !== 'player') return;

  if (pendingCatapultTarget) {
    if (!isObstacleHex(battleState, hex)) return; // must click a standing wall hex
    const ok = attackWall(battleState, playerBattleSide(), hex);
    pendingCatapultTarget = false;
    if (ok) stepBattleAuto();
    else renderBattle();
    return;
  }

  const targetStack = battleState.stacks.find((s) => s.count > 0 && equals(s.position, hex));

  if (pendingSpellCast) {
    const spell = SPELLS.find((s) => s.id === pendingSpellCast);
    if (!targetStack) return;
    const wantsAlly = spell.target === 'singleAlly';
    if (wantsAlly !== (targetStack.side === active.side)) return; // wrong side for this spell
    castSpellAndRender(spell.id, targetStack.id);
    return;
  }

  let acted = false;
  let attackResult = null;
  if (targetStack && targetStack.side !== active.side) {
    attackResult = attackStack(battleState, active.id, targetStack.id);
    acted = !!attackResult;
  } else if (!targetStack) {
    acted = moveStack(battleState, active.id, hex);
  }
  if (acted) {
    stepBattleAuto(); // renders the post-action state first, see stepBattleAuto's own comment
    if (attackResult) showEffect({ kind: 'attack', result: attackResult });
  }
}

$('btn-battle-wait').addEventListener('click', () => {
  if (!battleState) return;
  const active = getStack(battleState, battleState.activeStackId);
  if (!active || battleSideOwner(active.side) !== 'player') return;
  waitStack(battleState, active.id);
  stepBattleAuto();
});

$('btn-battle-defend').addEventListener('click', () => {
  if (!battleState) return;
  const active = getStack(battleState, battleState.activeStackId);
  if (!active || battleSideOwner(active.side) !== 'player') return;
  defendStack(battleState, active.id);
  stepBattleAuto();
});

// ==================================================================
// GAME OVER
// ==================================================================
function showGameOver() {
  showScreen('screen-gameover');
  const state = adventureState;
  const title = $('gameover-title');
  const reason = $('gameover-reason');
  if (state.winner === null) {
    title.textContent = "It's a draw!";
  } else {
    const heroType = getFaction(state.heroes[state.winner].heroTypeId);
    const who = state.winner === 'player' ? 'You' : `The AI (${heroType.name})`;
    title.textContent = `${who} win${state.winner === 'player' ? '' : 's'}!`;
  }
  reason.textContent = state.winReason === 'combat'
    ? `Decided by direct combat — the loser's hero was defeated ${state.defeatsToWin} times.`
    : state.winReason === 'finalBattle'
      ? `Day ${state.dayLimit} reached — decided by a final battle instead of Kingdom Score.`
      : `Day ${state.dayLimit} reached — decided by Kingdom Score.`;

  const scores = $('gameover-scores');
  scores.innerHTML = '';
  for (const owner of ['player', 'ai']) {
    const label = owner === 'player' ? 'You' : 'AI';
    const b = kingdomScoreBreakdown(state, owner);
    const div = document.createElement('div');
    div.className = 'final-score-owner';
    div.innerHTML = `
      <div class="final-score-total">${label}: ${b.total} pts</div>
      <div class="final-score-detail">${b.mines} mines + ${b.castle} castle + ${b.army} army</div>
    `;
    scores.appendChild(div);
  }
}

$('btn-play-again').addEventListener('click', () => {
  adventureState = null;
  battleState = null;
  battleContext = null;
  aiDayInProgress = false;
  renderHeroTypeCards();
  showScreen('screen-setup');
});

showScreen('screen-home');
