import { Button } from "@cloudflare/kumo/components/button";
import { Dialog } from "@cloudflare/kumo/components/dialog";
import { Input } from "@cloudflare/kumo/components/input";
import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { Switch } from "@cloudflare/kumo/components/switch";
import { Text } from "@cloudflare/kumo/components/text";
import { useKumoToastManager } from "@cloudflare/kumo/components/toast";
import { useState } from "react";
import { PageHeader } from "../layout/PageHeader";
import { useConsole } from "../state/ConsoleProvider";

export function SettingsPage() {
  const { settings, patchSettings, recorder } = useConsole();
  const toast = useKumoToastManager();
  const [clearOpen, setClearOpen] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <PageHeader title="设置" description="安全上限、记录与关于。刷新后保持。" />

      <LayerCard>
        <LayerCard.Secondary>安全</LayerCard.Secondary>
        <LayerCard.Primary className="flex flex-col gap-4">
          <Input
            label="A 通道软件上限"
            description="控制台滑条最大值，且不超过 200"
            type="number"
            min={0}
            max={200}
            value={String(settings.aCap)}
            onChange={(e) => patchSettings({ aCap: clamp(Number(e.currentTarget.value)) })}
          />
          <Input
            label="B 通道软件上限"
            description="控制台滑条最大值，且不超过 200"
            type="number"
            min={0}
            max={200}
            value={String(settings.bCap)}
            onChange={(e) => patchSettings({ bCap: clamp(Number(e.currentTarget.value)) })}
          />
          <Row
            label="急停需确认"
            hint="开启后急停先弹出确认框"
            checked={settings.confirmStop}
            onChange={(v) => patchSettings({ confirmStop: v })}
          />
        </LayerCard.Primary>
      </LayerCard>

      <LayerCard>
        <LayerCard.Secondary>记录</LayerCard.Secondary>
        <LayerCard.Primary className="flex flex-col gap-4">
          <Row
            label="自动保存战绩"
            hint="配对成功起算，断开时落库"
            checked={settings.autoSave}
            onChange={(v) => patchSettings({ autoSave: v })}
          />
          <Row
            label="结束时询问备注"
            hint="结束并保存时弹出备注"
            checked={settings.askNote}
            onChange={(v) => patchSettings({ askNote: v })}
          />
          <Button variant="secondary" onClick={() => setClearOpen(true)}>
            清除本地记录
          </Button>
        </LayerCard.Primary>
      </LayerCard>

      <LayerCard>
        <LayerCard.Secondary>关于</LayerCard.Secondary>
        <LayerCard.Primary className="flex flex-col gap-2">
          <Text variant="secondary">Coyote Console 0.1.0 · Socket V4</Text>
          <Text variant="secondary" size="xs">
            非官方网页主控。记录仅存本机浏览器。
          </Text>
        </LayerCard.Primary>
      </LayerCard>

      {clearOpen ? (
        <Dialog.Root open onOpenChange={(o) => !o && setClearOpen(false)}>
          <Dialog className="p-6">
            <Dialog.Title>清空全部记录？</Dialog.Title>
            <Dialog.Description>只清本机 localStorage，不可恢复。</Dialog.Description>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setClearOpen(false)}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  recorder.clearAll();
                  setClearOpen(false);
                  toast.add({ title: "已清空记录", variant: "success" });
                }}
              >
                清空
              </Button>
            </div>
          </Dialog>
        </Dialog.Root>
      ) : null}
    </div>
  );
}

function Row({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <Text variant="body">{label}</Text>
        <Text variant="secondary" size="xs">
          {hint}
        </Text>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function clamp(n: number) {
  if (!Number.isFinite(n)) return 200;
  return Math.max(0, Math.min(200, Math.round(n)));
}
