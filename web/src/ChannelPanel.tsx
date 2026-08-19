import { Input } from "@cloudflare/kumo";
import { Slider } from "@cloudflare/kumo/primitives/slider";
import { Minus, Plus } from "@phosphor-icons/react";
import { Button } from "@cloudflare/kumo";

interface Props {
  label: string;
  channel: 1 | 2;
  value: number;
  limit: number;
  disabled: boolean;
  onSet: (value: number) => void;
  onNudge: (up: boolean) => void;
}

export function ChannelPanel({
  label,
  value,
  limit,
  disabled,
  onSet,
  onNudge,
}: Props) {
  const max = Math.max(0, Math.min(200, limit || 200));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-kumo-normal">{label}</span>
        <span className="text-xs text-kumo-subtle">
          {value} / {max}
        </span>
      </div>

      <Slider.Root
        disabled={disabled}
        min={0}
        max={max}
        step={1}
        value={[value]}
        onValueChange={(next) => {
          const n = Array.isArray(next) ? next[0] : next;
          if (typeof n === "number") onSet(n);
        }}
        className="flex w-full touch-none select-none items-center"
      >
        <Slider.Control className="flex h-6 w-full items-center">
          <Slider.Track className="relative h-1.5 w-full rounded-full bg-kumo-fill">
            <Slider.Indicator className="absolute h-full rounded-full bg-kumo-accent" />
            <Slider.Thumb className="absolute top-1/2 size-4 -translate-y-1/2 rounded-full bg-kumo-base shadow-xs ring-2 ring-kumo-accent" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => onNudge(false)}
          aria-label={`${label} 减 1`}
        >
          <Minus />
        </Button>
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
            if (Number.isFinite(n)) onSet(n);
          }}
          className="flex-1"
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => onNudge(true)}
          aria-label={`${label} 加 1`}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}
