"use client";

import { Separator } from "@/components/ui/separator";
import Link from "next/link";

interface PageHeaderProps {
  title: string;
  description?: string;
  showBreadcrumbs?: boolean;
  breadcrumbPath?: Array<{ label: string; href?: string }>;
}

export function PageHeader({ 
  title, 
  description, 
  showBreadcrumbs = false,
  breadcrumbPath 
}: PageHeaderProps) {
  // Default breadcrumb: Dashboard > [title]
  const defaultBreadcrumb = [
    { label: "Dashboard", href: "/dashboard" },
    { label: title }
  ];
  const breadcrumbs = breadcrumbPath || defaultBreadcrumb;

  if (showBreadcrumbs) {
    return (
      <div className="flex items-center gap-2 text-sm mb-2">
        {breadcrumbs.map((crumb, index) => (
          <div key={index} className="flex items-center gap-2">
            {crumb.href ? (
              <Link 
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-foreground font-medium">
                {crumb.label}
              </span>
            )}
            {index < breadcrumbs.length - 1 && (
              <span className="text-muted-foreground">/</span>
            )}
          </div>
        ))}
      </div>
    );
  }

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

