import { Button } from "@cloudflare/kumo/components/button";
import { PlugCharging, QrCode } from "@phosphor-icons/react";
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
      ) : !relay.slotId ? (
        <EmptyState
          icon={PlugCharging}
          title="等待设备"
          description="APP 已接入。打开 4.0 APP 蓝牙连上郊狼后会自动出现。"
        />
      ) : (
        <>
          <section className="dg-kpi sm:grid-cols-4">
            <Stat label="设备" value={relay.deviceName ?? relay.slotId.slice(0, 8)} />
            <Stat
              label="本次时长"
              value={recorder.live ? formatDuration(Date.now() - recorder.live.startedAt) : "—"}
            />
            <Stat label="A" value={String(strength.local.a)} />
            <Stat label="B" value={String(strength.local.b)} />
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
            showStop
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
