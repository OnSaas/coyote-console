import { ClipboardText } from "@cloudflare/kumo/components/clipboard-text";
import { Text } from "@cloudflare/kumo/components/text";

interface Props {
  targetId: string | null;
  appId: string | null;
  slotId: string | null;
  error: string | null;
}

export function SessionCard({ targetId, appId, slotId, error }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <Text variant="heading3" as="h2">
        会话
      </Text>
      <Field label="控制端 ID" value={targetId} />
      <Field label="APP ID" value={appId} />
      <Field label="设备 slot" value={slotId} />
      {error ? <Text variant="error">{error}</Text> : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <Text variant="secondary" size="xs">
        {label}
      </Text>
      {value ? (
        <ClipboardText text={value} size="sm" />
      ) : (
        <Text variant="mono" as="code">
          —
        </Text>
      )}
    </div>
  );
}
