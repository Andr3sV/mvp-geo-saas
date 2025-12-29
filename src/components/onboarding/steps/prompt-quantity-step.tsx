"use client";

import { motion } from "framer-motion";
import { Hash } from "lucide-react";
import { PromptQuantityStep as BasePromptQuantityStep } from "@/components/projects/wizard-steps/prompt-quantity-step";
import { containerVariants, itemVariants } from "../variants";

interface PromptQuantityStepProps {
  totalPrompts: number;
  onTotalPromptsChange: (value: number) => void;
  isLoading?: boolean;
}

export function PromptQuantityStep({
  totalPrompts,
  onTotalPromptsChange,
  isLoading = false,
}: PromptQuantityStepProps) {
  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="flex items-center gap-3"
        variants={itemVariants}
      >
        <motion.div
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C2C2E1]/20"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <Hash className="h-5 w-5 text-[#C2C2E1]" />
        </motion.div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Choose number of prompts</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Select how many prompts you want to track
          </p>
        </div>
      </motion.div>

      <motion.div
        className="space-y-4"
        variants={itemVariants}
      >
        <BasePromptQuantityStep
          totalPrompts={totalPrompts}
          onTotalPromptsChange={onTotalPromptsChange}
          isLoading={isLoading}
          variant="onboarding"
        />
      </motion.div>
    </motion.div>
  );
}

