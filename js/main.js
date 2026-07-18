import { key, equals, axialToPixel, rectHexes, distance as hexDistance } from './hexgrid.js';
import { RESOURCES } from './resources.js';
import { getCreature } from './creatures.js';
import { HERO_TYPES, getHeroType } from './heroTypes.js';
import { spritePath } from './sprites.js';
import {
  createAdventure, moveHero, endDay, kingdomScore, getPendingBattleArmies,
  resolveBattleOutcome, planMoveTowards,
} from './adventure.js';
import {
  createBattle, getStack, moveStack, attackStack, waitStack, defendStack,
  reachableHexes, survivingStacks,
} from './battle.js';
import { aiSelectTarget, aiChooseBattleMove, aiChooseBattleAttack } from './ai.js';
import { loadSettings, saveSettings } from './storage.js';

const $ = (id) => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';

const SCREENS = ['screen-home', 'screen-setup', 'screen-adventure', 'screen-battle', 'screen-gameover'];
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

// ==================================================================
// HOME / SETUP
// ==================================================================
$('btn-how-to-play').addEventListener('click', () => $('dialog-how-to-play').showModal());
$('btn-close-how-to-play').addEventListener('click', () => $('dialog-how-to-play').close());

$('btn-new-game').addEventListener('click', () => {
  renderHeroTypeCards();
  showScreen('screen-setup');
});
$('btn-setup-back').addEventListener('click', () => showScreen('screen-home'));

function renderHeroTypeCards() {
  const container = $('hero-type-cards');
  container.innerHTML = '';
  for (const heroType of HERO_TYPES) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'hero-type-card' + (heroType.id === selectedHeroTypeId ? ' selected' : '');
    const armySummary = heroType.startingArmy
      .map((s) => `${s.count} ${getCreature(s.creatureTypeId).name}`)
      .join(', ');
    card.innerHTML = `
      <img src="${spritePath(heroType.spriteId)}" alt="" width="48" height="48">
      <h3>${heroType.name}</h3>
      <p class="hero-type-stats">ATK ${heroType.attack} / DEF ${heroType.defense}</p>
      <p class="hero-type-army">${armySummary}</p>
    `;
    card.addEventListener('click', () => {
      selectedHeroTypeId = heroType.id;
      renderHeroTypeCards();
    });
    container.appendChild(card);
  }
}

$('btn-start-game').addEventListener('click', () => {
  settings = { heroTypeId: selectedHeroTypeId };
  saveSettings(settings);
  const otherTypes = HERO_TYPES.filter((h) => h.id !== selectedHeroTypeId);
  const aiHeroTypeId = otherTypes[Math.floor(Math.random() * otherTypes.length)].id;
  adventureState = createAdventure(selectedHeroTypeId, aiHeroTypeId);
  aiDayInProgress = false;
  showScreen('screen-adventure');
  renderAdventure();
});

// ==================================================================
// ADVENTURE MAP
// ==================================================================
const ADV_HEX_SIZE = 26;

function renderAdventure() {
  const state = adventureState;
  $('adv-day').textContent = state.day;
  $('adv-day-limit').textContent = state.dayLimit;
  $('adv-moves').textContent = state.heroes.player.movementLeft;
  $('adv-hero-name').textContent = getHeroType(state.heroes.player.heroTypeId).name;
  $('adv-hero-level').textContent = state.heroes.player.level;

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
    li.innerHTML = `<img src="${spritePath(creature.spriteId)}" alt="" width="22" height="22"> ${creature.name} x${stack.count}`;
    list.appendChild(li);
  }
}

function renderAdventureMap() {
  const state = adventureState;
  const svg = $('adv-map');
  svg.innerHTML = '';
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
    const poly = svgEl('polygon', {
      points: hexCorners(pos.x, pos.y, ADV_HEX_SIZE - 1),
      class: 'hex-tile' + (inRange ? ' in-range' : ''),
    });
    poly.addEventListener('click', () => handleAdventureHexClick(hex));
    svg.appendChild(poly);

    if (occupant) {
      const iconSize = ADV_HEX_SIZE * 1.1;
      const img = svgEl('image', {
        href: spritePath(occupant.spriteId),
        x: pos.x - iconSize / 2,
        y: pos.y - iconSize / 2,
        width: iconSize,
        height: iconSize,
        class: 'hex-object-icon',
      });
      img.addEventListener('click', () => handleAdventureHexClick(hex));
      svg.appendChild(img);
      if (occupant.ownerId) {
        const ring = svgEl('circle', {
          cx: pos.x, cy: pos.y, r: ADV_HEX_SIZE - 3, class: `owner-ring owner-${occupant.ownerId}`,
        });
        svg.appendChild(ring);
      }
    }
  }

  for (const owner of ['player', 'ai']) {
    const hero = state.heroes[owner];
    const pos = positions.get(key(hero.position));
    if (!pos) continue;
    const heroType = getHeroType(hero.heroTypeId);
    const size = ADV_HEX_SIZE * 1.3;
    svg.appendChild(svgEl('circle', { cx: pos.x, cy: pos.y, r: ADV_HEX_SIZE - 2, class: `owner-ring owner-${owner} hero-ring` }));
    svg.appendChild(svgEl('image', {
      href: spritePath(heroType.spriteId), x: pos.x - size / 2, y: pos.y - size / 2, width: size, height: size,
    }));
  }
}

function handleAdventureHexClick(hex) {
  if (!adventureState || adventureState.phase !== 'playing' || aiDayInProgress) return;
  const ok = moveHero(adventureState, 'player', hex);
  if (!ok) return;
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
  renderAdventure();
  if (adventureState.phase === 'gameover') showGameOver();
}

// ==================================================================
// BATTLE
// ==================================================================
const BATTLE_HEX_SIZE = 32;

function battleSideOwner(side) {
  if (!battleContext) return null;
  return side === 'attacker' ? battleContext.attackerOwner : battleContext.defenderOwner;
}

function startBattleFromPending() {
  const pending = adventureState.pendingBattle;
  const armies = getPendingBattleArmies(adventureState);
  battleContext = {
    attackerOwner: pending.attackerOwner,
    defenderOwner: pending.defenderKind === 'hero' ? pending.defenderOwner : null,
  };
  battleState = createBattle(armies.attackerArmy, armies.defenderArmy, armies.attackerBonus, armies.defenderBonus);
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
    playAiBattleTurn(battleState, active.id);
    stepBattleAuto();
  }, 380);
}

function playAiBattleTurn(state, stackId) {
  const moveDecision = aiChooseBattleMove(state, stackId);
  if (moveDecision) moveStack(state, stackId, moveDecision.targetHex);
  if (state.activeStackId === stackId && state.phase === 'battle') {
    const atk = aiChooseBattleAttack(state, stackId);
    if (atk) attackStack(state, stackId, atk.targetId);
    else waitStack(state, stackId);
  }
}

function finishBattleIfOver() {
  if (!battleState || battleState.phase !== 'over') return;
  const winnerSide = battleState.winnerSide;
  const survivors = survivingStacks(battleState, winnerSide);
  resolveBattleOutcome(adventureState, winnerSide, survivors);
  battleState = null;
  battleContext = null;

  if (adventureState.phase === 'gameover') {
    showGameOver();
    return;
  }
  showScreen('screen-adventure');
  renderAdventure();
  if (aiDayInProgress) continueAiDay();
}

function autoResolveNeutralBattle() {
  const pending = adventureState.pendingBattle;
  const armies = getPendingBattleArmies(adventureState);
  const context = {
    attackerOwner: pending.attackerOwner,
    defenderOwner: null,
  };
  const bs = createBattle(armies.attackerArmy, armies.defenderArmy, armies.attackerBonus, armies.defenderBonus);
  let guard = 0;
  while (bs.phase === 'battle' && guard < 1000) {
    const active = getStack(bs, bs.activeStackId);
    if (!active) break;
    playAiBattleTurn(bs, active.id);
    guard++;
  }
  const survivors = survivingStacks(bs, bs.winnerSide || 'attacker');
  resolveBattleOutcome(adventureState, bs.winnerSide || 'attacker', survivors);
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

  renderTurnOrder(state);
  renderBattleMap(state);

  const controls = $('battle-controls');
  if (active && owner === 'player') {
    controls.hidden = false;
    $('battle-active-label').textContent = `${getCreature(active.creatureTypeId).name} (${active.count})`;
  } else {
    controls.hidden = true;
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
    chip.innerHTML = `<img src="${spritePath(creature.spriteId)}" alt="" width="20" height="20">`;
    bar.appendChild(chip);
  }
}

function renderBattleMap(state) {
  const svg = $('battle-map');
  svg.innerHTML = '';
  const allHexes = rectHexes(state.width, state.height);
  const { positions, width, height } = layoutHexes(allHexes, BATTLE_HEX_SIZE);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const active = getStack(state, state.activeStackId);
  const isPlayerTurn = active && battleSideOwner(active.side) === 'player';
  const reachable = isPlayerTurn ? new Set(reachableHexes(state, active.id).map(key)) : new Set();

  for (const hex of allHexes) {
    const pos = positions.get(key(hex));
    const inRange = reachable.has(key(hex));
    const poly = svgEl('polygon', {
      points: hexCorners(pos.x, pos.y, BATTLE_HEX_SIZE - 1),
      class: 'hex-tile' + (inRange ? ' in-range' : ''),
    });
    poly.addEventListener('click', () => handleBattleHexClick(hex));
    svg.appendChild(poly);
  }

  for (const stack of state.stacks) {
    if (stack.count <= 0) continue;
    const pos = positions.get(key(stack.position));
    if (!pos) continue;
    const creature = getCreature(stack.creatureTypeId);
    const size = BATTLE_HEX_SIZE * 1.1;
    const owner = battleSideOwner(stack.side);
    const ringClass = owner === 'player' ? 'owner-player' : owner === 'ai' ? 'owner-ai' : 'owner-neutral';
    svg.appendChild(svgEl('circle', {
      cx: pos.x, cy: pos.y, r: BATTLE_HEX_SIZE - 3,
      class: 'owner-ring ' + ringClass + (stack.id === state.activeStackId ? ' hero-ring' : ''),
    }));
    const img = svgEl('image', {
      href: spritePath(creature.spriteId), x: pos.x - size / 2, y: pos.y - size / 2, width: size, height: size,
    });
    img.addEventListener('click', () => handleBattleHexClick(stack.position));
    svg.appendChild(img);

    const label = svgEl('text', {
      x: pos.x, y: pos.y + BATTLE_HEX_SIZE - 4, class: 'stack-count-label', 'text-anchor': 'middle',
    });
    label.textContent = stack.count;
    svg.appendChild(label);
  }
}

function handleBattleHexClick(hex) {
  if (!battleState || battleState.phase !== 'battle') return;
  const active = getStack(battleState, battleState.activeStackId);
  if (!active || battleSideOwner(active.side) !== 'player') return;

  const targetStack = battleState.stacks.find((s) => s.count > 0 && equals(s.position, hex));
  let acted = false;
  if (targetStack && targetStack.side !== active.side) {
    acted = attackStack(battleState, active.id, targetStack.id);
  } else if (!targetStack) {
    acted = moveStack(battleState, active.id, hex);
  }
  if (acted) stepBattleAuto();
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
    const heroType = getHeroType(state.heroes[state.winner].heroTypeId);
    const who = state.winner === 'player' ? 'You' : `The AI (${heroType.name})`;
    title.textContent = `${who} win${state.winner === 'player' ? '' : 's'}!`;
  }
  reason.textContent = state.winReason === 'combat'
    ? 'Decided by direct combat between the two heroes.'
    : `Day ${state.dayLimit} reached — decided by Kingdom Score.`;

  const scores = $('gameover-scores');
  scores.innerHTML = '';
  for (const owner of ['player', 'ai']) {
    const span = document.createElement('span');
    const label = owner === 'player' ? 'You' : 'AI';
    span.textContent = `${label}: ${kingdomScore(state, owner)} pts`;
    scores.appendChild(span);
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
