"use client";

import { motion } from "framer-motion";
import { FolderKanban } from "lucide-react";
import { BasicInfoStep as BaseBasicInfoStep } from "@/components/projects/wizard-steps/basic-info-step";
import { containerVariants, itemVariants } from "../variants";

interface BasicInfoStepProps {
  projectName: string;
  clientUrl: string;
  selectedRegion: string;
  projectColor: string;
  onProjectNameChange: (value: string) => void;
  onClientUrlChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onColorChange: (value: string) => void;
  isLoading?: boolean;
}

export function BasicInfoStep({
  projectName,
  clientUrl,
  selectedRegion,
  projectColor,
  onProjectNameChange,
  onClientUrlChange,
  onRegionChange,
  onColorChange,
  isLoading = false,
}: BasicInfoStepProps) {
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
          <FolderKanban className="h-5 w-5 text-[#C2C2E1]" />
        </motion.div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create your first project</h2>
          <p className="text-sm text-muted-foreground mt-1">
            A project represents a brand or client you want to track
          </p>
        </div>
      </motion.div>

      <motion.div
        className="space-y-4"
        variants={itemVariants}
      >
        <BaseBasicInfoStep
          projectName={projectName}
          clientUrl={clientUrl}
          selectedRegion={selectedRegion}
          projectColor={projectColor}
          onProjectNameChange={onProjectNameChange}
          onClientUrlChange={onClientUrlChange}
          onRegionChange={onRegionChange}
          onColorChange={onColorChange}
          isLoading={isLoading}
          variant="onboarding"
        />
      </motion.div>
    </motion.div>
  );
}

