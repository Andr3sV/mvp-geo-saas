import { Search, TrendingUp, Target } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Mock data
const queryStats = {
  totalQueries: 1247,
  citationRate: 67.9,
  topCategories: 5,
  avgPosition: 2.4,
};

const topQueries = [
  {
    query: "What is the best GEO platform?",
    citations: 156,
    rate: 89.2,
    avgPosition: 1.8,
    platforms: ["ChatGPT", "Claude", "Gemini"],
  },
  {
    query: "How to optimize for AI search?",
    citations: 142,
    rate: 78.5,
    avgPosition: 2.1,
    platforms: ["ChatGPT", "Perplexity"],
  },
  {
    query: "GEO tools comparison",
    citations: 98,
    rate: 71.3,
    avgPosition: 2.9,
    platforms: ["Gemini", "Claude"],
  },
  {
    query: "AI citation tracking software",
    citations: 87,
    rate: 82.1,
    avgPosition: 1.5,
    platforms: ["ChatGPT", "Claude"],
  },
  {
    query: "Best tools for brand monitoring in AI",
    citations: 76,
    rate: 65.8,
    avgPosition: 3.2,
    platforms: ["Perplexity", "Gemini"],
  },
];

const queryCategories = [
  { category: "Product Comparison", count: 324, citationRate: 74.2 },
  { category: "How-to Guides", count: 287, citationRate: 68.5 },
  { category: "Features & Benefits", count: 198, citationRate: 82.1 },
  { category: "Pricing & Plans", count: 156, citationRate: 45.3 },
  { category: "Use Cases", count: 134, citationRate: 71.6 },
  { category: "Integration & Setup", count: 98, citationRate: 58.9 },
];

export default function QueriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Query Patterns</h1>
        <p className="text-muted-foreground">
          Discover what questions generate citations for your brand
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Tracked Queries"
          value={queryStats.totalQueries}
          description="Across all platforms"
          icon={Search}
        />
        <StatCard
          title="Citation Rate"
          value={`${queryStats.citationRate}%`}
          description="Queries that mention you"
          icon={Target}
          trend={{ value: 5.3, isPositive: true }}
        />
        <StatCard
          title="Categories"
          value={queryStats.topCategories}
          description="Query types"
          icon={TrendingUp}
        />
        <StatCard
          title="Avg Position"
          value={queryStats.avgPosition}
          description="In AI responses"
          icon={TrendingUp}
        />
      </div>

      {/* Top Performing Queries */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Queries</CardTitle>
          <CardDescription>
            Queries that generate the most citations for your brand
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topQueries.map((query, index) => (
              <div key={index} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{query.query}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {query.platforms.map((platform) => (
                        <Badge key={platform} variant="secondary">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Badge className="ml-4">{`#${index + 1}`}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Citations</p>
                    <p className="font-semibold">{query.citations}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Citation Rate</p>
                    <p className="font-semibold">{query.rate}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avg Position</p>
                    <p className="font-semibold">{query.avgPosition}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Query Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Query Categories</CardTitle>
          <CardDescription>
            Performance breakdown by question type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {queryCategories.map((cat) => (
              <div key={cat.category} className="flex items-center gap-4">
                <div className="w-48 font-medium">{cat.category}</div>
                <div className="flex-1">
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${cat.citationRate}%` }}
                    />
                  </div>
                </div>
                <div className="w-20 text-right text-sm font-medium">
                  {cat.count}
                </div>
                <div className="w-20 text-right text-sm text-muted-foreground">
                  {cat.citationRate}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Query Insights</CardTitle>
          <CardDescription>Optimize your content strategy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/20">
              <p className="font-medium text-green-900 dark:text-green-100">
                💡 Focus on "Features & Benefits"
              </p>
              <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                This category has the highest citation rate at 82.1%. Create more content
                highlighting your unique features.
              </p>
            </div>
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950/20">
              <p className="font-medium text-yellow-900 dark:text-yellow-100">
                ⚠️ Improve "Pricing & Plans" content
              </p>
              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                Only 45.3% citation rate for pricing queries. Consider adding more
                transparent pricing information.
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
            Query patterns will be tracked automatically across all AI platforms in Phase 7,
            helping you identify optimization opportunities.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

