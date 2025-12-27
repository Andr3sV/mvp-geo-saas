"use client";

import { useState, useEffect } from "react";
import { X, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface WelcomeTipProps {
  /** Unique identifier to track if user has dismissed this tip */
  id: string;
  /** The description/explanation text */
  children: React.ReactNode;
  /** Optional custom icon */
  icon?: React.ReactNode;
  /** Optional className for custom styling */
  className?: string;
}

const STORAGE_KEY = "dismissed-welcome-tips";

function getDismissedTips(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function dismissTip(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const dismissed = getDismissedTips();
    if (!dismissed.includes(id)) {
      dismissed.push(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
    }
  } catch {
    // Silently fail if localStorage is not available
  }
}

export function WelcomeTip({ id, children, icon, className }: WelcomeTipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if tip was previously dismissed
    const dismissed = getDismissedTips();
    if (!dismissed.includes(id)) {
      setIsVisible(true);
    }
  }, [id]);

  const handleDismiss = () => {
    setIsAnimating(true);
    // Wait for animation to complete before hiding
    setTimeout(() => {
      dismissTip(id);
      setIsVisible(false);
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-primary/20 bg-primary/5 p-4 pr-10 transition-all duration-300",
        isAnimating && "opacity-0 transform -translate-y-2",
        className
      )}
    >
      {/* Dismiss button - Top right */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label="Dismiss tip"
      >
        <X className="h-4 w-4" strokeWidth={2.5} />
      </button>
      
      <div className="flex gap-3 items-start">
        {/* Icon */}
        <div className="flex-shrink-0 flex items-center min-h-[1.5rem]">
          {icon || (
            <div className="p-1.5 rounded-md bg-primary/10">
              <Lightbulb className="h-4 w-4 text-primary" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex items-center min-h-[1.5rem]">
          <div className="text-xs text-foreground/80 leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Utility function to reset all dismissed tips (useful for testing)
 */
export function resetAllWelcomeTips(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

