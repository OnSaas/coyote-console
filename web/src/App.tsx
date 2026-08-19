import {
  Badge,
  Button,
  ClipboardText,
  Dialog,
  LayerCard,
  Text,
  useKumoToastManager,
} from "@cloudflare/kumo";
import {
  Lightning,
  Plugs,
  PlugsConnected,
  QrCode,
  Stop,
} from "@phosphor-icons/react";
import { QRCodeSVG } from "qrcode.react";
import { useCallback } from "react";
import { ChannelPanel } from "./ChannelPanel";
import { type ConnState, type RelayEvent, useRelay } from "./useRelay";

const STATE_BADGE: Record<
  ConnState,
  {
    label: string;
    variant: "secondary" | "info" | "warning" | "success" | "error";
  }
> = {
  idle: { label: "未连接", variant: "secondary" },
  connecting: { label: "连接中", variant: "info" },
  waiting: { label: "等待扫码", variant: "warning" },
  paired: { label: "已配对", variant: "success" },
  disconnected: { label: "已断开", variant: "secondary" },
  error: { label: "错误", variant: "error" },
};

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

  const relay = useRelay(onEvent);
  const live = relay.state === "paired";
  const badge = STATE_BADGE[relay.state];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Lightning size={28} weight="fill" className="text-kumo-accent" />
          <div>
            <Text variant="heading2" as="h1">
              Coyote Console
            </Text>
            <Text variant="secondary">DG-Lab Socket V3 最小控制台</Text>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          {relay.state === "idle" ||
          relay.state === "disconnected" ||
          relay.state === "error" ? (
            <Button onClick={relay.connect}>
              <Plugs />
              连接中继
            </Button>
          ) : (
            <Dialog.Root>
              <Dialog.Trigger
                render={(props) => (
                  <Button variant="secondary" {...props}>
                    <PlugsConnected />
                    断开
                  </Button>
                )}
              />
              <Dialog className="p-6">
                <Dialog.Title>断开中继？</Dialog.Title>
                <Dialog.Description>
                  断开后 APP 会收到 break，需要重新扫码。
                </Dialog.Description>
                <div className="mt-4 flex justify-end gap-2">
                  <Dialog.Close
                    render={(props) => (
                      <Button variant="secondary" {...props}>
                        取消
                      </Button>
                    )}
                  />
                  <Dialog.Close
                    render={(props) => (
                      <Button
                        variant="destructive"
                        {...props}
                        onClick={relay.disconnect}
                      >
                        断开
                      </Button>
                    )}
                  />
                </div>
              </Dialog>
            </Dialog.Root>
          )}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <LayerCard>
          <LayerCard.Secondary>
            <QrCode />
            配对二维码
          </LayerCard.Secondary>
          <LayerCard.Primary>
            {relay.qrUrl ? (
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-lg bg-white p-3">
                  <QRCodeSVG value={relay.qrUrl} size={200} level="M" />
                </div>
                <ClipboardText text={relay.qrUrl} size="sm" />
                <Text variant="secondary" size="xs">
                  用 DG-LAB APP 扫描
                </Text>
              </div>
            ) : (
              <Text variant="secondary">先点「连接中继」，再扫码。</Text>
            )}
          </LayerCard.Primary>
        </LayerCard>

        <LayerCard>
          <LayerCard.Secondary>会话</LayerCard.Secondary>
          <LayerCard.Primary>
            <div className="flex flex-col gap-3">
              <Field label="控制端 ID" value={relay.clientId} />
              <Field label="APP ID" value={relay.targetId} />
              {relay.error ? (
                <Text variant="error">{relay.error}</Text>
              ) : null}
            </div>
          </LayerCard.Primary>
        </LayerCard>
      </div>

      <LayerCard>
        <LayerCard.Secondary>强度</LayerCard.Secondary>
        <LayerCard.Primary>
          <div className="grid gap-6 md:grid-cols-2">
            <ChannelPanel
              label="A 通道"
              channel={1}
              value={relay.strength.a}
              limit={relay.strength.aLimit}
              disabled={!live}
              onSet={(v) => relay.setStrengthValue(1, v)}
              onNudge={(up) => relay.nudge(1, up)}
            />
            <ChannelPanel
              label="B 通道"
              channel={2}
              value={relay.strength.b}
              limit={relay.strength.bLimit}
              disabled={!live}
              onSet={(v) => relay.setStrengthValue(2, v)}
              onNudge={(up) => relay.nudge(2, up)}
            />
          </div>
          <div className="mt-6">
            <Button
              variant="destructive"
              size="lg"
              disabled={!live}
              onClick={relay.emergencyStop}
            >
              <Stop weight="fill" />
              急停
            </Button>
          </div>
        </LayerCard.Primary>
      </LayerCard>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <Text variant="secondary" size="xs">
        {label}
      </Text>
      <Text variant="mono" as="code">
        {value ?? "—"}
      </Text>
    </div>
  );
}
