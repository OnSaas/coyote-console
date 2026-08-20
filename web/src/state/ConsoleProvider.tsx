import { createContext, useContext, type ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { useKumoToastManager } from "@cloudflare/kumo/components/toast";
import { useCoyoteSocket, type RelayEvent } from "../hooks/useCoyoteSocket";
import { useSessionRecorder } from "../hooks/useSessionRecorder";
import { useStrength } from "../hooks/useStrength";
import { loadSettings, saveSettings, type Settings } from "../lib/settings";

interface ConsoleValue {
  relay: ReturnType<typeof useCoyoteSocket>;
  strength: ReturnType<typeof useStrength>;
  recorder: ReturnType<typeof useSessionRecorder>;
  settings: Settings;
  patchSettings: (partial: Partial<Settings>) => void;
  canControl: boolean;
  requirePaired: () => boolean;
  emergencyStop: () => void;
}

const Ctx = createContext<ConsoleValue | null>(null);

export function ConsoleProvider({ children }: { children: ReactNode }) {
  const toast = useKumoToastManager();
  const [settings, setSettings] = useState<Settings>(() =>
    typeof window === "undefined" ? loadSettings() : loadSettings(),
  );

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
  const requirePaired = useCallback(() => {
    if (relay.state !== "paired") {
      toast.add({
        title: "请先完成配对",
        description: "打开「配对」连接中继并扫码",
        variant: "warning",
      });
      return false;
    }
    if (!relay.slotId) {
      toast.add({
        title: "等待设备",
        description: "APP 已接入，等郊狼出现后再控制",
        variant: "warning",
      });
      return false;
    }
    return true;
  }, [relay.slotId, relay.state, toast]);

  const canControl = relay.state === "paired" && Boolean(relay.slotId);
  const remote = {
    ...relay.strength,
    aLimit: Math.min(relay.strength.aLimit || 200, settings.aCap),
    bLimit: Math.min(relay.strength.bLimit || 200, settings.bCap),
  };
  const strength = useStrength({
    canControl,
    remote,
    slotId: relay.slotId,
    sendRpc: relay.sendRpc,
    onBlocked: () => {
      requirePaired();
    },
  });

  const recorder = useSessionRecorder({
    paired: relay.state === "paired",
    a: strength.local.a,
    b: strength.local.b,
    autoSave: settings.autoSave,
  });

  const emergencyStop = useCallback(() => {
    if (!canControl) {
      toast.add({ title: "当前无设备", variant: "warning" });
      return;
    }
    if (strength.emergencyStop()) {
      recorder.markStop();
      toast.add({ title: "已归零并清除波形", variant: "success" });
    }
  }, [canControl, recorder, strength, toast]);

  const patchSettings = useCallback((partial: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      relay,
      strength,
      recorder,
      settings,
      patchSettings,
      canControl,
      requirePaired,
      emergencyStop,
    }),
    [
      canControl,
      emergencyStop,
      patchSettings,
      recorder,
      relay,
      requirePaired,
      settings,
      strength,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConsole() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConsole outside provider");
  return ctx;
}
