import { Button } from "@cloudflare/kumo/components/button";
import { Text } from "@cloudflare/kumo/components/text";
import type { Icon } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";

interface Props {
  icon: Icon;
  title: string;
  description: string;
  action?: { label: string; to?: string; onClick?: () => void };
}

export function EmptyState({ icon: IconCmp, title, description, action }: Props) {
  const nav = useNavigate();
  return (
    <div className="dg-panel flex min-h-[320px] w-full flex-col items-center justify-center gap-4 px-8 py-16 text-center">
      <IconCmp size={40} className="dg-gold" />
      <Text variant="heading3" as="h2">
        {title}
      </Text>
      <Text variant="secondary">{description}</Text>
      {action ? (
        <Button
          onClick={() => {
            if (action.to) nav(action.to);
            action.onClick?.();
          }}
        >
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
