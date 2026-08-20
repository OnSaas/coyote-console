import { useCallback, useState } from "react";
import { parsePulseText } from "../lib/pulse/parse";
import {
  loadUserWaves,
  removeWave,
  renameWave,
  upsertWave,
  type UserWave,
} from "../lib/pulse/store";
import { extractPulseFiles } from "../lib/pulse/zip";

export function useUserWaves() {
  const [waves, setWaves] = useState<UserWave[]>(() =>
    typeof window === "undefined" ? [] : loadUserWaves(),
  );

  const importFiles = useCallback(async (files: FileList | File[]) => {
    const ok: UserWave[] = [];
    const fail: string[] = [];
    const list = Array.from(files);

    for (const file of list) {
      const lower = file.name.toLowerCase();
      try {
        if (lower.endsWith(".zip") || file.type.includes("zip")) {
          const items = await extractPulseFiles(file);
          for (const item of items) {
            try {
              ok.push(buildWave(item.text, item.name, "zip", file.name));
            } catch (e) {
              fail.push(`${item.name}.pulse ${reason(e)}`);
            }
          }
        } else {
          const text = await file.text();
          const name = file.name.replace(/\.pulse$/i, "");
          ok.push(buildWave(text, name, "pulse", file.name));
        }
      } catch (e) {
        fail.push(`${file.name} ${reason(e)}`);
      }
    }

    if (ok.length) {
      setWaves((prev) => {
        let next = prev;
        for (const w of ok) next = upsertWave(next, w);
        return next;
      });
    }
    return { ok: ok.length, fail };
  }, []);

  const remove = useCallback((id: string) => {
    setWaves((prev) => removeWave(prev, id));
  }, []);

  const rename = useCallback((id: string, name: string) => {
    setWaves((prev) => renameWave(prev, id, name));
  }, []);

  return { waves, importFiles, remove, rename };
}

function buildWave(
  text: string,
  fallbackName: string,
  source: UserWave["source"],
  fileName: string,
): UserWave {
  const parsed = parsePulseText(text, fallbackName);
  return {
    id: crypto.randomUUID(),
    name: parsed.name,
    source,
    fileName,
    rawPulse: text,
    frames: parsed.frames,
    durationMs: parsed.durationMs,
    importedAt: Date.now(),
  };
}

function reason(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
