"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Users, Trophy } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { useProject } from "@/contexts/project-context";
import {
  getShareOfVoice,
  getShareOfVoiceTrends,
  getShareOfVoiceInsights,
} from "@/lib/queries/share-of-voice";

export default function ShareOfVoicePage() {
  const { selectedProjectId } = useProject();
  const [isLoading, setIsLoading] = useState(true);
  const [sovData, setSovData] = useState<any>(null);
  const [trendsData, setTrendsData] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);

  useEffect(() => {
    if (selectedProjectId) {
      loadData();
    }
  }, [selectedProjectId]);

  const loadData = async () => {
    if (!selectedProjectId) return;

    setIsLoading(true);

    try {
      const [sov, trends, insightsData] = await Promise.all([
        getShareOfVoice(selectedProjectId, 30),
        getShareOfVoiceTrends(selectedProjectId, 30),
        getShareOfVoiceInsights(selectedProjectId),
      ]);

      setSovData(sov);
      setTrendsData(trends);
      setInsights(insightsData);
    } catch (error) {
      console.error("Error loading Share of Voice data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !sovData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Share of Voice"
          description="Compare your brand mentions against competitors in AI responses"
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading share of voice data...</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Share of Voice"
        description="Compare your brand mentions against competitors in AI responses"
      />

      <FiltersToolbar />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Your Share"
          value={`${sovData.brand.percentage}%`}
          description={`${sovData.brand.mentions} of ${sovData.totalMentions} total mentions`}
          icon={Trophy}
          trend={
            trendsData.brandTrend !== 0
              ? {
                  value: Math.abs(trendsData.brandTrend),
                  isPositive: trendsData.brandTrend > 0,
                }
              : undefined
          }
        />
        <StatCard
          title="Market Position"
          value={`#${sovData.marketPosition}`}
          description={
            sovData.marketPosition === 1
              ? "Leading in your category"
              : `${sovData.competitors[0]?.name || "Competitor"} is leading`
          }
          icon={TrendingUp}
        />
        <StatCard
          title="Competitors Tracked"
          value={sovData.competitors.length}
          description="Active competitors"
          icon={Users}
        />
      </div>

      {/* Share of Voice Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Market Share Distribution</CardTitle>
          <CardDescription>
            Percentage of mentions across all tracked brands
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* All entities (brand + competitors) sorted by percentage */}
            {(() => {
              // Combine brand and competitors
              const allEntities = [
                {
                  id: "brand",
                  name: "Your Brand",
                  mentions: sovData.brand.mentions,
                  percentage: sovData.brand.percentage,
                  isBrand: true,
                  trend: trendsData.brandTrend,
                },
                ...sovData.competitors.map((comp: any) => ({
                  id: comp.id,
                  name: comp.name,
                  mentions: comp.mentions,
                  percentage: comp.percentage,
                  isBrand: false,
                  trend:
                    trendsData.competitorTrends.find((t: any) => t.name === comp.name)
                      ?.trend || 0,
                })),
              ];

              // Sort by percentage descending
              allEntities.sort((a, b) => b.percentage - a.percentage);

              // Check if we have any data
              if (allEntities.length === 1 && allEntities[0].mentions === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No data available yet.</p>
                    <p className="text-sm mt-2">
                      Run some analyses to see share of voice distribution.
                    </p>
                  </div>
                );
              }

              return allEntities.map((entity) => (
                <div key={entity.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {entity.isBrand && <Trophy className="h-4 w-4 text-yellow-500" />}
                      <span className={entity.isBrand ? "font-semibold" : "font-medium"}>
                        {entity.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {entity.mentions} mention{entity.mentions !== 1 ? "s" : ""}
                      </span>
                      {entity.trend !== 0 && (
                        <span
                          className={`text-sm ${
                            entity.trend > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {entity.trend > 0 ? "+" : ""}
                          {entity.trend}%
                        </span>
                      )}
                      <span
                        className={`w-16 text-right ${
                          entity.isBrand ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {entity.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted">
                    <div
                      className={`h-3 rounded-full ${
                        entity.isBrand ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                      style={{ width: `${entity.percentage}%` }}
                    />
                  </div>
                </div>
              ));
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
            <CardDescription>AI-powered recommendations based on your data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.map((insight, index) => {
                const colorMap: Record<
                  string,
                  { border: string; bg: string; title: string; desc: string }
                > = {
                  success: {
                    border: "border-green-200 dark:border-green-900",
                    bg: "bg-green-50 dark:bg-green-950/20",
                    title: "text-green-900 dark:text-green-100",
                    desc: "text-green-700 dark:text-green-300",
                  },
                  info: {
                    border: "border-blue-200 dark:border-blue-900",
                    bg: "bg-blue-50 dark:bg-blue-950/20",
                    title: "text-blue-900 dark:text-blue-100",
                    desc: "text-blue-700 dark:text-blue-300",
                  },
                  warning: {
                    border: "border-amber-200 dark:border-amber-900",
                    bg: "bg-amber-50 dark:bg-amber-950/20",
                    title: "text-amber-900 dark:text-amber-100",
                    desc: "text-amber-700 dark:text-amber-300",
                  },
                  opportunity: {
                    border: "border-purple-200 dark:border-purple-900",
                    bg: "bg-purple-50 dark:bg-purple-950/20",
                    title: "text-purple-900 dark:text-purple-100",
                    desc: "text-purple-700 dark:text-purple-300",
                  },
                };

                const colors = colorMap[insight.type] || colorMap.info;

                return (
                  <div
                    key={index}
                    className={`rounded-lg border p-4 ${colors.border} ${colors.bg}`}
                  >
                    <p className={`font-medium ${colors.title}`}>{insight.title}</p>
                    <p className={`mt-1 text-sm ${colors.desc}`}>{insight.description}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

