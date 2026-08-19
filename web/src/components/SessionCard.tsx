import { ClipboardText } from "@cloudflare/kumo/components/clipboard-text";
import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { Text } from "@cloudflare/kumo/components/text";

interface Props {
  clientId: string | null;
  targetId: string | null;
  error: string | null;
}

export function SessionCard({ clientId, targetId, error }: Props) {
  return (
    <LayerCard>
      <LayerCard.Secondary>会话信息</LayerCard.Secondary>
      <LayerCard.Primary>
        <div className="flex flex-col gap-4">
          <IdRow label="控制端 ID" value={clientId} />
          <IdRow label="APP ID" value={targetId} />
          {error ? <Text variant="error">{error}</Text> : null}
        </div>
      </LayerCard.Primary>
    </LayerCard>
  );
}

function IdRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <Text variant="secondary" size="xs">
        {label}
      </Text>
      {value ? (
        <ClipboardText
          text={value}
          size="sm"
          tooltip={{ text: "复制", copiedText: "已复制" }}
          labels={{ copyAction: `复制${label}` }}
        />
      ) : (
        <Text variant="mono" as="code">
          —
        </Text>
      )}
    </div>
  );
}
