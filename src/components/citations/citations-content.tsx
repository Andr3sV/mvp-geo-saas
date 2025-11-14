"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/contexts/project-context";
import { BarChart3, TrendingUp, Minus } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FileText } from "lucide-react";

interface CitationsContentProps {
  projectId: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  claude: "Claude",
  perplexity: "Perplexity",
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  neutral: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
  negative: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  mixed: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
};

export function CitationsContent({ projectId: initialProjectId }: CitationsContentProps) {
  const { selectedProjectId } = useProject();
  const currentProjectId = selectedProjectId || initialProjectId;
  
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [currentProjectId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/citations/stats?projectId=${currentProjectId}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats || stats.totalCitations === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={FileText}
            title="No citations yet"
            description="Run your first prompt analysis to start tracking brand mentions across AI platforms"
            action={{
              label: "Go to Prompts",
              onClick: () => window.location.href = "/dashboard/prompts"
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Citations"
          value={stats.totalCitations}
          description="All-time mentions"
          icon={BarChart3}
          trend={stats.trend !== 0 ? { value: Math.abs(stats.trend), isPositive: stats.trend > 0 } : undefined}
        />
        <StatCard
          title="This Week"
          value={stats.thisWeek}
          description={`${Math.abs(stats.thisWeek - stats.lastWeek)} ${stats.thisWeek >= stats.lastWeek ? 'more' : 'less'} than last week`}
          icon={TrendingUp}
        />
        <StatCard
          title="Average per Day"
          value={stats.avgPerDay}
          description="Last 7 days"
          icon={Minus}
        />
        <StatCard
          title="Growth Rate"
          value={`${stats.trend >= 0 ? '+' : ''}${stats.trend}%`}
          description="vs previous week"
          icon={TrendingUp}
          trend={stats.trend !== 0 ? { value: Math.abs(stats.trend), isPositive: stats.trend > 0 } : undefined}
        />
      </div>

      {/* Platform Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Citations by Platform</CardTitle>
          <CardDescription>Distribution across AI platforms</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.platformData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No platform data available
            </p>
          ) : (
            <div className="space-y-4">
              {stats.platformData.map((platform: any) => (
                <div key={platform.name} className="flex items-center gap-4">
                  <div className="w-32 font-medium">
                    {PLATFORM_LABELS[platform.name] || platform.name}
                  </div>
                  <div className="flex-1">
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${platform.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right text-sm font-medium">
                    {platform.citations}
                  </div>
                  <div className="w-16 text-right text-sm text-muted-foreground">
                    {platform.percentage.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Citations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Citations</CardTitle>
          <CardDescription>Latest brand mentions in AI responses</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentCitations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent citations
            </p>
          ) : (
            <div className="space-y-4">
              {stats.recentCitations.map((citation: any) => (
                <div
                  key={citation.id}
                  className="flex items-start gap-4 rounded-lg border p-4"
                >
                  <Badge variant="outline">
                    {PLATFORM_LABELS[citation.ai_responses?.platform] || citation.ai_responses?.platform}
                  </Badge>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{citation.citation_text}</p>
                    <p className="text-xs text-muted-foreground">
                      Prompt: {citation.ai_responses?.prompt_text?.substring(0, 100)}...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(citation.created_at).toLocaleDateString()} at{" "}
                      {new Date(citation.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {citation.sentiment && (
                      <Badge
                        variant="secondary"
                        className={SENTIMENT_COLORS[citation.sentiment]}
                      >
                        {citation.sentiment}
                      </Badge>
                    )}
                    {citation.confidence_score && (
                      <span className="text-xs text-muted-foreground">
                        {(citation.confidence_score * 100).toFixed(0)}% confidence
                      </span>
                    )}
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

