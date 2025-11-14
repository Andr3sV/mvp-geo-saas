import { Layers, MessageSquare, Sparkles, Brain, Zap } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Mock data
const platformStats = [
  {
    name: "ChatGPT",
    icon: MessageSquare,
    citations: 412,
    percentage: 48.6,
    avgPosition: 2.3,
    trend: 8.5,
    color: "text-green-600",
  },
  {
    name: "Gemini",
    icon: Sparkles,
    citations: 245,
    percentage: 28.9,
    avgPosition: 3.1,
    trend: -2.1,
    color: "text-blue-600",
  },
  {
    name: "Claude",
    icon: Brain,
    citations: 145,
    percentage: 17.1,
    avgPosition: 2.8,
    trend: 15.2,
    color: "text-purple-600",
  },
  {
    name: "Perplexity",
    icon: Zap,
    citations: 45,
    percentage: 5.3,
    avgPosition: 1.9,
    trend: 3.4,
    color: "text-yellow-600",
  },
];

const topQueries = {
  chatgpt: [
    { query: "Best GEO platforms", position: 1 },
    { query: "AI optimization tools", position: 3 },
    { query: "Brand monitoring AI", position: 2 },
  ],
  gemini: [
    { query: "GEO strategies", position: 2 },
    { query: "AI search optimization", position: 4 },
    { query: "Content optimization", position: 3 },
  ],
  claude: [
    { query: "Enterprise GEO", position: 1 },
    { query: "AI analytics tools", position: 2 },
    { query: "SEO vs GEO", position: 5 },
  ],
  perplexity: [
    { query: "GEO services", position: 1 },
    { query: "AI visibility", position: 2 },
    { query: "Citation tracking", position: 1 },
  ],
};

export default function PlatformsPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Platform Breakdown"
        description="Analyze your brand performance across different AI platforms"
      />

      {/* Platform Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {platformStats.map((platform) => {
          const Icon = platform.icon;
          return (
            <StatCard
              key={platform.name}
              title={platform.name}
              value={platform.citations}
              description={`${platform.percentage}% of total`}
              icon={Icon}
              trend={{ value: platform.trend, isPositive: platform.trend > 0 }}
            />
          );
        })}
      </div>

      {/* Detailed Platform Analysis */}
      <div className="grid gap-6 lg:grid-cols-2">
        {platformStats.map((platform) => {
          const Icon = platform.icon;
          const queries = topQueries[platform.name.toLowerCase() as keyof typeof topQueries];

          return (
            <Card key={platform.name}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${platform.color}`} />
                  <CardTitle>{platform.name}</CardTitle>
                </div>
                <CardDescription>
                  Performance metrics and top queries
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Citations</p>
                    <p className="text-2xl font-bold">{platform.citations}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Position</p>
                    <p className="text-2xl font-bold">{platform.avgPosition}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Growth</p>
                    <p className={`text-2xl font-bold ${platform.trend > 0 ? "text-green-600" : "text-red-600"}`}>
                      {platform.trend > 0 ? "+" : ""}
                      {platform.trend}%
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Top Performing Queries</p>
                  {queries.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border p-2 text-sm"
                    >
                      <span>{item.query}</span>
                      <Badge variant="outline">#{item.position}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Insights</CardTitle>
          <CardDescription>Strategic recommendations by platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 font-medium">
                <MessageSquare className="h-4 w-4 text-green-600" />
                <span>ChatGPT</span>
                <Badge variant="secondary">Best performing</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Strong performance with 412 citations. Continue optimizing content for
                conversational queries.
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 font-medium">
                <Brain className="h-4 w-4 text-purple-600" />
                <span>Claude</span>
                <Badge variant="secondary">Fastest growing</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                +15.2% growth. Focus on enterprise-focused content to maintain momentum.
              </p>
            </div>
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
            Real platform data will be collected through API integrations in Phase 7.
            Each platform has unique API requirements and rate limits.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

