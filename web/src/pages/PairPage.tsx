import { Button } from "@cloudflare/kumo/components/button";
import { Text } from "@cloudflare/kumo/components/text";
import { useNavigate } from "react-router-dom";
import { ConnectActions } from "../components/ConnectActions";
import { PairingCard } from "../components/PairingCard";
import { SessionCard } from "../components/SessionCard";
import { PageHeader } from "../layout/PageHeader";
import { useConsole } from "../state/ConsoleProvider";

export function PairPage() {
  const { relay } = useConsole();
  const nav = useNavigate();
  const step =
    relay.state === "paired"
      ? 3
      : relay.state === "connected" || relay.state === "connecting"
        ? 2
        : 1;

  return (
    <>
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

      <ol className="dg-panel grid grid-cols-3 divide-x divide-[var(--dg-border)]">
        <Step n={1} active={step === 1} done={step > 1} title="连接中继" />
        <Step n={2} active={step === 2} done={step > 2} title="APP 扫码" />
        <Step n={3} active={step === 3} done={step === 3} title="完成" />
      </ol>

      {relay.state === "paired" ? (
        <section className="dg-panel flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <Text variant="body" bold>
              已配对
            </Text>
            <Text variant="secondary" size="sm">
              可到控制台调节强度
            </Text>
          </div>
          <Button onClick={() => nav("/")}>去控制台</Button>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(240px,2fr)]">
        <section className="dg-panel p-6">
          <PairingCard qrUrl={relay.qrUrl} waiting={relay.state === "connected"} />
        </section>
        <section className="dg-panel p-6">
          <SessionCard
            targetId={relay.targetId}
            appId={relay.appId}
            slotId={relay.slotId}
            error={relay.error}
          />
        </section>
      </div>
    </>
  );
}

function Step({
  n,
  title,
  active,
  done,
}: {
  n: number;
  title: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-full text-sm ${
          done || active ? "bg-[var(--dg-gold)] text-black" : "bg-white/10"
        }`}
      >
        {n}
      </span>
      <Text variant={active ? "body" : "secondary"}>{title}</Text>
    </li>
  );
}
