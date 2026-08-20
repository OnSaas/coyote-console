import { Toasty, useKumoToastManager } from "@cloudflare/kumo/components/toast";
import { useCallback } from "react";
import { Header } from "./components/Header";
import { PairingCard } from "./components/PairingCard";
import { SessionCard } from "./components/SessionCard";
import { StrengthPanel } from "./components/StrengthPanel";
import { useCoyoteSocket, type RelayEvent } from "./hooks/useCoyoteSocket";
import { useStrength } from "./hooks/useStrength";

export default function App() {
  const toast = useKumoToastManager();
  const onEvent = useCallback(
    (event: RelayEvent) => {
      toast.add({
        title: event.title,
        description: event.description,
        variant: event.kind,
      });
    },
    [toast],
  );

  const relay = useCoyoteSocket(onEvent);
  const canControl = relay.state === "paired" && Boolean(relay.slotId);
  const strength = useStrength({
    canControl,
    remote: relay.strength,
    slotId: relay.slotId,
    sendRpc: relay.sendRpc,
    onBlocked: () =>
      toast.add({
        title: "尚未配对或无设备",
        variant: "warning",
      }),
  });

  return (
    <Toasty>
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-6 pb-28">
        <section className="dg-panel flex flex-col gap-6 p-5">
          <Header
            state={relay.state}
            onConnect={relay.connect}
            onDisconnect={relay.disconnect}
          />
          <hr className="dg-rule" />
          <div className="grid gap-6 md:grid-cols-2">
            <PairingCard
              qrUrl={relay.qrUrl}
              waiting={relay.state === "waiting"}
            />
            <SessionCard
              targetId={relay.targetId}
              appId={relay.appId}
              slotId={relay.slotId}
              error={relay.error}
            />
          </div>
          <hr className="dg-rule" />
          <StrengthPanel
            a={strength.local.a}
            b={strength.local.b}
            aLimit={strength.limits.a}
            bLimit={strength.limits.b}
            canControl={canControl}
            onSet={strength.setChannel}
            onNudge={strength.nudge}
            onStop={() => {
              if (strength.emergencyStop()) {
                toast.add({
                  title: "已归零并清除波形",
                  variant: "success",
                });
              }
            }}
          />
        </section>
      </div>
    </Toasty>
  );
}
