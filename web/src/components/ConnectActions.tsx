import { Button } from "@cloudflare/kumo/components/button";
import { Dialog } from "@cloudflare/kumo/components/dialog";
import { Plugs, PlugsConnected } from "@phosphor-icons/react";
import type { ConnState } from "../hooks/useCoyoteSocket";

interface Props {
  state: ConnState;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function ConnectActions({ state, onConnect, onDisconnect }: Props) {
  const canConnect =
    state === "idle" ||
    state === "disconnected" ||
    state === "error" ||
    state === "connecting";

  if (canConnect) {
    return (
      <Button
        className="dg-cta"
        loading={state === "connecting"}
        icon={Plugs}
        onClick={onConnect}
      >
        连接中继
      </Button>
    );
  }

  return (
    <Dialog.Root>
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
          断开后 APP 会收到 controller_disconnected，需要重新扫码。
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
              <Button variant="destructive" {...props} onClick={onDisconnect}>
                断开
              </Button>
            )}
          />
        </div>
      </Dialog>
    </Dialog.Root>
  );
}
