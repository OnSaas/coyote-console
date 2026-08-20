import { ConnectActions } from "../components/ConnectActions";
import { PairingCard } from "../components/PairingCard";
import { SessionCard } from "../components/SessionCard";
import { PageHeader } from "../layout/PageHeader";
import { useConsole } from "../state/ConsoleProvider";

export function PairPage() {
  const { relay } = useConsole();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="配对"
        description="DG-LAB 4.0 · Socket V4 · 扫码接入 APP"
        actions={
          <ConnectActions
            state={relay.state}
            onConnect={relay.connect}
            onDisconnect={relay.disconnect}
          />
        }
      />
      <div className="grid gap-6 md:grid-cols-2">
        <section className="dg-panel p-5">
          <PairingCard qrUrl={relay.qrUrl} waiting={relay.state === "connected"} />
        </section>
        <section className="dg-panel p-5">
          <SessionCard
            targetId={relay.targetId}
            appId={relay.appId}
            slotId={relay.slotId}
            error={relay.error}
          />
        </section>
      </div>
    </div>
  );
}
