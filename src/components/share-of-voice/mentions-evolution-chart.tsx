"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LineChart } from "@tremor/react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { TrendingUp } from "lucide-react";

interface Competitor {
  id: string;
  name: string;
  domain: string;
}

interface MentionsEvolutionChartProps {
  data: any[];
  brandName: string;
  competitorName: string;
  competitors: Competitor[];
  selectedCompetitorId: string | null;
  onCompetitorChange: (competitorId: string) => void;
  isLoading: boolean;
}

export function MentionsEvolutionChart({
  data,
  brandName,
  competitorName,
  competitors,
  selectedCompetitorId,
  onCompetitorChange,
  isLoading,
}: MentionsEvolutionChartProps) {
  // Transform data to use real brand/competitor names as keys
  const transformedData = data.map((item) => {
    const transformed: any = {
      date: item.date,
      [brandName]: item.brandMentions,
    };
    
    if (selectedCompetitorId && competitorName) {
      transformed[competitorName] = item.competitorMentions;
    }
    
    return transformed;
  });

  // Prepare categories with real names
  const categories = selectedCompetitorId && competitorName
    ? [brandName, competitorName]
    : [brandName];

  // Colors: blue for brand, red for competitor
  const categoryColors = selectedCompetitorId
    ? ["blue", "red"]
    : ["blue"];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Mentions Over Time
            </CardTitle>
            <CardDescription>
              Track daily mention trends for your brand vs competitors
            </CardDescription>
          </div>

          <div className="w-[280px]">
            <Select
              value={selectedCompetitorId || "none"}
              onValueChange={(value) => onCompetitorChange(value === "none" ? "" : value)}
              disabled={isLoading || competitors.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Compare with..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <span>📊 Brand only</span>
                  </div>
                </SelectItem>
                {competitors.map((comp) => (
                  <SelectItem key={comp.id} value={comp.id}>
                    <div className="flex items-center gap-2">
                      <BrandLogo domain={comp.domain} name={comp.name} size={16} />
                      <span>{comp.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {competitors.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Add competitors to compare
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="h-[350px] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="mt-2 text-sm text-muted-foreground">Loading chart data...</p>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>No data available yet</p>
              <p className="text-sm mt-1">Run analyses to see mention trends</p>
            </div>
          </div>
        ) : (
          <LineChart
            className="h-80"
            data={transformedData}
            index="date"
            categories={categories}
            colors={categoryColors}
            valueFormatter={(value) => `${value} mentions`}
            yAxisWidth={48}
            showLegend={true}
            showAnimation={true}
            curveType="linear"
          />
        )}
      </CardContent>
    </Card>
  );
}

