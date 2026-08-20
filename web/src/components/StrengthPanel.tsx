import { Button } from "@cloudflare/kumo/components/button";
import { Input } from "@cloudflare/kumo/components/input";
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
  onNudge: (channel: 1 | 2, up: boolean) => void;
  onStop: () => void;
  onBlocked?: () => void;
  showStop?: boolean;
  split?: boolean;
}

export function StrengthPanel({
  a,
  b,
  aLimit,
  bLimit,
  canControl,
  onSet,
  onNudge,
  onStop,
  onBlocked,
  showStop = true,
  split = false,
}: Props) {
  return (
    <div
      className="flex flex-col gap-5"
      onPointerDown={() => {
        if (!canControl) onBlocked?.();
      }}
    >
      <div className={split ? "grid gap-4 md:grid-cols-2" : "flex flex-col gap-5"}>
        <ChannelRow
          label="A"
          value={a}
          max={aLimit}
          disabled={!canControl}
          boxed={split}
          onSet={(v, imm) => onSet(1, v, imm)}
          onNudge={(up) => onNudge(1, up)}
        />
        <ChannelRow
          label="B"
          value={b}
          max={bLimit}
          disabled={!canControl}
          boxed={split}
          onSet={(v, imm) => onSet(2, v, imm)}
          onNudge={(up) => onNudge(2, up)}
        />
      </div>
      {showStop ? (
        <div className="sticky bottom-3 z-20 md:static">
          <EmergencyStop onStop={onStop} />
        </div>
      ) : null}
    </div>
  );
}

function ChannelRow({
  label,
  value,
  max,
  disabled,
  boxed,
  onSet,
  onNudge,
}: {
  label: string;
  value: number;
  max: number;
  disabled: boolean;
  boxed?: boolean;
  onSet: (value: number, immediate?: boolean) => void;
  onNudge: (up: boolean) => void;
}) {
  const cap = Math.max(0, Math.min(200, max || 200));

  return (
    <div className={boxed ? "dg-panel flex flex-col gap-4 p-6" : "flex flex-col gap-2"}>
      <div className="flex items-baseline justify-between">
        <Text variant="body" bold>
          {label} 通道
        </Text>
        <Text variant="secondary" size="xs">
          {value} / {cap}
        </Text>
      </div>
      <Slider.Root
        disabled={disabled}
        min={0}
        max={cap}
        step={1}
        value={[value]}
        onValueChange={(next) => {
          const n = Array.isArray(next) ? next[0] : next;
          if (typeof n === "number") onSet(n);
        }}
        className="flex w-full touch-none select-none items-center"
      >
        <Slider.Control className="flex h-10 w-full items-center">
          <Slider.Track className="relative h-1.5 w-full rounded-full bg-kumo-fill">
            <Slider.Indicator className="absolute h-full rounded-full bg-[var(--dg-gold)]" />
            <Slider.Thumb className="absolute top-1/2 size-4 -translate-y-1/2 rounded-full bg-[var(--dg-gold)] shadow-xs ring-2 ring-[var(--dg-gold)]" />
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
          onClick={() => onNudge(false)}
          aria-label={`${label} 减 1`}
        />
        <Input
          size="sm"
          type="number"
          min={0}
          max={cap}
          disabled={disabled}
          value={String(value)}
          aria-label={`${label} 强度`}
          onChange={(event) => {
            const n = Number(event.currentTarget.value);
            if (Number.isFinite(n)) onSet(n, true);
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          shape="square"
          icon={Plus}
          disabled={disabled}
          onClick={() => onNudge(true)}
          aria-label={`${label} 加 1`}
        />
      </div>
    </div>
  );
}
