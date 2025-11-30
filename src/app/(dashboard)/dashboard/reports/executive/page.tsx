"use client";

import { useState, useEffect } from "react";
import { useProject } from "@/contexts/project-context";
import { PageHeader } from "@/components/dashboard/page-header";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";
import { DateRangeValue } from "@/components/ui/date-range-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { subDays } from "date-fns";
import { toast } from "sonner";
import {
  Eye,
  Heart,
  Trophy,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Info,
  CheckCircle2,
} from "lucide-react";
import { fetchExecutiveMetrics } from "@/lib/actions/executive-overview";
import { type ExecutiveMetrics } from "@/lib/queries/executive-overview";
import { SentimentFilterOptions } from "@/lib/queries/sentiment-analysis";
import { cn } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export default function ExecutiveOverviewPage() {
  const { selectedProjectId } = useProject();
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter states
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [platform, setPlatform] = useState<string>("all");
  const [region, setRegion] = useState<string>("GLOBAL");

  // Data states
  const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null);
  const [rankingData, setRankingData] = useState<any[]>([]);
  const [brandName, setBrandName] = useState("");

  // Create filters object
  const filtersPayload: SentimentFilterOptions = {
    dateRange: dateRange.from && dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined,
    platform: platform !== "all" ? platform : undefined,
    region: region !== "GLOBAL" ? region : undefined,
  };

  // Load executive metrics
  const loadMetrics = async () => {
    if (!selectedProjectId) return;

    setIsLoading(true);
    try {
      const data = await fetchExecutiveMetrics(selectedProjectId, filtersPayload);
      setMetrics(data);

      // Load ranking data
      const { getShareOfVoice } = await import("@/lib/queries/share-of-voice");
      const sovData = await getShareOfVoice(
        selectedProjectId,
        filtersPayload.dateRange?.from,
        filtersPayload.dateRange?.to,
        filtersPayload.platform === "all" ? undefined : filtersPayload.platform,
        filtersPayload.region === "GLOBAL" ? undefined : filtersPayload.region
      );

      if (sovData) {
        // Get brand name
        const supabase = (await import('@/lib/supabase/client')).createClient();
        const { data: project } = await supabase
          .from('projects')
          .select('brand_name, client_url')
          .eq('id', selectedProjectId)
          .single();
        
        if (project) {
          setBrandName(project.brand_name || 'Your Brand');
        }

        // Prepare ranking data - combine brand and competitors
        const ranking: any[] = [];
        
        // Combine brand and competitors
        if (sovData.brand) {
          ranking.push({
            name: project?.brand_name || 'Your Brand',
            value: sovData.brand.percentage || 0,
            mentions: sovData.brand.mentions || 0,
            isBrand: true,
            domain: project?.client_url || '',
          });
        }

        // Add competitors
        if (sovData.competitors && sovData.competitors.length > 0) {
          sovData.competitors.forEach((comp: any) => {
            ranking.push({
              name: comp.name,
              value: comp.percentage || 0,
              mentions: comp.mentions || 0,
              isBrand: false,
              domain: comp.domain || '',
            });
          });
        }

        // Sort by percentage descending
        ranking.sort((a, b) => b.value - a.value);
        
        // Update ranks
        ranking.forEach((item, index) => {
          item.rank = index + 1;
        });

        setRankingData(ranking.slice(0, 10)); // Top 10
      }
    } catch (error: any) {
      console.error("Failed to load executive metrics:", error);
      toast.error("Failed to load executive metrics");
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when project or filters change
  useEffect(() => {
    if (selectedProjectId && dateRange.from && dateRange.to) {
      loadMetrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, dateRange.from, dateRange.to, platform, region]);

  // Handle filters change
  const handleFiltersChange = (filters: {
    region: string;
    dateRange: DateRangeValue;
    platform: string;
  }) => {
    if (filters.dateRange.from && filters.dateRange.to) {
      setDateRange(filters.dateRange);
    }
    setPlatform(filters.platform);
    setRegion(filters.region);
  };


  const getInsightIcon = (type: string) => {
    switch (type) {
      case "positive":
        return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-amber-600" />;
      default:
        return <Info className="h-5 w-5 text-slate-600" />;
    }
  };

  const getInsightBgColor = (type: string) => {
    switch (type) {
      case "positive":
        return "bg-emerald-50/50 border-emerald-200/50";
      case "warning":
        return "bg-amber-50/50 border-amber-200/50";
      default:
        return "bg-slate-50/50 border-slate-200/50";
    }
  };

  if (isLoading || !metrics) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Executive Overview"
          description="High-level metrics and insights for strategic decision-making"
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading executive metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  // Chart data for Visibility Score
  const visibilityChartData = [
    { name: "Score", value: metrics.visibilityScore, fill: "#C2C2E1" },
    { name: "Remaining", value: 100 - metrics.visibilityScore, fill: "#e5e7eb" },
  ];

  // Chart data for Sentiment Score
  const sentimentChartData = [
    { name: "Score", value: metrics.sentimentScore, fill: "#C2C2E1" },
    { name: "Remaining", value: 100 - metrics.sentimentScore, fill: "#e5e7eb" },
  ];

  // Chart data for Competitive Rank (visualization)
  const rankChartData = Array.from({ length: Math.min(metrics.totalCompetitors, 5) }, (_, i) => ({
    rank: i + 1,
    isBrand: i + 1 === metrics.competitiveRank,
    value: metrics.competitiveRank === i + 1 ? 100 : 0,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Overview"
        description="High-level metrics and insights for strategic decision-making"
      />

      {/* Filters Toolbar */}
      <FiltersToolbar
        dateRange={dateRange}
        platform={platform}
        region={region}
        onApply={handleFiltersChange}
      />

      {/* Key Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Visibility Score */}
        <Card className="border transition-all hover:shadow-md bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Visibility Score</CardTitle>
              <Eye className="h-5 w-5 text-slate-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={visibilityChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={50}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                      >
                        {visibilityChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-slate-900">{metrics.visibilityScore}</div>
                      <div className="text-xs text-muted-foreground">/ 100</div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Based on citations, share of voice, and platform presence
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sentiment Score */}
        <Card className="border transition-all hover:shadow-md bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sentiment Score</CardTitle>
              <Heart className="h-5 w-5 text-slate-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sentimentChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={50}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                      >
                        {sentimentChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-slate-900">{metrics.sentimentScore}</div>
                      <div className="text-xs text-muted-foreground">/ 100</div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Overall brand sentiment across all mentions
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Competitive Rank */}
        <Card className="border transition-all hover:shadow-md bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Competitive Rank</CardTitle>
              <Trophy className="h-5 w-5 text-slate-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-2 mb-2">
                    <span className="text-5xl font-bold text-slate-900">
                      #{metrics.competitiveRank}
                    </span>
                    {metrics.competitiveRank === 1 && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                        Leader
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Out of {metrics.totalCompetitors} competitors
                  </p>
                </div>
              </div>
              {metrics.totalCompetitors > 0 && (
                <div className="h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rankChartData} layout="vertical">
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis type="category" dataKey="rank" hide />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {rankChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.isBrand ? "#C2C2E1" : "#e5e7eb"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Competitive Ranking */}
      {rankingData.length > 0 && (
        <Card className="border transition-all hover:shadow-md bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-slate-600" />
              <CardTitle>Competitive Ranking</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rankingData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.2} />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 11 }}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => {
                      const entry = props.payload;
                      return [
                        <div key="tooltip" className="space-y-1">
                          <div className="font-semibold">{entry.name}</div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Share: </span>
                            <span className="font-medium">{value.toFixed(1)}%</span>
                          </div>
                          {entry.mentions !== undefined && (
                            <div className="text-xs text-muted-foreground">
                              {entry.mentions} mention{entry.mentions !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>,
                        ''
                      ];
                    }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      padding: '12px',
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {rankingData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isBrand ? "#C2C2E1" : "#94a3b8"}
                        opacity={entry.isBrand ? 1 : 0.7}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Insights */}
      <Card className="border transition-all hover:shadow-md bg-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-slate-600" />
            <CardTitle>Top Insights</CardTitle>
            <Badge variant="outline" className="ml-auto text-xs">Last 7 days</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {metrics.weeklyInsights.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Info className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No insights available for this period</p>
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.weeklyInsights.map((insight) => (
                <div
                  key={insight.id}
                  className={cn(
                    "p-4 rounded-lg border transition-all hover:shadow-sm",
                    getInsightBgColor(insight.type)
                  )}
                >
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm mb-1.5 text-slate-900">{insight.title}</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

