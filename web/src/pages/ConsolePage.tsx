import { Button } from "@cloudflare/kumo/components/button";
import { QrCode } from "@phosphor-icons/react";
import { EmptyState } from "../components/EmptyState";
import { StrengthPanel } from "../components/StrengthPanel";
import { PageHeader } from "../layout/PageHeader";
import { formatDuration } from "../lib/records";
import { useConsole } from "../state/ConsoleProvider";

export function ConsolePage() {
  const { relay, strength, recorder, canControl, emergencyStop, requirePaired, settings } =
    useConsole();
  const paired = relay.state === "paired";

  return (
    <>
      <PageHeader
        title="控制台"
        description="实时强度与本次会话摘要"
        actions={
          paired && recorder.live ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const note = settings.askNote ? (window.prompt("备注（可空）") ?? "") : "";
                recorder.endSession({ note });
              }}
            >
              结束会话
            </Button>
          ) : null
        }
      />
      {!paired ? (
        <EmptyState
          icon={QrCode}
          title="尚未配对"
          description="连接中继并让 4.0 APP 扫码后即可调强度"
          action={{ label: "去配对", to: "/pair" }}
        />
      ) : (
        <>
          <section className="dg-kpi sm:grid-cols-4">
            <Stat label="状态" value={labelOf(relay.state)} />
            <Stat
              label="本次时长"
              value={recorder.live ? formatDuration(Date.now() - recorder.live.startedAt) : "—"}
            />
            <Stat label="最高 A" value={String(recorder.live?.maxA ?? 0)} />
            <Stat label="最高 B" value={String(recorder.live?.maxB ?? 0)} />
          </section>
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
            showStop={false}
            split
          />
        </>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="dg-muted text-xs">{label}</div>
      <div className="mt-1 text-lg font-medium text-[var(--dg-gold)]">{value}</div>
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
