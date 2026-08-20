const KEY = "coyote-settings-v1";

export interface Settings {
  aCap: number;
  bCap: number;
  confirmStop: boolean;
  autoSave: boolean;
  askNote: boolean;
  sidebarOpen: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  aCap: 200,
  bCap: 200,
  confirmStop: false,
  autoSave: true,
  askNote: false,
  sidebarOpen: true,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(next: Settings) {
  localStorage.setItem(KEY, JSON.stringify(next));
}
