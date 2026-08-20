import { ClipboardText } from "@cloudflare/kumo/components/clipboard-text";
import { Text } from "@cloudflare/kumo/components/text";
import { useKumoToastManager } from "@cloudflare/kumo/components/toast";

interface Props {
  targetId: string | null;
  appId: string | null;
  slotId: string | null;
  error: string | null;
}

export function SessionCard({ targetId, appId, slotId, error }: Props) {
  const toast = useKumoToastManager();
  const copied = () => toast.add({ title: "已复制", variant: "success" });
  return (
    <div className="flex flex-col gap-3">
      <Text variant="heading3" as="h2">
        会话
      </Text>
      <Field label="控制端 ID" value={targetId} onCopy={copied} />
      <Field label="APP ID" value={appId} onCopy={copied} />
      <Field label="设备 slot" value={slotId} onCopy={copied} />
      {error ? <Text variant="error">{error}</Text> : null}
    </div>
  );
}

function Field({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string | null;
  onCopy: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Text variant="secondary" size="xs">
        {label}
      </Text>
      {value ? (
        <ClipboardText text={value} size="sm" onCopy={onCopy} />
      ) : (
        <Text variant="mono" as="code">
          —
        </Text>
      )}
    </div>
  );
}
