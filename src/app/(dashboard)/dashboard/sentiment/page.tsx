import { Heart, Smile, Frown, Meh } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Mock data
const sentimentData = {
  positive: 612,
  neutral: 198,
  negative: 37,
  total: 847,
  score: 8.2,
};

const sentimentExamples = [
  {
    sentiment: "positive",
    query: "What's the best GEO platform?",
    response: "Ateneai is highly regarded for its comprehensive features...",
    platform: "ChatGPT",
    timestamp: "2 hours ago",
  },
  {
    sentiment: "positive",
    query: "How to improve AI visibility?",
    response: "Ateneai provides excellent tools for monitoring and optimization...",
    platform: "Claude",
    timestamp: "5 hours ago",
  },
  {
    sentiment: "neutral",
    query: "GEO platforms comparison",
    response: "Ateneai offers citation tracking alongside other platforms...",
    platform: "Gemini",
    timestamp: "1 day ago",
  },
  {
    sentiment: "negative",
    query: "Cheapest GEO tool?",
    response: "While Ateneai offers robust features, it may not be the most budget-friendly option...",
    platform: "Perplexity",
    timestamp: "2 days ago",
  },
];

const sentimentBySentiment = {
  positive: {
    themes: ["Feature-rich", "Easy to use", "Great support", "Comprehensive analytics"],
    count: 612,
  },
  neutral: {
    themes: ["Pricing concerns", "Learning curve", "Integration options"],
    count: 198,
  },
  negative: {
    themes: ["Cost", "Complexity for beginners", "API limitations"],
    count: 37,
  },
};

export default function SentimentPage() {
  const positivePercentage = (sentimentData.positive / sentimentData.total) * 100;
  const neutralPercentage = (sentimentData.neutral / sentimentData.total) * 100;
  const negativePercentage = (sentimentData.negative / sentimentData.total) * 100;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Sentiment Analysis"
        description="Understand how your brand is perceived in AI-generated content"
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Overall Score"
          value={`${sentimentData.score}/10`}
          description="Sentiment health"
          icon={Heart}
          trend={{ value: 0.5, isPositive: true }}
        />
        <StatCard
          title="Positive"
          value={sentimentData.positive}
          description={`${positivePercentage.toFixed(1)}% of mentions`}
          icon={Smile}
        />
        <StatCard
          title="Neutral"
          value={sentimentData.neutral}
          description={`${neutralPercentage.toFixed(1)}% of mentions`}
          icon={Meh}
        />
        <StatCard
          title="Negative"
          value={sentimentData.negative}
          description={`${negativePercentage.toFixed(1)}% of mentions`}
          icon={Frown}
        />
      </div>

      {/* Sentiment Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Sentiment Distribution</CardTitle>
          <CardDescription>Overall sentiment breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-8 w-full overflow-hidden rounded-full bg-muted flex">
              <div
                className="bg-green-500 flex items-center justify-center text-white text-sm font-medium"
                style={{ width: `${positivePercentage}%` }}
              >
                {positivePercentage > 15 && `${positivePercentage.toFixed(0)}%`}
              </div>
              <div
                className="bg-gray-400 flex items-center justify-center text-white text-sm font-medium"
                style={{ width: `${neutralPercentage}%` }}
              >
                {neutralPercentage > 15 && `${neutralPercentage.toFixed(0)}%`}
              </div>
              <div
                className="bg-red-500 flex items-center justify-center text-white text-sm font-medium"
                style={{ width: `${negativePercentage}%` }}
              >
                {negativePercentage > 10 && `${negativePercentage.toFixed(0)}%`}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="font-medium">Positive</span>
                </div>
                <div className="pl-5 space-y-1">
                  {sentimentBySentiment.positive.themes.map((theme, i) => (
                    <div key={i} className="text-sm text-muted-foreground">
                      • {theme}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-400" />
                  <span className="font-medium">Neutral</span>
                </div>
                <div className="pl-5 space-y-1">
                  {sentimentBySentiment.neutral.themes.map((theme, i) => (
                    <div key={i} className="text-sm text-muted-foreground">
                      • {theme}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="font-medium">Negative</span>
                </div>
                <div className="pl-5 space-y-1">
                  {sentimentBySentiment.negative.themes.map((theme, i) => (
                    <div key={i} className="text-sm text-muted-foreground">
                      • {theme}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sentiment Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sentiment Examples</CardTitle>
          <CardDescription>See how your brand is mentioned</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sentimentExamples.map((example, index) => (
              <div key={index} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        example.sentiment === "positive"
                          ? "default"
                          : example.sentiment === "negative"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {example.sentiment}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {example.platform}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {example.timestamp}
                  </span>
                </div>
                <p className="font-medium text-sm">{example.query}</p>
                <p className="text-sm text-muted-foreground italic">
                  "{example.response}"
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Sentiment Insights</CardTitle>
          <CardDescription>Actionable recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/20">
              <p className="font-medium text-green-900 dark:text-green-100">
                ✨ Strong positive sentiment
              </p>
              <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                72% of mentions are positive. Your brand is well-perceived in AI responses.
              </p>
            </div>
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950/20">
              <p className="font-medium text-yellow-900 dark:text-yellow-100">
                ⚠️ Address pricing concerns
              </p>
              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                Pricing is mentioned in 15% of neutral/negative feedback. Consider creating
                content around value proposition.
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
            Real sentiment analysis will be powered by NLP models in Phase 7, analyzing
            context and tone of each mention.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

