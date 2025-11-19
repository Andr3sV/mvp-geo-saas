"use client";

import { Building2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface BrandLogoProps {
  domain: string;
  name: string;
  size?: number;
  className?: string;
}

/**
 * BrandLogo component
 * Displays brand/competitor favicon from their domain
 * Falls back to icon if favicon fails to load
 */
export function BrandLogo({ domain, name, size = 20, className = "" }: BrandLogoProps) {
  const [error, setError] = useState(false);

  // Validate domain exists and is not empty
  if (!domain || typeof domain !== "string" || domain.trim() === "") {
    return (
      <div
        className={`flex items-center justify-center bg-muted rounded ${className}`}
        style={{ width: size, height: size }}
      >
        <Building2 className="h-3 w-3 text-muted-foreground" />
      </div>
    );
  }

  // Extract domain from URL if needed
  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];

  // Google Favicon API
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=${size}`;

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-muted rounded ${className}`}
        style={{ width: size, height: size }}
      >
        <Building2 className="h-3 w-3 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Image
      src={faviconUrl}
      alt={`${name} logo`}
      width={size}
      height={size}
      className={`rounded ${className}`}
      onError={() => setError(true)}
      unoptimized // Necessary for external images
    />
  );
}

