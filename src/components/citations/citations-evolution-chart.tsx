"use client";

import { Link2 } from "lucide-react";
import { EvolutionChart } from "@/components/shared/evolution-chart";

interface Competitor {
  id: string;
  name: string;
  domain: string;
}

interface CitationsEvolutionChartProps {
  data: any[];
  brandName: string;
  brandDomain: string;
  brandColor?: string;
  competitorName: string;
  competitorDomain: string;
  competitorColor?: string;
  competitors: Competitor[];
  selectedCompetitorId: string | null;
  onCompetitorChange: (competitorId: string) => void;
  isLoading: boolean;
  infoTooltip?: string;
}

// Helper function to convert hex to rgb
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "rgb(34, 197, 94)";
  return `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`;
}

export function CitationsEvolutionChart({
  data,
  brandName,
  brandDomain,
  brandColor,
  competitorName,
  competitorDomain,
  competitorColor,
  competitors,
  selectedCompetitorId,
  onCompetitorChange,
  isLoading,
  infoTooltip,
}: CitationsEvolutionChartProps) {
  return (
    <EvolutionChart
      title="Your Domain Citations Over Time"
      description="Track daily citation trends with real URLs from AI responses"
      icon={Link2}
      data={data}
      primaryDataKey="brandCitations"
      secondaryDataKey="competitorCitations"
      dataLabel="citation"
      dateKey="date"
      primaryEntityName={brandName}
      primaryEntityDomain={brandDomain}
      secondaryEntityName={competitorName}
      secondaryEntityDomain={competitorDomain}
      entities={competitors}
      selectedEntityId={selectedCompetitorId}
      onEntityChange={onCompetitorChange}
      isLoading={isLoading}
      primaryColor={brandColor ? hexToRgb(brandColor) : "rgb(34, 197, 94)"}
      secondaryColor={competitorColor ? hexToRgb(competitorColor) : "rgb(249, 115, 22)"}
      emptyStateMessage="Run analysis with Perplexity or Gemini to track citations over time"
      infoTooltip={infoTooltip}
    />
  );
}

