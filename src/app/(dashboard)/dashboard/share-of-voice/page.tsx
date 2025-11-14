import { TrendingUp, Users, Trophy } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { ProjectInfoBanner } from "@/components/dashboard/project-info-banner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserWorkspacesWithProjects } from "@/lib/queries/workspace";

// Mock data
const shareOfVoice = {
  brand: { name: "Your Brand", percentage: 34.2, mentions: 847 },
  total: 2475,
};

const competitors = [
  { name: "Competitor A", percentage: 28.5, mentions: 705, trend: -2.3 },
  { name: "Competitor B", percentage: 19.8, mentions: 490, trend: 1.5 },
  { name: "Competitor C", percentage: 11.2, mentions: 277, trend: -0.8 },
  { name: "Others", percentage: 6.3, mentions: 156, trend: 0.2 },
];

export default async function ShareOfVoicePage() {
  const workspaces = await getUserWorkspacesWithProjects();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Share of Voice</h1>
        <p className="text-muted-foreground">
          Compare your brand mentions against competitors in AI responses
        </p>
      </div>

      <ProjectInfoBanner workspaces={workspaces} />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Your Share"
          value={`${shareOfVoice.brand.percentage}%`}
          description={`${shareOfVoice.brand.mentions} of ${shareOfVoice.total} total mentions`}
          icon={Trophy}
          trend={{ value: 5.2, isPositive: true }}
        />
        <StatCard
          title="Market Position"
          value="#1"
          description="Leading in your category"
          icon={TrendingUp}
        />
        <StatCard
          title="Competitors Tracked"
          value={competitors.length}
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
            {/* Your Brand */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span className="font-semibold">{shareOfVoice.brand.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {shareOfVoice.brand.mentions} mentions
                  </span>
                  <span className="w-16 text-right font-semibold">
                    {shareOfVoice.brand.percentage}%
                  </span>
                </div>
              </div>
              <div className="h-3 w-full rounded-full bg-muted">
                <div
                  className="h-3 rounded-full bg-primary"
                  style={{ width: `${shareOfVoice.brand.percentage}%` }}
                />
              </div>
            </div>

            {/* Competitors */}
            {competitors.map((competitor, index) => (
              <div key={competitor.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{competitor.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {competitor.mentions} mentions
                    </span>
                    <span className={`text-sm ${competitor.trend > 0 ? "text-green-600" : "text-red-600"}`}>
                      {competitor.trend > 0 ? "+" : ""}
                      {competitor.trend}%
                    </span>
                    <span className="w-16 text-right font-medium">
                      {competitor.percentage}%
                    </span>
                  </div>
                </div>
                <div className="h-3 w-full rounded-full bg-muted">
                  <div
                    className="h-3 rounded-full bg-muted-foreground/30"
                    style={{ width: `${competitor.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
          <CardDescription>AI-powered recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/20">
              <p className="font-medium text-green-900 dark:text-green-100">
                📈 You're leading the market
              </p>
              <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                Your brand has the highest share of voice at 34.2%, maintaining a strong
                lead over competitors.
              </p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                💡 Opportunity detected
              </p>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                Competitor A is losing ground (-2.3%). Focus on their key topics to
                capture their audience.
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
            Competitor data will be tracked automatically when you add competitors in
            Settings and enable AI monitoring in Phase 7.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

