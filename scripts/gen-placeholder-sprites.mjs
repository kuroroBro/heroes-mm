// One-off generator for placeholder SVG sprites (js/sprites.js's lookup
// table). Run with `node scripts/gen-placeholder-sprites.mjs`. Not part
// of the deployed app — just a content-authoring convenience so v1's
// placeholder art is visually consistent without hand-writing ~25 files.
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = '#2b1608';

function iconSvg({ shapeFill, accentFill, label, labelFill = '#1a0d05' }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${label}">
  <rect width="64" height="64" rx="10" fill="${BG}"/>
  <circle cx="32" cy="32" r="20" fill="${shapeFill}" stroke="${accentFill}" stroke-width="3"/>
  <text x="32" y="40" font-family="sans-serif" font-size="20" font-weight="800" fill="${labelFill}" text-anchor="middle">${label}</text>
</svg>
`;
}

function objectSvg(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img">
  <rect width="64" height="64" rx="10" fill="${BG}"/>
  ${inner}
</svg>
`;
}

const objects = {
  'mine-wood': objectSvg('<path fill="#8a5a2e" d="M12 46 L32 14 L52 46 Z"/><rect x="20" y="20" width="6" height="26" fill="#5c3a1a"/><rect x="38" y="20" width="6" height="26" fill="#5c3a1a"/>'),
  'mine-ore': objectSvg('<path fill="#8d8d95" d="M14 46 L24 22 L34 40 L44 18 L54 46 Z"/>'),
  'mine-crystal': objectSvg('<polygon fill="#7ee0e8" stroke="#2e9aa3" stroke-width="2" points="32,10 44,26 38,54 26,54 20,26"/>'),
  'mine-mercury': objectSvg('<circle cx="32" cy="32" r="18" fill="#cfd8dc" stroke="#8a97a0" stroke-width="3"/><circle cx="26" cy="26" r="4" fill="#ffffff"/>'),
  'mine-sulfur': objectSvg('<circle cx="32" cy="32" r="18" fill="#f5e642" stroke="#b8a900" stroke-width="3"/>'),
  'mine-gems': objectSvg('<polygon fill="#ff6fae" stroke="#c02e73" stroke-width="2" points="32,12 48,24 42,52 22,52 16,24"/>'),
  dwelling: objectSvg('<rect x="14" y="30" width="36" height="22" fill="#7a5230"/><polygon fill="#a5673a" points="10,32 32,12 54,32"/><rect x="28" y="38" width="8" height="14" fill="#3a2010"/>'),
  keep: objectSvg('<rect x="16" y="26" width="32" height="26" fill="#9a9a9a"/><rect x="14" y="18" width="8" height="12" fill="#7d7d7d"/><rect x="42" y="18" width="8" height="12" fill="#7d7d7d"/><rect x="28" y="10" width="8" height="16" fill="#7d7d7d"/><rect x="27" y="38" width="10" height="14" fill="#3a2010"/>'),
  treasure: objectSvg('<rect x="14" y="30" width="36" height="18" rx="3" fill="#8a5a2e"/><rect x="14" y="24" width="36" height="10" rx="3" fill="#a5673a"/><circle cx="32" cy="32" r="4" fill="#ffd23f"/>'),
  monster: objectSvg('<circle cx="32" cy="34" r="16" fill="#8a2b2b" stroke="#5c1717" stroke-width="3"/><circle cx="26" cy="30" r="3" fill="#ffe08a"/><circle cx="38" cy="30" r="3" fill="#ffe08a"/>'),
  unknown: objectSvg('<circle cx="32" cy="32" r="18" fill="#5a5a5a" stroke="#333" stroke-width="3"/><text x="32" y="40" font-family="sans-serif" font-size="22" font-weight="800" fill="#eee" text-anchor="middle">?</text>'),
};

const creatures = {
  peasant: { fill: '#c9a876', accent: '#8a6b3f', label: 'P' },
  pikeman: { fill: '#9fb3c8', accent: '#4a5f75', label: 'Pk' },
  archer: { fill: '#7fbf7f', accent: '#3f7a3f', label: 'A' },
  wolf: { fill: '#8a8a8a', accent: '#4a4a4a', label: 'W' },
  orc: { fill: '#7fa15c', accent: '#4a6b32', label: 'O' },
  griffin: { fill: '#e0c78a', accent: '#a5843f', label: 'Gr' },
  ogre: { fill: '#b06a4a', accent: '#7a3f24', label: 'Og' },
  skeleton: { fill: '#e5e5d8', accent: '#8a8a75', label: 'Sk' },
  troll: { fill: '#6b8a5a', accent: '#3f5c32', label: 'T' },
  dragon: { fill: '#c94f4f', accent: '#7a1f1f', label: 'D' },
};

const heroes = {
  'hero-marshal': { fill: '#ffd23f', accent: '#c99a10', label: 'M' },
  'hero-warlord': { fill: '#ff6b4a', accent: '#c9421f', label: 'Wl' },
  'hero-sentinel': { fill: '#4fc3f7', accent: '#1976a3', label: 'S' },
};

mkdirSync('images/objects', { recursive: true });
mkdirSync('images/creatures', { recursive: true });

for (const [name, svg] of Object.entries(objects)) {
  writeFileSync(`images/objects/${name}.svg`, svg);
}
for (const [name, c] of Object.entries(creatures)) {
  writeFileSync(`images/creatures/${name}.svg`, iconSvg({ shapeFill: c.fill, accentFill: c.accent, label: c.label }));
}
for (const [name, c] of Object.entries(heroes)) {
  writeFileSync(`images/creatures/${name}.svg`, iconSvg({ shapeFill: c.fill, accentFill: c.accent, label: c.label }));
}

console.log('Generated', Object.keys(objects).length + Object.keys(creatures).length + Object.keys(heroes).length, 'placeholder sprites.');
