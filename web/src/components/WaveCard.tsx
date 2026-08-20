import { Button } from "@cloudflare/kumo/components/button";
import { Text } from "@cloudflare/kumo/components/text";
import type { ReactNode } from "react";

interface Props {
  name: string;
  hint?: string;
  canControl: boolean;
  busyA: boolean;
  busyB: boolean;
  onPlay: (ch: 0 | 1) => void;
  onBlocked: () => void;
  extra?: ReactNode;
}

export function WaveCard({
  name,
  hint,
  canControl,
  busyA,
  busyB,
  onPlay,
  onBlocked,
  extra,
}: Props) {
  return (
    <article className="dg-panel flex flex-col gap-3 p-4">
      <Text variant="heading3" as="h2">
        {name}
      </Text>
      {hint ? (
        <Text variant="secondary" size="xs">
          {hint}
        </Text>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!canControl}
          loading={busyA}
          onClick={() => onPlay(0)}
          onPointerDown={() => {
            if (!canControl) onBlocked();
          }}
        >
          下发 A
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={!canControl}
          loading={busyB}
          onClick={() => onPlay(1)}
          onPointerDown={() => {
            if (!canControl) onBlocked();
          }}
        >
          下发 B
        </Button>
        {extra}
      </div>
    </article>
  );
}
