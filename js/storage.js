// localStorage persistence for last-picked setup choices, matching every
// sibling game's pattern (spec.md FR-5). v1 has no save/resume for an
// in-progress game — only this one preference persists.

const SETTINGS_KEY = 'hexheroes.settings.v1';

export const DEFAULT_SETTINGS = {
  heroTypeId: 'human',
  legendCollapsed: false,
  defeatsToWin: 3, // keep in sync with adventure.js's HERO_DEFEATS_TO_LOSE
  aiCount: 1, // specs/009-multi-ai-opponents — 1-3 AI opponents
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // storage full/blocked — the game still works for this session
  }
}
