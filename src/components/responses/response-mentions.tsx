"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Mention {
  id: string;
  entity_name: string;
  brand_type: string;
  competitor_id: string | null;
}

interface ResponseMentionsProps {
  mentions: Mention[];
  className?: string;
}

export function ResponseMentions({ mentions, className }: ResponseMentionsProps) {
  if (mentions.length === 0) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <span className="text-sm text-muted-foreground font-medium">Mentions</span>
        <span className="text-sm text-muted-foreground">No brands mentioned</span>
      </div>
    );
  }

  // Group mentions by entity name and deduplicate
  const uniqueMentions = new Map<string, Mention>();
  mentions.forEach((m) => {
    if (!uniqueMentions.has(m.entity_name)) {
      uniqueMentions.set(m.entity_name, m);
    }
  });

  const sortedMentions = Array.from(uniqueMentions.values()).sort((a, b) => {
    // Client brand first
    if (a.brand_type === "client" && b.brand_type !== "client") return -1;
    if (a.brand_type !== "client" && b.brand_type === "client") return 1;
    return a.entity_name.localeCompare(b.entity_name);
  });

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <span className="text-sm text-muted-foreground font-medium">Mentions</span>
      {sortedMentions.map((mention) => {
        const isClientBrand = mention.brand_type === "client";
        return (
          <Badge
            key={mention.id}
            variant="secondary"
            className={cn(
              "gap-1.5",
              isClientBrand
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700"
                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            )}
          >
            {isClientBrand && <Check className="h-3 w-3" />}
            {mention.entity_name}
          </Badge>
        );
      })}
    </div>
  );
}

