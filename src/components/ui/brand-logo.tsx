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

// Cache of failed favicons to avoid retries
const failedFavicons = new Set<string>();

// Fallback icon component
function FallbackIcon({ size, className }: { size: number; className: string }) {
  return (
    <div
      className={`flex items-center justify-center bg-muted rounded ${className}`}
      style={{ width: size, height: size }}
    >
      <Building2 className="h-3 w-3 text-muted-foreground" />
    </div>
  );
}

/**
 * BrandLogo component
 * Displays brand/competitor favicon from their domain
 * Falls back to icon if favicon fails to load
 * Optimized with lazy loading and error caching
 */
export function BrandLogo({ domain, name, size = 20, className = "" }: BrandLogoProps) {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Validate domain exists and is not empty
  if (!domain || typeof domain !== "string" || domain.trim() === "") {
    return <FallbackIcon size={size} className={className} />;
  }

  // Extract domain from URL if needed
  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];

  // Check if this domain already failed before
  if (failedFavicons.has(cleanDomain)) {
    return <FallbackIcon size={size} className={className} />;
  }

  // Google Favicon API - Always use max size (128) for better quality, then scale down
  const faviconSize = 128;
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=${faviconSize}`;

  const handleError = () => {
    failedFavicons.add(cleanDomain);
    setError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  if (error) {
    return <FallbackIcon size={size} className={className} />;
  }

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {isLoading && (
        <div className="absolute inset-0 bg-muted rounded animate-pulse" />
      )}
      <Image
        src={faviconUrl}
        alt={`${name} logo`}
        width={128}
        height={128}
        className={`rounded ${className}`}
        style={{ 
          objectFit: 'contain',
          width: size,
          height: size,
        }}
        loading="lazy" // Lazy load favicons to avoid blocking render
        onError={handleError}
        onLoad={handleLoad}
        unoptimized // Necessary for external images
      />
    </div>
  );
}

