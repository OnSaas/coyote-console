import { Button } from "@cloudflare/kumo/components/button";
import { Text } from "@cloudflare/kumo/components/text";
import { V4Channel } from "../lib/protocol";
import { WAVE_PRESETS, sendPulse } from "../lib/waves";
import { useConsole } from "../state/ConsoleProvider";

export function WavesPage() {
  const { relay, canControl, recorder, requirePaired } = useConsole();

  function play(name: string, frames: readonly string[], ch: 0 | 1) {
    if (!requirePaired()) return;
    if (!relay.slotId) return;
    if (
      relay.sendRpc(
        sendPulse(relay.slotId, ch === 0 ? V4Channel.A : V4Channel.B, [...frames], 5000),
      )
    ) {
      recorder.markWave(name);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Text variant="heading2" as="h1">
        波形库
      </Text>
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
        导入 .pulse / zip 下一阶段再做。未配对时按钮禁用。
      </Text>
    </div>
  );
}
