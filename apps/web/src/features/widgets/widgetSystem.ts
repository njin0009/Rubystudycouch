// ── Widget registry & shared state ────────────────────────────────────────────

export interface WidgetDef {
  id: string;
  icon: string;
  title: string;
  desc: string;
  defaultEnabled: boolean;
  defaultOpen: boolean;
  defaultPosition: { x: number; y: number };
}

export const WIDGET_REGISTRY: WidgetDef[] = [
  {
    id: 'timer-sounds',
    icon: '🍅',
    title: 'Focus Timer',
    desc: 'Pomodoro & custom timer with ambient soundscapes.',
    defaultEnabled: true,
    defaultOpen: false,
    defaultPosition: { x: 16, y: 100 },
  },
  {
    id: 'tasks',
    icon: '✅',
    title: 'Task List',
    desc: 'Quick checklist to track your study session.',
    defaultEnabled: true,
    defaultOpen: false,
    defaultPosition: { x: 300, y: 100 },
  },
  {
    id: 'exam-cd',
    icon: '📅',
    title: 'Exam Countdown',
    desc: 'Live countdown to your exam date from your study plan.',
    defaultEnabled: false,
    defaultOpen: false,
    defaultPosition: { x: 580, y: 80 },
  },
  {
    id: 'break',
    icon: '💧',
    title: 'Break Reminder',
    desc: 'Gentle alerts to stretch and hydrate on your schedule.',
    defaultEnabled: true,
    defaultOpen: false,
    defaultPosition: { x: 300, y: 80 },
  },
  {
    id: 'quote',
    icon: '✨',
    title: 'Daily Quote',
    desc: 'A fresh study motivation quote each day.',
    defaultEnabled: false,
    defaultOpen: false,
    defaultPosition: { x: 580, y: 260 },
  },
];

// ── Per-widget config ─────────────────────────────────────────────────────────

export interface WidgetInstance {
  enabled: boolean;
  open: boolean;
  position: { x: number; y: number };
  order: number;       // display order in launcher + profile
}

export type WidgetsConfig = Record<string, WidgetInstance>;

const LS_KEY = 'studycouch_widgets';

function defaultConfig(): WidgetsConfig {
  const cfg: WidgetsConfig = {};
  WIDGET_REGISTRY.forEach((def, i) => {
    cfg[def.id] = {
      enabled: def.defaultEnabled,
      open: def.defaultOpen,
      position: def.defaultPosition,
      order: i,
    };
  });
  return cfg;
}

export function loadWidgetsConfig(): WidgetsConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultConfig();
    const saved = JSON.parse(raw) as WidgetsConfig;
    // Merge: ensure all registry entries exist in saved config
    const merged = defaultConfig();
    for (const id of Object.keys(merged)) {
      if (saved[id]) merged[id] = { ...merged[id], ...saved[id] };
    }
    return merged;
  } catch {
    return defaultConfig();
  }
}

export function saveWidgetsConfig(cfg: WidgetsConfig): void {
  localStorage.setItem(LS_KEY, JSON.stringify(cfg));
}

// Sorted by order field
export function sortedEnabled(cfg: WidgetsConfig): WidgetDef[] {
  return WIDGET_REGISTRY
    .filter(def => cfg[def.id]?.enabled)
    .sort((a, b) => (cfg[a.id]?.order ?? 99) - (cfg[b.id]?.order ?? 99));
}

export function sortedAll(cfg: WidgetsConfig): WidgetDef[] {
  return [...WIDGET_REGISTRY].sort(
    (a, b) => (cfg[a.id]?.order ?? 99) - (cfg[b.id]?.order ?? 99),
  );
}
