"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Check, MoreHorizontal } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface RadarData {
  topic: string;
  [entityName: string]: string | number;
}

interface Competitor {
  id: string;
  name: string;
  domain: string;
  color?: string;
}

interface CompetitivePositioningRadarProps {
  data: Array<{
    topic: string;
    entity_name: string;
    entity_type: "brand" | "competitor";
    competitor_id?: string | null;
    avg_sentiment_score: number;
  }>;
  competitors: Competitor[];
  brandName: string;
  brandDomain: string;
  brandColor?: string;
  availableTopics?: string[];
  topTopicsLimit?: number;
  isLoading?: boolean;
}

export function CompetitivePositioningRadar({
  data,
  competitors,
  brandName,
  brandDomain,
  brandColor = "#3b82f6",
  availableTopics = [],
  topTopicsLimit = 8,
  isLoading,
}: CompetitivePositioningRadarProps) {
  const [selectedCompetitorIds, setSelectedCompetitorIds] = useState<Set<string>>(new Set());
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [showAllCompetitors, setShowAllCompetitors] = useState(false);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const MAX_VISIBLE_COMPETITORS = 5;
  const MAX_VISIBLE_TOPICS = 5;
  const MAX_SELECTED_TOPICS = 5;
  const visibleCompetitors = competitors.slice(0, MAX_VISIBLE_COMPETITORS);
  const hiddenCompetitors = competitors.slice(MAX_VISIBLE_COMPETITORS);
  const hasMoreCompetitors = competitors.length > MAX_VISIBLE_COMPETITORS;

  const toggleCompetitor = (competitorId: string) => {
    const newSelected = new Set(selectedCompetitorIds);
    if (newSelected.has(competitorId)) {
      newSelected.delete(competitorId);
    } else {
      newSelected.add(competitorId);
    }
    setSelectedCompetitorIds(newSelected);
  };

  const toggleTopic = (topic: string) => {
    const newSelected = new Set(selectedTopics);
    if (newSelected.has(topic)) {
      newSelected.delete(topic);
    } else {
      // Only allow up to MAX_SELECTED_TOPICS topics
      if (newSelected.size < MAX_SELECTED_TOPICS) {
        newSelected.add(topic);
      }
    }
    setSelectedTopics(newSelected);
  };

  // Calculate available topics
  const topicsInData = useMemo(() => {
    return availableTopics.length > 0 
      ? availableTopics.filter(topic => 
          data.some(d => d.topic === topic)
        )
      : Array.from(new Set(data.map(d => d.topic)));
  }, [data, availableTopics]);

  // Initialize selectedTopics with first 5 topics when empty (only once when data loads)
  useEffect(() => {
    if (selectedTopics.size === 0 && topicsInData.length > 0) {
      // Select first 5 topics by default (up to MAX_SELECTED_TOPICS which is 4, but we'll use 5 for better UX)
      const defaultTopics = topicsInData.slice(0, Math.min(5, MAX_SELECTED_TOPICS));
      
      // Only update if we have topics to select
      if (defaultTopics.length > 0) {
        setSelectedTopics(new Set(defaultTopics));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicsInData.length]); // Only run when topics change

  const chartData = useMemo(() => {
    // Use selected topics if any, otherwise use top topics by frequency
    let topicsToUse: string[];
    if (selectedTopics.size > 0) {
      topicsToUse = Array.from(selectedTopics);
    } else {
      // Get first topics as fallback (shouldn't happen often due to useEffect)
      topicsToUse = topicsInData.slice(0, MAX_SELECTED_TOPICS);
    }

    // Get selected competitors
    const selectedCompetitors = competitors.filter((c) => selectedCompetitorIds.has(c.id));

    // Build radar data
    const radarData: RadarData[] = topicsToUse.map((topic) => {
      const dataPoint: RadarData = {
        topic,
        [brandName]: 0,
      };

      // Get brand score
      const brandData = data.find((d) => d.topic === topic && d.entity_type === "brand");
      if (brandData) {
        dataPoint[brandName] = brandData.avg_sentiment_score;
      }

      // Get selected competitor scores (match by competitor_id if available, otherwise by name)
      selectedCompetitors.forEach((competitor) => {
        const compData = data.find((d) => {
          if (d.topic !== topic || d.entity_type !== "competitor") return false;
          // Try to match by competitor_id first, then fallback to entity_name
          return (d.competitor_id && competitor.id === d.competitor_id) || 
                 (!d.competitor_id && competitor.name === d.entity_name);
        });
        dataPoint[competitor.name] = compData ? compData.avg_sentiment_score : 0;
      });

      return dataPoint;
    });

    return { radarData, selectedCompetitors, topicsToUse };
  }, [data, topTopicsLimit, selectedCompetitorIds, selectedTopics, competitors, brandName, availableTopics]);

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Competitive Positioning Radar</CardTitle>
          <CardDescription>360° view of brand vs competitors across topics</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="h-[400px] animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0 || chartData.radarData.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Competitive Positioning Radar</CardTitle>
          <CardDescription>360° view of brand vs competitors across topics</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">No positioning data available</p>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
          <p className="text-xs font-medium text-muted-foreground mb-2">{payload[0].payload.topic}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs">{entry.name}</span>
                </div>
                <span className="text-xs font-medium">
                  {typeof entry.value === "number" ? entry.value.toFixed(2) : "N/A"}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Competitive Positioning Radar</CardTitle>
        <CardDescription>
          Compare brand vs competitors across {chartData.radarData.length} key topics
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex gap-6">
        {/* Chart on the left */}
        <div className="w-150 min-w-0">
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={chartData.radarData}>
              <PolarGrid />
              <PolarAngleAxis
                dataKey="topic"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[-1, 1]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {/* Brand Radar */}
              <Radar
                name={brandName}
                dataKey={brandName}
                stroke={brandColor}
                fill={brandColor}
                fillOpacity={0.6}
              />
              {/* Selected Competitors Radars */}
              {chartData.selectedCompetitors.map((competitor) => {
                const color = competitor.color || "#ef4444";
                return (
                  <Radar
                    key={competitor.id}
                    name={competitor.name}
                    dataKey={competitor.name}
                    stroke={color}
                    fill={color}
                    fillOpacity={0.3}
                  />
                );
              })}
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Filters on the right */}
        <div className="flex-1 space-y-6 flex flex-col min-w-0">
          {/* Brand and Competitor Selector */}
          <div>
            <h3 className="text-sm font-medium mb-3">Entities</h3>
            <div className="flex flex-wrap gap-2">
              {/* Brand Button (always shown, always selected) */}
              <button
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border bg-primary text-primary-foreground border-primary hover:border-primary/50"
              >
                {brandName ? (
                  <>
                    <BrandLogo 
                      domain={brandDomain} 
                      name={brandName}
                      size={16} 
                    />
                    <span>{brandName}</span>
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 bg-primary-foreground/20 rounded-full animate-pulse" />
                    <span>Loading...</span>
                  </>
                )}
                <Check className="h-3 w-3" />
              </button>

              {/* Visible Competitor Buttons (max 5) */}
              {visibleCompetitors.map((competitor) => {
                const isSelected = selectedCompetitorIds.has(competitor.id);
                return (
                  <button
                    key={competitor.id}
                    onClick={() => toggleCompetitor(competitor.id)}
                    disabled={isLoading}
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border hover:border-primary/50",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted"
                    )}
                    style={isSelected && competitor.color ? {
                      backgroundColor: competitor.color,
                      borderColor: competitor.color,
                      color: '#fff'
                    } : undefined}
                  >
                    <BrandLogo 
                      domain={competitor.domain} 
                      name={competitor.name}
                      size={16} 
                    />
                    <span>{competitor.name}</span>
                    {isSelected && (
                      <Check className="h-3 w-3" />
                    )}
                  </button>
                );
              })}

              {/* More Competitors Dropdown (3 dots) */}
              {hasMoreCompetitors && (
                <DropdownMenu open={showAllCompetitors} onOpenChange={setShowAllCompetitors}>
                  <DropdownMenuTrigger asChild>
                    <button
                      disabled={isLoading}
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                        "border hover:border-primary/50 bg-background hover:bg-muted"
                      )}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
                    {hiddenCompetitors.map((competitor) => {
                      const isSelected = selectedCompetitorIds.has(competitor.id);
                      return (
                        <DropdownMenuItem
                          key={competitor.id}
                          onClick={() => {
                            toggleCompetitor(competitor.id);
                            setShowAllCompetitors(false);
                          }}
                          className={cn(
                            "flex items-center gap-2 cursor-pointer",
                            isSelected && "bg-muted"
                          )}
                        >
                          <BrandLogo domain={competitor.domain} name={competitor.name} size={16} />
                          <span>{competitor.name}</span>
                          {isSelected && (
                            <Check className="h-3 w-3 ml-auto" />
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {competitors.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Add competitors in Competitor Management to compare
                </p>
              )}
            </div>
          </div>

          {/* Topic Selector */}
          {topicsInData.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Topics</h3>
                {selectedTopics.size > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {selectedTopics.size} of {MAX_SELECTED_TOPICS}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {topicsInData.slice(0, MAX_VISIBLE_TOPICS).map((topic) => {
                  const isSelected = selectedTopics.has(topic);
                  const isDisabled = !isSelected && selectedTopics.size >= MAX_SELECTED_TOPICS;
                  return (
                    <button
                      key={topic}
                      onClick={() => toggleTopic(topic)}
                      disabled={isLoading || isDisabled}
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary hover:border-primary/50"
                          : isDisabled
                          ? "bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50"
                          : "bg-background hover:bg-muted hover:border-primary/50"
                      )}
                    >
                      <span>{topic}</span>
                      {isSelected && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}

                {/* More Topics Dropdown (3 dots) */}
                {topicsInData.length > MAX_VISIBLE_TOPICS && (
                  <DropdownMenu open={showAllTopics} onOpenChange={setShowAllTopics}>
                    <DropdownMenuTrigger asChild>
                      <button
                        disabled={isLoading}
                        className={cn(
                          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                          "border hover:border-primary/50 bg-background hover:bg-muted"
                        )}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
                      {topicsInData.slice(MAX_VISIBLE_TOPICS).map((topic) => {
                        const isSelected = selectedTopics.has(topic);
                        const isDisabled = !isSelected && selectedTopics.size >= MAX_SELECTED_TOPICS;
                        return (
                          <DropdownMenuItem
                            key={topic}
                            onClick={() => {
                              if (!isDisabled) {
                                toggleTopic(topic);
                              }
                              setShowAllTopics(false);
                            }}
                            disabled={isDisabled}
                            className={cn(
                              "flex items-center gap-2 cursor-pointer",
                              isSelected && "bg-muted",
                              isDisabled && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <span>{topic}</span>
                            {isSelected && (
                              <Check className="h-3 w-3 ml-auto" />
                            )}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              {selectedTopics.size === 0 && (
                <p className="text-xs text-muted-foreground italic mt-2">
                  Select up to {MAX_SELECTED_TOPICS} topics, or leave empty to show top {MAX_SELECTED_TOPICS} automatically
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

