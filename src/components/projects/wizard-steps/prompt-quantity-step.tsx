"use client";

import { Label } from "@/components/ui/label";

interface PromptQuantityStepProps {
  totalPrompts: number;
  onTotalPromptsChange: (value: number) => void;
  isLoading?: boolean;
  variant?: "wizard" | "onboarding";
}

export function PromptQuantityStep({
  totalPrompts,
  onTotalPromptsChange,
  isLoading = false,
  variant = "wizard",
}: PromptQuantityStepProps) {
  if (variant === "wizard") {
    return (
      <div className="space-y-6">
        <div className="text-sm text-muted-foreground">
          Select how many prompts you want to track. They will be distributed evenly across categories after we analyze your website.
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="total-prompts" className="text-base font-medium">Total Prompts to Track</Label>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">{totalPrompts}</span>
              <span className="text-sm text-muted-foreground font-medium">prompts</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="relative py-2">
              <input
                id="total-prompts"
                type="range"
                min={10}
                max={200}
                step={5}
                value={totalPrompts}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 10;
                  onTotalPromptsChange(Math.max(10, Math.min(200, value)));
                }}
                disabled={isLoading}
                className="w-full slider-custom cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground font-medium px-1">
              <span>10</span>
              <span>200</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Onboarding variant
  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Select how many prompts you want to track. They will be distributed evenly across categories after we analyze your website.
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="total-prompts" className="text-base font-medium">Total Prompts to Track</Label>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-foreground">{totalPrompts}</span>
            <span className="text-sm text-muted-foreground font-medium">prompts</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="relative py-2">
            <input
              id="total-prompts"
              type="range"
              min={10}
              max={200}
              step={5}
              value={totalPrompts}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 10;
                onTotalPromptsChange(Math.max(10, Math.min(200, value)));
              }}
              disabled={isLoading}
              className="w-full slider-custom cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground font-medium px-1">
            <span>10</span>
            <span>200</span>
          </div>
        </div>
      </div>
    </div>
  );
}

