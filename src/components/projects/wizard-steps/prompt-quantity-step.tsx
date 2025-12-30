"use client";

import { PromptQuantitySelector } from "@/components/ui/prompt-quantity-selector";

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
  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Select how many prompts you want to track. They will be distributed evenly across categories after we analyze your website.
      </div>
      
      <PromptQuantitySelector
        value={totalPrompts}
        onChange={onTotalPromptsChange}
        min={10}
        max={200}
        step={5}
        presetValues={[10, 25, 50, 100, 200]}
        disabled={isLoading}
        variant={variant}
      />
    </div>
  );
}

