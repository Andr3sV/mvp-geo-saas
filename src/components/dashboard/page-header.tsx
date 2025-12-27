"use client";

import { Separator } from "@/components/ui/separator";

interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="flex items-baseline gap-2 mb-2">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && (
        <>
          <Separator orientation="vertical" className="h-6 self-center" />
          <p className="text-muted-foreground">{description}</p>
        </>
      )}
    </div>
  );
}

