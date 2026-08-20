import { Button } from "@cloudflare/kumo/components/button";
import { Dialog } from "@cloudflare/kumo/components/dialog";
import { Input } from "@cloudflare/kumo/components/input";
import { Switch } from "@cloudflare/kumo/components/switch";
import { Text } from "@cloudflare/kumo/components/text";
import { useKumoToastManager } from "@cloudflare/kumo/components/toast";
import type { ReactNode } from "react";
import { useState } from "react";
import { PageHeader } from "../layout/PageHeader";
import { DEFAULT_SETTINGS } from "../lib/settings";
import { useConsole } from "../state/ConsoleProvider";

export function SettingsPage() {
  const { settings, patchSettings, recorder } = useConsole();
  const toast = useKumoToastManager();
  const [clearOpen, setClearOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="设置"
        description="改完即保存，刷新后保持。"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              patchSettings({ ...DEFAULT_SETTINGS });
              toast.add({ title: "已恢复默认", variant: "success" });
            }}
          >
            恢复默认
          </Button>
        }
      />

      <section className="dg-panel px-5 py-2">
        <SectionTitle>安全</SectionTitle>
        <FormRow
          label="A 通道软件上限"
          hint="控制台滑条最大值，不超过 200"
          control={
            <Input
              type="number"
              min={0}
              max={200}
              size="sm"
              value={String(settings.aCap)}
              onChange={(e) => patchSettings({ aCap: clamp(Number(e.currentTarget.value)) })}
            />
          }
        />
        <FormRow
          label="B 通道软件上限"
          hint="控制台滑条最大值，不超过 200"
          control={
            <Input
              type="number"
              min={0}
              max={200}
              size="sm"
              value={String(settings.bCap)}
              onChange={(e) => patchSettings({ bCap: clamp(Number(e.currentTarget.value)) })}
            />
          }
        />
        <FormRow
          label="急停需确认"
          hint="开启后急停先弹出确认框"
          control={
            <Switch
              checked={settings.confirmStop}
              onCheckedChange={(v) => patchSettings({ confirmStop: v })}
            />
          }
        />
      </section>

      <section className="dg-panel px-5 py-2">
        <SectionTitle>记录</SectionTitle>
        <FormRow
          label="自动保存战绩"
          hint="配对成功起算，断开时落库"
          control={
            <Switch
              checked={settings.autoSave}
              onCheckedChange={(v) => patchSettings({ autoSave: v })}
            />
          }
        />
        <FormRow
          label="结束时询问备注"
          hint="结束并保存时弹出备注"
          control={
            <Switch
              checked={settings.askNote}
              onCheckedChange={(v) => patchSettings({ askNote: v })}
            />
          }
        />
        <FormRow
          label="清除本地记录"
          hint="只清本机浏览器数据"
          control={
            <Button variant="secondary" size="sm" onClick={() => setClearOpen(true)}>
              清空
            </Button>
          }
        />
      </section>

      <section className="dg-panel px-5 py-4">
        <SectionTitle>关于</SectionTitle>
        <Text variant="secondary">Coyote Console 0.1.0 · Socket V4</Text>
        <Text variant="secondary" size="xs">
          非官方网页主控。记录仅存本机浏览器。
        </Text>
      </section>

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
    </>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="pt-3 pb-1 text-xs font-medium uppercase tracking-wide text-[var(--dg-muted)]">
      {children}
    </div>
  );
}

function FormRow({
  label,
  hint,
  control,
}: {
  label: string;
  hint: string;
  control: ReactNode;
}) {
  return (
    <div className="dg-form-row">
      <div className="min-w-0">
        <Text variant="body">{label}</Text>
        <Text variant="secondary" size="xs">
          {hint}
        </Text>
      </div>
      <div className="w-[140px] shrink-0">{control}</div>
    </div>
  );
}

function clamp(n: number) {
  if (!Number.isFinite(n)) return 200;
  return Math.max(0, Math.min(200, Math.round(n)));
}
