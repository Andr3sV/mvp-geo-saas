"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  name: string;
  description: string;
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: number;
}

export function ProgressSteps({ steps, currentStep }: ProgressStepsProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
        {steps.map((step) => (
          <li key={step.id} className="md:flex-1">
            <div
              className={cn(
                "group flex flex-col border-l-4 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4",
                step.id < currentStep
                  ? "border-primary"
                  : step.id === currentStep
                  ? "border-primary"
                  : "border-border"
              )}
            >
              <span className="flex items-center text-sm font-medium">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs",
                    step.id < currentStep
                      ? "bg-primary text-primary-foreground"
                      : step.id === currentStep
                      ? "border-2 border-primary text-primary"
                      : "border-2 border-muted-foreground text-muted-foreground"
                  )}
                >
                  {step.id < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.id
                  )}
                </span>
                <span
                  className={cn(
                    "ml-2",
                    step.id <= currentStep
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {step.name}
                </span>
              </span>
              <span className="ml-8 mt-1 text-xs text-muted-foreground md:ml-0 md:mt-2">
                {step.description}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}

