"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, TrendingUp, Search, MoreHorizontal, Check } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { EvaluationGallery } from "./evaluation-gallery";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  getThemesWithMetrics,
  getEvaluationsByTheme,
  ThemeWithMetrics,
  EvaluationByTheme,
} from "@/lib/queries/brand-evaluations";

interface ThemesTableProps {
  projectId: string;
  dateRange: { from: Date; to: Date };
  previousDateRange?: { from: Date; to: Date };
  isLoading?: boolean;
  brandName?: string;
  brandDomain?: string;
  competitors?: Array<{ id: string; name: string; domain?: string; color?: string }>;
}

export function ThemesTable({
  projectId,
  dateRange,
  previousDateRange,
  isLoading: externalLoading,
  brandName,
  brandDomain,
  competitors = [],
}: ThemesTableProps) {
  const [themes, setThemes] = useState<ThemeWithMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedThemeId, setExpandedThemeId] = useState<string | null>(null);
  const [evaluationsForTheme, setEvaluationsForTheme] = useState<EvaluationByTheme[]>([]);
  const [filteredEvaluations, setFilteredEvaluations] = useState<EvaluationByTheme[]>([]);
  const [currentEvaluationIndex, setCurrentEvaluationIndex] = useState(0);
  const [isLoadingEvaluations, setIsLoadingEvaluations] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<"all" | "positive" | "negative" | "trending">("all");
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null); // null = all, "brand" = brand, competitor_id for competitors
  const [showMoreEntities, setShowMoreEntities] = useState(false);

  // Prepare all entities (brand + competitors) for display
  const allEntities = useMemo(() => {
    const entities: Array<{ id: string; name: string; domain?: string; type: "brand" | "competitor" }> = [];
    if (brandName && brandDomain) {
      entities.push({ id: "brand", name: brandName, domain: brandDomain, type: "brand" });
    }
    competitors.forEach((comp) => {
      entities.push({ id: comp.id, name: comp.name, domain: comp.domain, type: "competitor" });
    });
    return entities;
  }, [brandName, brandDomain, competitors]);

  const MAX_VISIBLE_ENTITIES = 6;
  const visibleEntities = allEntities.slice(0, MAX_VISIBLE_ENTITIES);
  const hiddenEntities = allEntities.slice(MAX_VISIBLE_ENTITIES);
  const hasMoreEntities = allEntities.length > MAX_VISIBLE_ENTITIES;

  // Load themes with metrics
  useEffect(() => {
    const loadThemes = async () => {
      if (!projectId) return;

      setIsLoading(true);
      try {
        // Build entity filter based on selected entity
        let entityFilter: { entityType: "brand" | "competitor"; competitorId?: string | null } | undefined;
        if (selectedEntityId === "brand") {
          entityFilter = { entityType: "brand" };
        } else if (selectedEntityId && selectedEntityId !== null) {
          entityFilter = { entityType: "competitor", competitorId: selectedEntityId };
        }

        const themesData = await getThemesWithMetrics(
          projectId,
          dateRange.from,
          dateRange.to,
          previousDateRange?.from,
          previousDateRange?.to,
          entityFilter
        );
        setThemes(themesData);
      } catch (error) {
        console.error("Error loading themes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadThemes();
  }, [projectId, dateRange.from, dateRange.to, previousDateRange?.from, previousDateRange?.to, selectedEntityId]);

  // Load evaluations when a theme is expanded
  useEffect(() => {
    const loadEvaluations = async () => {
      if (!expandedThemeId || !projectId) {
        setEvaluationsForTheme([]);
        setFilteredEvaluations([]);
        setCurrentEvaluationIndex(0);
        return;
      }

      setIsLoadingEvaluations(true);
      try {
        const evaluations = await getEvaluationsByTheme(
          expandedThemeId,
          projectId,
          dateRange.from,
          dateRange.to,
          100 // Load up to 100 evaluations
        );
        setEvaluationsForTheme(evaluations);
        setCurrentEvaluationIndex(0);
      } catch (error) {
        console.error("Error loading evaluations:", error);
        setEvaluationsForTheme([]);
        setFilteredEvaluations([]);
      } finally {
        setIsLoadingEvaluations(false);
      }
    };

    loadEvaluations();
  }, [expandedThemeId, projectId, dateRange.from, dateRange.to]);

  // Filter evaluations by selected entity
  useEffect(() => {
    if (selectedEntityId === null) {
      setFilteredEvaluations(evaluationsForTheme);
    } else if (selectedEntityId === "brand") {
      setFilteredEvaluations(evaluationsForTheme.filter((e) => e.entity_type === "brand"));
    } else {
      setFilteredEvaluations(evaluationsForTheme.filter((e) => e.competitor_id === selectedEntityId));
    }
    setCurrentEvaluationIndex(0);
  }, [selectedEntityId, evaluationsForTheme]);

  // Filter themes based on sentiment filter and search
  const filteredThemes = useMemo(() => {
    let filtered = themes;

    // Apply sentiment filter
    if (sentimentFilter === "positive") {
      filtered = filtered.filter((t) => t.sentiment === "positive");
    } else if (sentimentFilter === "negative") {
      filtered = filtered.filter((t) => t.sentiment === "negative");
    } else if (sentimentFilter === "trending") {
      filtered = filtered.filter((t) => t.change > 0);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((t) =>
        t.theme_name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [themes, sentimentFilter, searchQuery]);

  const toggleExpand = (themeId: string) => {
    if (expandedThemeId === themeId) {
      setExpandedThemeId(null);
    } else {
      setExpandedThemeId(themeId);
    }
  };

  const handlePrevious = () => {
    if (currentEvaluationIndex > 0) {
      setCurrentEvaluationIndex(currentEvaluationIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentEvaluationIndex < evaluationsForTheme.length - 1) {
      setCurrentEvaluationIndex(currentEvaluationIndex + 1);
    }
  };

  const handleClose = () => {
    setExpandedThemeId(null);
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  const getChangeIndicator = (change: number) => {
    if (change > 0) return `+${change}`;
    if (change < 0) return `${change}`;
    return "-";
  };

  if (externalLoading || isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Themes</CardTitle>
          <CardDescription>
            Key themes and patterns surfaced by AI when referencing the brand
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Themes</CardTitle>
        <CardDescription>
          Key themes and patterns surfaced by AI when referencing the brand
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Entity Filter Buttons (Brand/Competitors) */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={selectedEntityId === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedEntityId(null)}
              className={cn(
                "flex items-center gap-2 px-3",
                selectedEntityId === null && "bg-primary text-primary-foreground"
              )}
            >
              All
            </Button>
            {visibleEntities.map((entity) => (
              <Button
                key={entity.id}
                variant={selectedEntityId === entity.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedEntityId(entity.id)}
                className={cn(
                  "flex items-center gap-2 px-3",
                  selectedEntityId === entity.id && "bg-primary text-primary-foreground"
                )}
              >
                {entity.domain && (
                  <BrandLogo domain={entity.domain} name={entity.name} size={16} />
                )}
                <span>{entity.name}</span>
              </Button>
            ))}
            {hasMoreEntities && (
              <DropdownMenu open={showMoreEntities} onOpenChange={setShowMoreEntities}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 px-3"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
                  {hiddenEntities.map((entity) => {
                    const isSelected = selectedEntityId === entity.id;
                    return (
                      <DropdownMenuItem
                        key={entity.id}
                        onClick={() => {
                          setSelectedEntityId(entity.id);
                          setShowMoreEntities(false);
                        }}
                        className={cn(
                          "flex items-center gap-2 cursor-pointer",
                          isSelected && "bg-muted"
                        )}
                      >
                        {entity.domain && (
                          <BrandLogo domain={entity.domain} name={entity.name} size={16} />
                        )}
                        <span>{entity.name}</span>
                        {isSelected && <Check className="h-3 w-3 ml-auto" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Sentiment Filter Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={sentimentFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSentimentFilter("all")}
            >
              All
            </Button>
            <Button
              variant={sentimentFilter === "positive" ? "default" : "outline"}
              size="sm"
              onClick={() => setSentimentFilter("positive")}
            >
              Positive
            </Button>
            <Button
              variant={sentimentFilter === "negative" ? "default" : "outline"}
              size="sm"
              onClick={() => setSentimentFilter("negative")}
            >
              Negative
            </Button>
            <Button
              variant={sentimentFilter === "trending" ? "default" : "outline"}
              size="sm"
              onClick={() => setSentimentFilter("trending")}
            >
              Trending
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter themes"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Table */}
        {filteredThemes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? "No themes match your search" : "No themes found"}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredThemes.map((theme) => {
              const isExpanded = expandedThemeId === theme.theme_id;

              return (
                <Collapsible
                  key={theme.theme_id}
                  open={isExpanded}
                  onOpenChange={() => toggleExpand(theme.theme_id)}
                >
                  <div className="border rounded-lg">
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-4 h-auto hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}

                          <div className="text-left flex-1 min-w-0">
                            <div className="font-medium truncate">{theme.theme_name}</div>
                          </div>

                          <Badge
                            variant="outline"
                            className={
                              theme.sentiment === "positive"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }
                          >
                            {theme.sentiment === "positive" ? "Positive" : "Negative"}
                          </Badge>

                          <div className="flex items-center gap-3 min-w-[120px]">
                            <div className="flex-1 flex items-center gap-2">
                              <span className="font-medium">{theme.occurrences}</span>
                              {theme.change !== 0 && (
                                <span className={`text-sm ${getChangeColor(theme.change)}`}>
                                  {getChangeIndicator(theme.change)}
                                </span>
                              )}
                              {theme.change === 0 && (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </div>
                            {/* Horizontal bar graph */}
                            <div className="flex-1 max-w-[100px] h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{
                                  width: `${
                                    filteredThemes.length > 0
                                      ? Math.min(
                                          (theme.occurrences / Math.max(...filteredThemes.map((t) => t.occurrences))) *
                                            100,
                                          100
                                        )
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      {isExpanded && (
                        <EvaluationGallery
                          evaluations={filteredEvaluations}
                          currentIndex={currentEvaluationIndex}
                          onPrevious={handlePrevious}
                          onNext={handleNext}
                          onClose={handleClose}
                          isLoading={isLoadingEvaluations}
                          brandDomain={brandDomain}
                          competitorDomains={new Map(competitors.map((c) => [c.id, c.domain || ""]))}
                        />
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

