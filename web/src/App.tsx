import { Toasty, useKumoToastManager } from "@cloudflare/kumo/components/toast";
import { useCallback } from "react";
import { EmergencyStop } from "./components/EmergencyStop";
import { Header } from "./components/Header";
import { PairingCard } from "./components/PairingCard";
import { SessionCard } from "./components/SessionCard";
import { StrengthPanel } from "./components/StrengthPanel";
import {
  type RelayEvent,
  useCoyoteSocket,
} from "./hooks/useCoyoteSocket";
import { useStrength } from "./hooks/useStrength";

export default function App() {
  return (
    <Toasty>
      <Console />
    </Toasty>
  );
}

function Console() {
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

  const socket = useCoyoteSocket(onEvent);
  const canControl = socket.state === "paired";
  const strength = useStrength({
    canControl,
    remote: socket.remoteStrength,
    sendRaw: socket.sendRaw,
    onBlocked: () => {
      toast.add({
        title: "尚未配对",
        description: "扫码完成后再调强度",
        variant: "warning",
      });
    },
  });

  const handleStop = useCallback(() => {
    strength.zeroLocal();
    socket.emergencyStop();
  }, [socket, strength]);

  return (
    <div className="min-h-dvh bg-kumo-canvas text-kumo-default">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 pb-28 md:pb-8">
        <Header
          state={socket.state}
          onConnect={socket.connect}
          onDisconnect={socket.disconnect}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <PairingCard qrUrl={socket.qrUrl} />
          <SessionCard
            clientId={socket.clientId}
            targetId={socket.targetId}
            error={socket.error}
          />
        </div>

        <StrengthPanel
          a={strength.a}
          b={strength.b}
          aLimit={strength.aLimit}
          bLimit={strength.bLimit}
          canControl={canControl}
          onSet={(ch, v, immediate) => strength.setChannel(ch, v, Boolean(immediate))}
          onDrag={strength.setDragging}
          onNudge={strength.nudge}
          onStop={handleStop}
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-kumo-line bg-kumo-base p-3 md:hidden">
        <EmergencyStop onStop={handleStop} />
      </div>
    </div>
  );
}
