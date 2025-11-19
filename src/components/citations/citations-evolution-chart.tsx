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
  competitorName: string;
  competitorDomain: string;
  competitors: Competitor[];
  selectedCompetitorId: string | null;
  onCompetitorChange: (competitorId: string) => void;
  isLoading: boolean;
}

export function CitationsEvolutionChart({
  data,
  brandName,
  brandDomain,
  competitorName,
  competitorDomain,
  competitors,
  selectedCompetitorId,
  onCompetitorChange,
  isLoading,
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
      primaryColor="rgb(34, 197, 94)" // green-500
      secondaryColor="rgb(249, 115, 22)" // orange-500
      emptyStateMessage="Run analysis with Perplexity or Gemini to track citations over time"
    />
  );
}

