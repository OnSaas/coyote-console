import { Badge } from "@cloudflare/kumo/components/badge";
import { Button } from "@cloudflare/kumo/components/button";
import { Dialog } from "@cloudflare/kumo/components/dialog";
import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { Loader } from "@cloudflare/kumo/components/loader";
import { Text } from "@cloudflare/kumo/components/text";
import { Lightning, Plugs, PlugsConnected } from "@phosphor-icons/react";
import type { ConnState } from "../hooks/useCoyoteSocket";

const STATE_BADGE: Record<
  ConnState,
  { label: string; variant: "secondary" | "info" | "warning" | "success" | "error" }
> = {
  idle: { label: "未连接", variant: "secondary" },
  connecting: { label: "连接中", variant: "info" },
  waiting: { label: "等待扫码", variant: "warning" },
  paired: { label: "已配对", variant: "success" },
  disconnected: { label: "已断开", variant: "secondary" },
  error: { label: "错误", variant: "error" },
};

interface Props {
  state: ConnState;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function Header({ state, onConnect, onDisconnect }: Props) {
  const badge = STATE_BADGE[state];
  const canConnect =
    state === "idle" ||
    state === "disconnected" ||
    state === "error" ||
    state === "connecting";

  return (
    <LayerCard className="px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Lightning size={28} weight="fill" className="text-kumo-brand" />
          <div>
            <Text variant="heading2" as="h1">
              Coyote Console
            </Text>
            <Text variant="secondary">DG-Lab Socket V3</Text>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {state === "connecting" ? (
            <Loader size="sm" aria-label="连接中" />
          ) : null}
          <Badge variant={badge.variant}>{badge.label}</Badge>
          {canConnect ? (
            <Button
              icon={Plugs}
              loading={state === "connecting"}
              onClick={onConnect}
            >
              连接中继
            </Button>
          ) : (
            <Dialog.Root role="alertdialog">
              <Dialog.Trigger
                render={(props) => (
                  <Button variant="secondary" icon={PlugsConnected} {...props}>
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
                        onClick={onDisconnect}
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
      </div>
    </LayerCard>
  );
}
