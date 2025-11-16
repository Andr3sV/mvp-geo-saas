import { Activity, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FiltersToolbar } from "@/components/dashboard/filters-toolbar";

// Mock data
const trendingStats = {
  risingQueries: 47,
  decliningQueries: 23,
  newQueries: 15,
  momentum: 18.5,
};

const risingQueries = [
  {
    query: "AI-powered GEO tools",
    currentVolume: 245,
    growth: 156.3,
    previousVolume: 96,
    platforms: ["ChatGPT", "Claude"],
  },
  {
    query: "Generative engine optimization best practices",
    currentVolume: 198,
    growth: 142.7,
    previousVolume: 82,
    platforms: ["Gemini", "Perplexity"],
  },
  {
    query: "How to track AI citations",
    currentVolume: 187,
    growth: 118.8,
    previousVolume: 86,
    platforms: ["ChatGPT", "Gemini"],
  },
  {
    query: "AI search visibility optimization",
    currentVolume: 154,
    growth: 95.6,
    previousVolume: 79,
    platforms: ["Claude", "Perplexity"],
  },
];

const decliningQueries = [
  {
    query: "SEO vs GEO differences",
    currentVolume: 89,
    growth: -28.3,
    previousVolume: 124,
    platforms: ["ChatGPT"],
  },
  {
    query: "Traditional SEO strategies",
    currentVolume: 65,
    growth: -34.7,
    previousVolume: 99,
    platforms: ["Gemini"],
  },
  {
    query: "Basic citation tracking",
    currentVolume: 54,
    growth: -42.1,
    previousVolume: 93,
    platforms: ["Claude"],
  },
];

const emergingTopics = [
  { topic: "AI Agent Optimization", queries: 23, growth: 287.5 },
  { topic: "Multi-modal AI Search", queries: 18, growth: 245.2 },
  { topic: "Real-time AI Monitoring", queries: 15, growth: 198.6 },
  { topic: "Enterprise GEO Solutions", queries: 12, growth: 167.3 },
];

export default function TrendingPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Trending Queries"
        description="Stay ahead with real-time query trends and emerging topics"
      />

      <FiltersToolbar />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Rising Queries"
          value={trendingStats.risingQueries}
          description="Increasing in volume"
          icon={TrendingUp}
        />
        <StatCard
          title="Declining Queries"
          value={trendingStats.decliningQueries}
          description="Decreasing in volume"
          icon={TrendingDown}
        />
        <StatCard
          title="New Queries"
          value={trendingStats.newQueries}
          description="Just appeared"
          icon={Activity}
        />
        <StatCard
          title="Momentum Score"
          value={`+${trendingStats.momentum}%`}
          description="Overall trend"
          icon={TrendingUp}
          trend={{ value: trendingStats.momentum, isPositive: true }}
        />
      </div>

      {/* Rising Queries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Rising Queries
          </CardTitle>
          <CardDescription>
            Queries with increasing search volume
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {risingQueries.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-4 rounded-lg border border-green-200 bg-green-50/50 p-4 dark:border-green-900 dark:bg-green-950/20"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <p className="font-medium">{item.query}</p>
                    <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                      +{item.growth}%
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.platforms.map((platform) => (
                      <Badge key={platform} variant="outline">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{item.previousVolume} → {item.currentVolume} queries</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Declining Queries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-600" />
            Declining Queries
          </CardTitle>
          <CardDescription>
            Queries with decreasing search volume
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {decliningQueries.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-4 rounded-lg border p-4"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <p className="font-medium">{item.query}</p>
                    <Badge variant="secondary" className="ml-2 bg-red-100 text-red-700">
                      {item.growth}%
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.platforms.map((platform) => (
                      <Badge key={platform} variant="outline">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{item.previousVolume} → {item.currentVolume} queries</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Emerging Topics */}
      <Card>
        <CardHeader>
          <CardTitle>Emerging Topics</CardTitle>
          <CardDescription>
            New topics gaining traction in AI responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {emergingTopics.map((topic) => (
              <div
                key={topic.topic}
                className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/20"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{topic.topic}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {topic.queries} related queries
                    </p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">
                    +{topic.growth}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Trending Insights</CardTitle>
          <CardDescription>Strategic recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/20">
              <p className="font-medium text-green-900 dark:text-green-100">
                📈 "AI-powered GEO tools" surging
              </p>
              <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                This query grew by 156.3%. Create content targeting this high-intent
                keyword to capture new audience.
              </p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                🚀 "AI Agent Optimization" is emerging
              </p>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                New topic with 287.5% growth. Early content creation can establish
                thought leadership.
              </p>
            </div>
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950/20">
              <p className="font-medium text-yellow-900 dark:text-yellow-100">
                ⚠️ Traditional SEO queries declining
              </p>
              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                Shift focus from SEO comparison content to advanced GEO strategies.
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
            Trending data will be updated in real-time using AI platform APIs and
            search trend analysis in Phase 7.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

