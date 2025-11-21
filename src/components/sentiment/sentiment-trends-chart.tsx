"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/ui/brand-logo";
import { TrendingUp } from "lucide-react";
import { SentimentTrend, EntitySentiment } from "@/lib/queries/sentiment-analysis";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface Competitor {
  id: string;
  name: string;
  domain: string;
}

interface SentimentTrendsChartProps {
  trends: SentimentTrend[];
  competitorTrends: SentimentTrend[];
  entities: EntitySentiment[];
  competitors: Competitor[];
  selectedCompetitorId: string | null;
  onCompetitorChange: (competitorId: string | null) => void;
  brandName: string;
  brandDomain: string;
  isLoading?: boolean;
}

export function SentimentTrendsChart({ 
  trends, 
  competitorTrends,
  entities,
  competitors,
  selectedCompetitorId,
  onCompetitorChange,
  brandName,
  brandDomain,
  isLoading 
}: SentimentTrendsChartProps) {
  // Debug logs
  console.log('📊 SentimentTrendsChart props:', {
    brandName,
    brandDomain,
    trendsLength: trends?.length,
    competitorTrendsLength: competitorTrends?.length,
    entitiesLength: entities?.length,
    competitorsLength: competitors?.length
  });

  // Get brand and selected competitor info
  const brandEntity = entities.find(e => e.analysisType === 'brand');
  const selectedCompetitor = selectedCompetitorId 
    ? competitors.find(c => c.id === selectedCompetitorId)
    : null;

  // Merge brand trends with competitor trends by date
  const allDates = new Set([
    ...trends.map(t => t.date),
    ...competitorTrends.map(t => t.date)
  ]);

  const chartData = Array.from(allDates)
    .sort()
    .map(date => {
      const brandData = trends.find(t => t.date === date);
      const compData = competitorTrends.find(t => t.date === date);

      return {
        date: format(new Date(date), 'MMM dd'),
        brandPositive: brandData?.positive || 0,
        brandNeutral: brandData?.neutral || 0,
        brandNegative: brandData?.negative || 0,
        competitorPositive: compData?.positive || 0,
        competitorNeutral: compData?.neutral || 0,
        competitorNegative: compData?.negative || 0,
      };
    });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {payload[0].payload.date}
          </p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs text-foreground">{entry.name}</span>
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {entry.value} mentions
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Sentiment Trends Over Time</CardTitle>
                <CardDescription>Track daily sentiment patterns</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!trends || trends.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Sentiment Trends Over Time</CardTitle>
                <CardDescription>Track daily sentiment patterns</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            <p>Run sentiment analysis to see trends over time</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>Sentiment Trends Over Time</CardTitle>
            <CardDescription>
              Track daily sentiment patterns ({trends.length} days)
            </CardDescription>
          </div>
        </div>

        {/* Brand and Competitor Selector */}
        <div className="flex flex-wrap gap-2">
          {/* Brand Button (always shown, always selected) */}
          <button
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border bg-primary text-primary-foreground border-primary hover:border-primary/50"
          >
            {brandName ? (
              <>
                <BrandLogo 
                  domain={brandDomain} 
                  name={brandName}
                  size={16} 
                />
                <span>{brandName}</span>
              </>
            ) : (
              <>
                <div className="w-4 h-4 bg-primary-foreground/20 rounded-full animate-pulse" />
                <span>Loading...</span>
              </>
            )}
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Competitor Buttons */}
          {competitors.map((competitor) => (
            <button
              key={competitor.id}
              onClick={() => onCompetitorChange(competitor.id === selectedCompetitorId ? '' : competitor.id)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border hover:border-primary/50 ${
                selectedCompetitorId === competitor.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted"
              }`}
            >
              <BrandLogo 
                domain={competitor.domain} 
                name={competitor.name}
                size={16} 
              />
              <span>{competitor.name}</span>
              {selectedCompetitorId === competitor.id && (
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Brand Lines (Darker colors) */}
            <Line
              type="monotone"
              dataKey="brandPositive"
              stroke="rgb(34, 197, 94)"
              strokeWidth={2.5}
              dot={{ fill: "rgb(34, 197, 94)", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6 }}
              name={`${brandName} Positive`}
            />
            <Line
              type="monotone"
              dataKey="brandNeutral"
              stroke="rgb(234, 179, 8)"
              strokeWidth={2.5}
              dot={{ fill: "rgb(234, 179, 8)", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6 }}
              name={`${brandName} Neutral`}
            />
            <Line
              type="monotone"
              dataKey="brandNegative"
              stroke="rgb(239, 68, 68)"
              strokeWidth={2.5}
              dot={{ fill: "rgb(239, 68, 68)", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6 }}
              name={`${brandName} Negative`}
            />

            {/* Competitor Lines (Lighter colors) - Only show if competitor selected */}
            {selectedCompetitorId && (
              <>
                <Line
                  type="monotone"
                  dataKey="competitorPositive"
                  stroke="rgb(134, 239, 172)"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ fill: "rgb(134, 239, 172)", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6 }}
                  name={`${selectedCompetitor?.name || 'Competitor'} Positive`}
                />
                <Line
                  type="monotone"
                  dataKey="competitorNeutral"
                  stroke="rgb(253, 224, 71)"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ fill: "rgb(253, 224, 71)", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6 }}
                  name={`${selectedCompetitor?.name || 'Competitor'} Neutral`}
                />
                <Line
                  type="monotone"
                  dataKey="competitorNegative"
                  stroke="rgb(252, 165, 165)"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ fill: "rgb(252, 165, 165)", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6 }}
                  name={`${selectedCompetitor?.name || 'Competitor'} Negative`}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
