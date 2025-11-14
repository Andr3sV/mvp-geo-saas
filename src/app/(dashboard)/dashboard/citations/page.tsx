import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Mock data
const stats = {
  totalCitations: 847,
  trend: 12.5,
  thisWeek: 156,
  lastWeek: 142,
  avgPerDay: 28,
};

const platformData = [
  { name: "ChatGPT", citations: 412, percentage: 48.6 },
  { name: "Gemini", citations: 245, percentage: 28.9 },
  { name: "Claude", citations: 145, percentage: 17.1 },
  { name: "Perplexity", citations: 45, percentage: 5.3 },
];

const recentCitations = [
  {
    id: 1,
    platform: "ChatGPT",
    query: "What is the best GEO platform?",
    mentioned: true,
    timestamp: "2 hours ago",
  },
  {
    id: 2,
    platform: "Gemini",
    query: "How to optimize for AI search?",
    mentioned: true,
    timestamp: "4 hours ago",
  },
  {
    id: 3,
    platform: "Claude",
    query: "Best tools for brand monitoring",
    mentioned: false,
    timestamp: "6 hours ago",
  },
  {
    id: 4,
    platform: "Perplexity",
    query: "GEO optimization strategies",
    mentioned: true,
    timestamp: "8 hours ago",
  },
];

export default function CitationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Citation Tracking"
        description="Monitor how often your brand appears in AI-generated responses"
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Citations"
          value={stats.totalCitations}
          description="All-time mentions"
          icon={BarChart3}
          trend={{ value: stats.trend, isPositive: true }}
        />
        <StatCard
          title="This Week"
          value={stats.thisWeek}
          description={`${stats.thisWeek - stats.lastWeek} more than last week`}
          icon={TrendingUp}
        />
        <StatCard
          title="Average per Day"
          value={stats.avgPerDay}
          description="Last 30 days"
          icon={Minus}
        />
        <StatCard
          title="Growth Rate"
          value={`${stats.trend}%`}
          description="vs previous period"
          icon={TrendingUp}
          trend={{ value: stats.trend, isPositive: true }}
        />
      </div>

      {/* Platform Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Citations by Platform</CardTitle>
          <CardDescription>Distribution across AI platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {platformData.map((platform) => (
              <div key={platform.name} className="flex items-center gap-4">
                <div className="w-32 font-medium">{platform.name}</div>
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
                  {platform.percentage}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Citations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Citations</CardTitle>
          <CardDescription>Latest brand mentions in AI responses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentCitations.map((citation) => (
              <div
                key={citation.id}
                className="flex items-start gap-4 rounded-lg border p-4"
              >
                <Badge variant="outline">{citation.platform}</Badge>
                <div className="flex-1">
                  <p className="font-medium">{citation.query}</p>
                  <p className="text-sm text-muted-foreground">
                    {citation.timestamp}
                  </p>
                </div>
                <Badge variant={citation.mentioned ? "default" : "secondary"}>
                  {citation.mentioned ? "Mentioned" : "Not mentioned"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">
            📊 Mock Data
          </CardTitle>
          <CardDescription className="text-blue-700 dark:text-blue-300">
            This page is showing mock data for demonstration. Real data will be collected 
            when AI integration is implemented in Phase 7.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

