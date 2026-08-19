import { Button } from "@cloudflare/kumo/components/button";
import { Input } from "@cloudflare/kumo/components/input";
import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { Text } from "@cloudflare/kumo/components/text";
import { Slider } from "@cloudflare/kumo/primitives/slider";
import { Minus, Plus } from "@phosphor-icons/react";
import { EmergencyStop } from "./EmergencyStop";

interface Props {
  a: number;
  b: number;
  aLimit: number;
  bLimit: number;
  canControl: boolean;
  onSet: (channel: 1 | 2, value: number, immediate?: boolean) => void;
  onDrag: (channel: 1 | 2, active: boolean) => void;
  onNudge: (channel: 1 | 2, up: boolean) => void;
  onStop: () => void;
}

export function StrengthPanel({
  a,
  b,
  aLimit,
  bLimit,
  canControl,
  onSet,
  onDrag,
  onNudge,
  onStop,
}: Props) {
  return (
    <LayerCard>
      <LayerCard.Secondary>强度控制</LayerCard.Secondary>
      <LayerCard.Primary>
        <div className="grid gap-6 md:grid-cols-2">
          <ChannelRow
            label="A 通道"
            channel={1}
            value={a}
            limit={aLimit}
            disabled={!canControl}
            onSet={onSet}
            onDrag={onDrag}
            onNudge={onNudge}
          />
          <ChannelRow
            label="B 通道"
            channel={2}
            value={b}
            limit={bLimit}
            disabled={!canControl}
            onSet={onSet}
            onDrag={onDrag}
            onNudge={onNudge}
          />
        </div>
        <div className="mt-6 hidden md:block">
          <EmergencyStop onStop={onStop} />
        </div>
      </LayerCard.Primary>
    </LayerCard>
  );
}

function ChannelRow({
  label,
  channel,
  value,
  limit,
  disabled,
  onSet,
  onDrag,
  onNudge,
}: {
  label: string;
  channel: 1 | 2;
  value: number;
  limit: number;
  disabled: boolean;
  onSet: (channel: 1 | 2, value: number, immediate?: boolean) => void;
  onDrag: (channel: 1 | 2, active: boolean) => void;
  onNudge: (channel: 1 | 2, up: boolean) => void;
}) {
  const max = Math.max(0, Math.min(200, limit || 200));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <Text variant="body" bold>
          {label}
        </Text>
        <Text variant="secondary" size="xs">
          {value} / {max}
        </Text>
      </div>

      <Slider.Root
        disabled={disabled}
        min={0}
        max={max}
        step={1}
        value={[value]}
        onValueChange={(next) => {
          const n = Array.isArray(next) ? next[0] : next;
          if (typeof n === "number") onSet(channel, n);
        }}
        onValueCommitted={() => onDrag(channel, false)}
        onPointerDown={() => onDrag(channel, true)}
        className="flex w-full touch-none select-none items-center"
      >
        <Slider.Control className="flex h-6 w-full items-center">
          <Slider.Track className="relative h-1.5 w-full rounded-full bg-kumo-fill">
            <Slider.Indicator className="absolute h-full rounded-full bg-kumo-brand" />
            <Slider.Thumb className="absolute top-1/2 size-4 -translate-y-1/2 rounded-full bg-kumo-base shadow-xs ring-2 ring-kumo-brand" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          shape="square"
          icon={Minus}
          disabled={disabled}
          onClick={() => onNudge(channel, false)}
          aria-label={`${label} 减 1`}
        />
        <Input
          size="sm"
          type="number"
          min={0}
          max={max}
          disabled={disabled}
          value={String(value)}
          aria-label={`${label} 强度`}
          onChange={(event) => {
            const n = Number(event.currentTarget.value);
            if (Number.isFinite(n)) onSet(channel, n, true);
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          shape="square"
          icon={Plus}
          disabled={disabled}
          onClick={() => onNudge(channel, true)}
          aria-label={`${label} 加 1`}
        />
      </div>
    </div>
  );
}
