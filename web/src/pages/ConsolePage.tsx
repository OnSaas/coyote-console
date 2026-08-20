import { Text } from "@cloudflare/kumo/components/text";
import { StrengthPanel } from "../components/StrengthPanel";
import { formatDuration } from "../lib/records";
import { useConsole } from "../state/ConsoleProvider";

export function ConsolePage() {
  const { relay, strength, recorder, canControl, emergencyStop, requirePaired } = useConsole();

  return (
    <div className="flex flex-col gap-5">
      <Text variant="heading2" as="h1">
        控制台
      </Text>
      <section className="dg-panel p-5">
        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          <Stat label="状态" value={labelOf(relay.state)} />
          <Stat
            label="本次时长"
            value={recorder.live ? formatDuration(Date.now() - recorder.live.startedAt) : "—"}
          />
          <Stat label="最高 A" value={String(recorder.live?.maxA ?? 0)} />
          <Stat label="最高 B" value={String(recorder.live?.maxB ?? 0)} />
        </div>
        <StrengthPanel
          a={strength.local.a}
          b={strength.local.b}
          aLimit={strength.limits.a}
          bLimit={strength.limits.b}
          canControl={canControl}
          onSet={strength.setChannel}
          onNudge={strength.nudge}
          onStop={emergencyStop}
          onBlocked={requirePaired}
        />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="dg-muted text-xs">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function labelOf(state: string) {
  if (state === "paired") return "已配对";
  if (state === "connected") return "已连接";
  if (state === "connecting") return "连接中";
  if (state === "error") return "错误";
  if (state === "disconnected") return "已断开";
  return "未连接";
}
