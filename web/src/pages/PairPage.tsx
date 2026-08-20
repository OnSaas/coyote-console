import { Text } from "@cloudflare/kumo/components/text";
import { Header } from "../components/Header";
import { PairingCard } from "../components/PairingCard";
import { SessionCard } from "../components/SessionCard";
import { useConsole } from "../state/ConsoleProvider";

export function PairPage() {
  const { relay } = useConsole();
  return (
    <div className="flex flex-col gap-5">
      <Text variant="heading2" as="h1">
        配对
      </Text>
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
        <Text variant="secondary" size="xs">
          DG-LAB 4.0 · Socket V4 · 扫码接入 APP
        </Text>
      </section>
    </div>
  );
}
