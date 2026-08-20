import { Text } from "@cloudflare/kumo/components/text";
import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <Text variant="heading2" as="h1">
          {title}
        </Text>
        {description ? (
          <Text variant="secondary" size="sm">
            {description}
          </Text>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
