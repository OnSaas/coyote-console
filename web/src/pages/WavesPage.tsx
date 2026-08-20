import { Button } from "@cloudflare/kumo/components/button";
import { Text } from "@cloudflare/kumo/components/text";
import { useKumoToastManager } from "@cloudflare/kumo/components/toast";
import { useState } from "react";
import { V4Channel } from "../lib/protocol";
import { WAVE_PRESETS, sendPulse } from "../lib/waves";
import { PageHeader } from "../layout/PageHeader";
import { useConsole } from "../state/ConsoleProvider";

export function WavesPage() {
  const { relay, canControl, recorder, requirePaired } = useConsole();
  const toast = useKumoToastManager();
  const [busy, setBusy] = useState<string | null>(null);

  function play(name: string, frames: readonly string[], ch: 0 | 1) {
    if (!requirePaired()) return;
    if (!relay.slotId) return;
    const key = `${name}-${ch}`;
    setBusy(key);
    const ok = relay.sendRpc(
      sendPulse(relay.slotId, ch === 0 ? V4Channel.A : V4Channel.B, [...frames], 5000),
    );
    if (ok) {
      recorder.markWave(name);
      toast.add({
        title: `已下发 ${ch === 0 ? "A" : "B"} · 5s`,
        variant: "success",
      });
    }
    window.setTimeout(() => setBusy(null), 800);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="波形库" description="内置预设试播 5 秒。" />
      {!canControl ? (
        <div className="dg-panel px-4 py-3">
          <Text variant="secondary">配对完成后可下发预设波形。卡片仍可浏览。</Text>
        </div>
      ) : null}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {WAVE_PRESETS.map((w) => (
          <article key={w.id} className="dg-panel flex flex-col gap-3 p-4">
            <Text variant="heading3" as="h2">
              {w.name}
            </Text>
            <Text variant="secondary" size="xs">
              试播 5 秒
            </Text>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!canControl}
                loading={busy === `${w.name}-0`}
                onClick={() => play(w.name, w.frames, 0)}
                onPointerDown={() => {
                  if (!canControl) requirePaired();
                }}
              >
                下发 A
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={!canControl}
                loading={busy === `${w.name}-1`}
                onClick={() => play(w.name, w.frames, 1)}
                onPointerDown={() => {
                  if (!canControl) requirePaired();
                }}
              >
                下发 B
              </Button>
            </div>
          </article>
        ))}
      </section>
      <Text variant="secondary" size="xs">
        .pulse / zip 导入即将支持。
      </Text>
    </div>
  );
}
