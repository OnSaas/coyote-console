import { Input } from "@cloudflare/kumo/components/input";
import { Switch } from "@cloudflare/kumo/components/switch";
import { Text } from "@cloudflare/kumo/components/text";
import { useConsole } from "../state/ConsoleProvider";

export function SettingsPage() {
  const { settings, patchSettings } = useConsole();

  return (
    <div className="flex flex-col gap-5">
      <Text variant="heading2" as="h1">
        设置
      </Text>

      <section className="dg-panel flex flex-col gap-4 p-5">
        <Text variant="heading3" as="h2">
          安全
        </Text>
        <Input
          label="A 通道软件上限"
          type="number"
          min={0}
          max={200}
          value={String(settings.aCap)}
          onChange={(e) =>
            patchSettings({
              aCap: clamp(Number(e.currentTarget.value)),
            })
          }
        />
        <Input
          label="B 通道软件上限"
          type="number"
          min={0}
          max={200}
          value={String(settings.bCap)}
          onChange={(e) =>
            patchSettings({
              bCap: clamp(Number(e.currentTarget.value)),
            })
          }
        />
        <Row
          label="急停需确认"
          checked={settings.confirmStop}
          onChange={(v) => patchSettings({ confirmStop: v })}
        />
      </section>

      <section className="dg-panel flex flex-col gap-4 p-5">
        <Text variant="heading3" as="h2">
          记录
        </Text>
        <Row
          label="自动保存战绩"
          checked={settings.autoSave}
          onChange={(v) => patchSettings({ autoSave: v })}
        />
        <Row
          label="结束时询问备注"
          checked={settings.askNote}
          onChange={(v) => patchSettings({ askNote: v })}
        />
      </section>

      <section className="dg-panel flex flex-col gap-2 p-5">
        <Text variant="heading3" as="h2">
          关于
        </Text>
        <Text variant="secondary">Coyote Console 0.1.0 · Socket V4</Text>
        <Text variant="secondary" size="xs">
          非官方网页主控。记录仅存本机浏览器。
        </Text>
      </section>
    </div>
  );
}

function Row({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <Text variant="body">{label}</Text>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function clamp(n: number) {
  if (!Number.isFinite(n)) return 200;
  return Math.max(0, Math.min(200, Math.round(n)));
}
