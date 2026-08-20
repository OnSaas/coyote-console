const KEY = "coyote.waves.user";

export type UserWave = {
  id: string;
  name: string;
  source: "pulse" | "zip";
  fileName?: string;
  rawPulse: string;
  frames: string[];
  durationMs: number;
  importedAt: number;
};

export function loadUserWaves(): UserWave[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserWave[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveUserWaves(list: UserWave[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function upsertWave(list: UserWave[], wave: UserWave): UserWave[] {
  const next = [wave, ...list.filter((w) => w.id !== wave.id)];
  saveUserWaves(next);
  return next;
}

export function removeWave(list: UserWave[], id: string): UserWave[] {
  const next = list.filter((w) => w.id !== id);
  saveUserWaves(next);
  return next;
}

export function renameWave(
  list: UserWave[],
  id: string,
  name: string,
): UserWave[] {
  const next = list.map((w) => (w.id === id ? { ...w, name } : w));
  saveUserWaves(next);
  return next;
}
