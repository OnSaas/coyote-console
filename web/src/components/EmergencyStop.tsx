import { Button } from "@cloudflare/kumo/components/button";
import { Stop } from "@phosphor-icons/react";

interface Props {
  onStop: () => void;
}

export function EmergencyStop({ onStop }: Props) {
  return (
    <Button
      variant="destructive"
      size="lg"
      icon={Stop}
      onClick={onStop}
      className="w-full"
    >
      急停
    </Button>
  );
}
