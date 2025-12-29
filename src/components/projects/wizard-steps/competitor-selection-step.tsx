"use client";

import { CompetitorSelection } from "@/components/projects/competitor-selection";

interface CompetitorSelectionStepProps {
  suggestedCompetitors: Array<{ name: string; domain: string }> | null;
  selectedCompetitors: Array<{ name: string; domain: string }>;
  newCompetitors: Array<{ name: string; domain: string }>;
  onSelectedChange: (competitors: Array<{ name: string; domain: string }>) => void;
  onNewCompetitorsChange: (competitors: Array<{ name: string; domain: string }>) => void;
  isLoading?: boolean;
  variant?: "wizard" | "onboarding";
}

export function CompetitorSelectionStep({
  suggestedCompetitors,
  selectedCompetitors,
  newCompetitors,
  onSelectedChange,
  onNewCompetitorsChange,
  isLoading = false,
  variant = "wizard",
}: CompetitorSelectionStepProps) {
  return (
    <CompetitorSelection
      suggestedCompetitors={suggestedCompetitors || []}
      selectedCompetitors={selectedCompetitors}
      newCompetitors={newCompetitors}
      onSelectedChange={onSelectedChange}
      onNewCompetitorsChange={onNewCompetitorsChange}
      isLoading={isLoading}
    />
  );
}

