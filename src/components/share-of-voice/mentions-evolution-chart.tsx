"use client";

import { TrendingUp } from "lucide-react";
import { EvolutionChart } from "@/components/shared/evolution-chart";
import { useEffect } from "react";

// Helper function to convert hex to rgb
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "rgb(59, 130, 246)";
  return `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`;
}

interface Competitor {
  id: string;
  name: string;
  domain: string;
}

interface MentionsEvolutionChartProps {
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
}

export function MentionsEvolutionChart({
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
}: MentionsEvolutionChartProps) {
  useEffect(() => {
    console.log('🔍 [MentionsEvolutionChart] Received competitors:', {
      count: competitors.length,
      competitors: competitors.map(c => ({ name: c.name, id: c.id, domain: c.domain }))
    });
  }, [competitors]);

  return (
    <EvolutionChart
      title="Mentions Evolution"
      description="Track daily mention trends"
      icon={TrendingUp}
      data={data}
      primaryDataKey="brandMentions"
      secondaryDataKey="competitorMentions"
      dataLabel="mention"
      dateKey="date"
      primaryEntityName={brandName}
      primaryEntityDomain={brandDomain}
      secondaryEntityName={competitorName}
      secondaryEntityDomain={competitorDomain}
      entities={competitors}
      selectedEntityId={selectedCompetitorId}
      onEntityChange={onCompetitorChange}
      isLoading={isLoading}
      primaryColor={brandColor ? hexToRgb(brandColor) : "rgb(59, 130, 246)"}
      secondaryColor={competitorColor ? hexToRgb(competitorColor) : "rgb(239, 68, 68)"}
      emptyStateMessage="Run analyses with different prompts to see mention trends"
    />
  );
}
