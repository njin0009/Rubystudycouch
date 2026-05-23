export const PALETTES = {
  ruby:    { bg: '#F6EEDC', ink: '#2A1F18', accent: '#A0182B', yellow: '#F2C94C', green: '#6B8E5A', pink: '#F0A3A3', paper: '#FFFBF1' },
  citrus:  { bg: '#FFF6E5', ink: '#1F1A12', accent: '#E26D29', yellow: '#F5D85B', green: '#5B8E5C', pink: '#E89A8B', paper: '#FFFCF2' },
  midnight:{ bg: '#181A20', ink: '#F2EDE0', accent: '#FFB257', yellow: '#E8D77D', green: '#7DB28B', pink: '#E89AB8', paper: '#23252D' },
  garden:  { bg: '#EFE9D9', ink: '#1C2418', accent: '#3F6B3A', yellow: '#E8C95E', green: '#3F6B3A', pink: '#D88A8A', paper: '#FAF6E9' },
} as const;

export type PaletteId = keyof typeof PALETTES;
export type Palette = (typeof PALETTES)[PaletteId];

export const PALETTE_STORAGE_KEY = 'studycouch_palette';

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function applyPalette(p: Palette) {
  const root = document.documentElement;
  const isDark = luminance(p.bg) < 0.35;
  const set = (name: string, val: string) => root.style.setProperty(name, val);

  set('--bg', p.bg);
  set('--surface', p.paper);
  set('--surface2', isDark ? rgba('#ffffff', 0.06) : rgba(p.ink, 0.06));
  set('--border', isDark ? rgba('#ffffff', 0.2) : rgba(p.ink, 0.2));
  set('--border2', isDark ? rgba('#ffffff', 0.36) : rgba(p.ink, 0.36));
  set('--ink', p.ink);
  set('--ink2', rgba(p.ink, 0.72));
  set('--ink3', rgba(p.ink, 0.46));
  set('--ruby', p.accent);
  set('--amber', p.yellow);
  set('--amber-lt', rgba(p.yellow, 0.18));
  set('--amber-md', rgba(p.yellow, 0.45));
  set('--teal', p.green);
  set('--teal-lt', rgba(p.green, 0.15));
  set('--rose', p.accent);
  set('--rose-lt', rgba(p.accent, 0.1));
  set('--correct', p.green);
  set('--correct-lt', rgba(p.green, 0.15));
  set('--wrong', p.accent);
  set('--wrong-lt', rgba(p.accent, 0.1));
  set('--slate', p.ink);
  set('--slate-lt', isDark ? rgba('#ffffff', 0.06) : rgba(p.ink, 0.06));
  set('--shadow', `4px 5px 0 ${p.ink}`);
  set('--shadow-md', `5px 7px 0 ${p.ink}`);

  document.body.style.background = p.bg;
  document.body.style.color = p.ink;
}

export function getSavedPalette(): PaletteId {
  try {
    const saved = localStorage.getItem(PALETTE_STORAGE_KEY);
    if (saved && saved in PALETTES) return saved as PaletteId;
  } catch { /* noop */ }
  return 'ruby';
}

export function savePalette(id: PaletteId) {
  try { localStorage.setItem(PALETTE_STORAGE_KEY, id); } catch { /* noop */ }
}
