"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ReviewEditStep as BaseReviewEditStep } from "@/components/projects/wizard-steps/review-edit-step";
import { containerVariants, itemVariants } from "../variants";

interface ReviewEditStepProps {
  categories: Array<{
    name: string;
    prompts: Array<{ text: string; order: number; id?: string }>;
  }>;
  onCategoriesChange: (categories: {
    categories: Array<{
      name: string;
      prompts: Array<{ text: string; order: number; id?: string }>;
    }>;
  }) => void;
  isLoading?: boolean;
}

export function ReviewEditStep({
  categories,
  onCategoriesChange,
  isLoading = false,
}: ReviewEditStepProps) {
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
          <Sparkles className="h-5 w-5 text-[#C2C2E1]" />
        </motion.div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Review & Edit</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review and customize the prompts that will be tracked
          </p>
        </div>
      </motion.div>

      <motion.div
        className="space-y-4"
        variants={itemVariants}
      >
        <BaseReviewEditStep
          categories={categories}
          onCategoriesChange={onCategoriesChange}
          isLoading={isLoading}
          variant="onboarding"
        />
      </motion.div>
    </motion.div>
  );
}

