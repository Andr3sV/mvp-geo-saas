"use client";

import { useState, useMemo } from "react";
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
  theme: string;
  [entityName: string]: string | number;
}

interface Competitor {
  id: string;
  name: string;
  domain: string;
  color?: string;
}

interface ThemeFrequencyRadarProps {
  data: Array<{
    theme_name: string;
    theme_category: "positive" | "negative";
    entity_name: string;
    entity_type: "brand" | "competitor";
    competitor_id?: string | null;
    frequency: number;
    total_evaluations: number;
  }>;
  competitors: Competitor[];
  brandName: string;
  brandDomain: string;
  brandColor?: string;
  availableThemes?: string[];
  topThemesLimit?: number;
  isLoading?: boolean;
}

export function ThemeFrequencyRadar({
  data,
  competitors,
  brandName,
  brandDomain,
  brandColor = "#3b82f6",
  availableThemes = [],
  topThemesLimit = 8,
  isLoading,
}: ThemeFrequencyRadarProps) {
  const [selectedCompetitorIds, setSelectedCompetitorIds] = useState<Set<string>>(new Set());
  const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set());
  const [showAllCompetitors, setShowAllCompetitors] = useState(false);
  const [showAllThemes, setShowAllThemes] = useState(false);
  const [viewMode, setViewMode] = useState<"frequency" | "percentage">("frequency");
  const MAX_VISIBLE_COMPETITORS = 5;
  const MAX_VISIBLE_THEMES = 5;
  const MAX_SELECTED_THEMES = 4;
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

  const toggleTheme = (theme: string) => {
    const newSelected = new Set(selectedThemes);
    if (newSelected.has(theme)) {
      newSelected.delete(theme);
    } else {
      // Only allow up to MAX_SELECTED_THEMES themes
      if (newSelected.size < MAX_SELECTED_THEMES) {
        newSelected.add(theme);
      }
    }
    setSelectedThemes(newSelected);
  };

  const chartData = useMemo(() => {
    // Get available themes from data if not provided
    const themesInData = availableThemes.length > 0 
      ? availableThemes.filter(theme => 
          data.some(d => d.theme_name === theme)
        )
      : Array.from(new Set(data.map(d => d.theme_name)));

    // Use selected themes if any, otherwise use top themes by frequency
    let themesToUse: string[];
    if (selectedThemes.size > 0) {
      themesToUse = Array.from(selectedThemes);
    } else {
      // Get top themes by frequency as fallback
      const themeCounts = new Map<string, number>();
      data.forEach((d) => {
        themeCounts.set(d.theme_name, (themeCounts.get(d.theme_name) || 0) + d.frequency);
      });
      themesToUse = Array.from(themeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, Math.min(topThemesLimit, MAX_SELECTED_THEMES))
        .map(([theme]) => theme);
    }

    // Get selected competitors
    const selectedCompetitors = competitors.filter((c) => selectedCompetitorIds.has(c.id));

    // Build radar data
    const radarData: RadarData[] = themesToUse.map((theme) => {
      const dataPoint: RadarData = {
        theme,
        [brandName]: 0,
      };

      // Get brand frequency
      const brandData = data.find((d) => d.theme_name === theme && d.entity_type === "brand");
      if (brandData) {
        if (viewMode === "percentage") {
          const percentage = brandData.total_evaluations > 0 
            ? (brandData.frequency / brandData.total_evaluations) * 100 
            : 0;
          dataPoint[brandName] = Math.round(percentage * 10) / 10; // Round to 1 decimal
        } else {
          dataPoint[brandName] = brandData.frequency;
        }
      }

      // Get selected competitor frequencies (match by competitor_id if available, otherwise by name)
      selectedCompetitors.forEach((competitor) => {
        const compData = data.find((d) => {
          if (d.theme_name !== theme || d.entity_type !== "competitor") return false;
          // Try to match by competitor_id first, then fallback to entity_name
          return (d.competitor_id && competitor.id === d.competitor_id) || 
                 (!d.competitor_id && competitor.name === d.entity_name);
        });
        if (compData) {
          if (viewMode === "percentage") {
            const percentage = compData.total_evaluations > 0 
              ? (compData.frequency / compData.total_evaluations) * 100 
              : 0;
            dataPoint[competitor.name] = Math.round(percentage * 10) / 10; // Round to 1 decimal
          } else {
            dataPoint[competitor.name] = compData.frequency;
          }
        } else {
          dataPoint[competitor.name] = 0;
        }
      });

      return dataPoint;
    });

    // Calculate max frequency for domain - safely handle empty data
    const allValues = radarData.flatMap(d => 
      Object.values(d).filter(v => typeof v === 'number') as number[]
    );
    const maxFrequency = Math.max(...allValues, 1) || 10; // Minimum 1, fallback to 10 if empty

    return { radarData, selectedCompetitors, themesToUse, themesInData, maxFrequency };
  }, [data, topThemesLimit, selectedCompetitorIds, selectedThemes, competitors, brandName, availableThemes, viewMode]);

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Theme Frequency Radar</CardTitle>
          <CardDescription>Compare theme frequency across entities</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="h-[400px] animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0 || chartData.radarData.length === 0) {
    // Determine why there's no data
    const hasEvaluations = data && data.length > 0;
    const hasThemes = chartData.themesInData.length > 0;
    
    let message = "No theme frequency data available";
    if (!hasEvaluations) {
      message = "No evaluations with theme data found. Theme data is generated when sentiment evaluations are processed.";
    } else if (!hasThemes) {
      message = "No themes found in evaluations. Themes are extracted from sentiment analysis responses.";
    } else {
      message = "No matching theme data for selected filters.";
    }

    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Theme Frequency Radar</CardTitle>
          <CardDescription>Compare theme frequency across entities</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">{message}</p>
            {!hasEvaluations && (
              <p className="text-xs text-muted-foreground mt-2">
                Try adjusting your date range or wait for sentiment evaluations to complete.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const theme = payload[0].payload.theme;
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
          <p className="text-xs font-medium text-muted-foreground mb-2">{theme}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => {
              // Find the original data to get frequency and total_evaluations
              const entityName = entry.name;
              const entityData = data.find((d) => {
                if (d.theme_name !== theme) return false;
                if (entityName === brandName) {
                  return d.entity_type === "brand";
                }
                return d.entity_type === "competitor" && 
                       (d.competitor_id ? competitors.find(c => c.id === d.competitor_id)?.name === entityName : d.entity_name === entityName);
              });

              const displayValue = typeof entry.value === "number" 
                ? viewMode === "percentage" 
                  ? `${entry.value}%`
                  : `${entry.value} times`
                : "N/A";

              const frequencyInfo = entityData && viewMode === "percentage"
                ? ` (${entityData.frequency}/${entityData.total_evaluations})`
                : "";

              return (
                <div key={index} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-xs">{entry.name}</span>
                  </div>
                  <span className="text-xs font-medium">
                    {displayValue}{frequencyInfo}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Theme Frequency Radar</CardTitle>
            <CardDescription>
              Compare theme frequency across {chartData.radarData.length} key themes
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("frequency")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                viewMode === "frequency"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Frequency
            </button>
            <button
              onClick={() => setViewMode("percentage")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                viewMode === "percentage"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Percentage
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex gap-6">
        {/* Chart on the left */}
        <div className="w-150 min-w-0">
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={chartData.radarData}>
              <PolarGrid />
              <PolarAngleAxis
                dataKey="theme"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, chartData.maxFrequency]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickFormatter={(value) => {
                  if (viewMode === "percentage") {
                    return `${value}%`;
                  }
                  return value.toString();
                }}
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

          {/* Theme Selector */}
          {chartData.themesInData.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Themes</h3>
                {selectedThemes.size > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {selectedThemes.size} of {MAX_SELECTED_THEMES}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {chartData.themesInData.slice(0, MAX_VISIBLE_THEMES).map((theme) => {
                  const isSelected = selectedThemes.has(theme);
                  const isDisabled = !isSelected && selectedThemes.size >= MAX_SELECTED_THEMES;
                  return (
                    <button
                      key={theme}
                      onClick={() => toggleTheme(theme)}
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
                      <span>{theme}</span>
                      {isSelected && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}

                {/* More Themes Dropdown (3 dots) */}
                {chartData.themesInData.length > MAX_VISIBLE_THEMES && (
                  <DropdownMenu open={showAllThemes} onOpenChange={setShowAllThemes}>
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
                      {chartData.themesInData.slice(MAX_VISIBLE_THEMES).map((theme) => {
                        const isSelected = selectedThemes.has(theme);
                        const isDisabled = !isSelected && selectedThemes.size >= MAX_SELECTED_THEMES;
                        return (
                          <DropdownMenuItem
                            key={theme}
                            onClick={() => {
                              if (!isDisabled) {
                                toggleTheme(theme);
                              }
                              setShowAllThemes(false);
                            }}
                            disabled={isDisabled}
                            className={cn(
                              "flex items-center gap-2 cursor-pointer",
                              isSelected && "bg-muted",
                              isDisabled && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <span>{theme}</span>
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
              {selectedThemes.size === 0 && (
                <p className="text-xs text-muted-foreground italic mt-2">
                  Select up to {MAX_SELECTED_THEMES} themes, or leave empty to show top {MAX_SELECTED_THEMES} automatically
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

