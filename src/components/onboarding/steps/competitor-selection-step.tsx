"use client";

import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { CompetitorSelectionStep as BaseCompetitorSelectionStep } from "@/components/projects/wizard-steps/competitor-selection-step";
import { containerVariants, itemVariants } from "../variants";

interface CompetitorSelectionStepProps {
  suggestedCompetitors: Array<{ name: string; domain: string }> | null;
  selectedCompetitors: Array<{ name: string; domain: string }>;
  newCompetitors: Array<{ name: string; domain: string }>;
  onSelectedChange: (competitors: Array<{ name: string; domain: string }>) => void;
  onNewCompetitorsChange: (competitors: Array<{ name: string; domain: string }>) => void;
  isLoading?: boolean;
}

export function CompetitorSelectionStep({
  suggestedCompetitors,
  selectedCompetitors,
  newCompetitors,
  onSelectedChange,
  onNewCompetitorsChange,
  isLoading = false,
}: CompetitorSelectionStepProps) {
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
          <Users className="h-5 w-5 text-[#C2C2E1]" />
        </motion.div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Select Competitors</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose competitors to track for competitive analysis
          </p>
        </div>
      </motion.div>

      <motion.div
        className="space-y-4"
        variants={itemVariants}
      >
        <BaseCompetitorSelectionStep
          suggestedCompetitors={suggestedCompetitors}
          selectedCompetitors={selectedCompetitors}
          newCompetitors={newCompetitors}
          onSelectedChange={onSelectedChange}
          onNewCompetitorsChange={onNewCompetitorsChange}
          isLoading={isLoading}
          variant="onboarding"
        />
      </motion.div>
    </motion.div>
  );
}

