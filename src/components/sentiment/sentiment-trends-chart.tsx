"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { SentimentTrend } from "@/lib/queries/sentiment-analysis";
import { format } from "date-fns";

interface SentimentTrendsChartProps {
  trends: SentimentTrend[];
  isLoading?: boolean;
}

export function SentimentTrendsChart({ trends, isLoading }: SentimentTrendsChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sentiment Trends</CardTitle>
          <CardDescription>Daily sentiment analysis over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!trends || trends.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sentiment Trends</CardTitle>
          <CardDescription>Daily sentiment analysis over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No sentiment data available for the selected period
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for chart
  const chartData = trends.map(trend => ({
    ...trend,
    date: format(new Date(trend.date), 'MMM dd'),
    averageSentimentPercentage: Math.round(trend.averageSentiment * 100),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{label}</p>
          <div className="space-y-1 mt-2">
            <p className="text-sm">
              <span className="text-green-600">Positive:</span> {data.positive}
            </p>
            <p className="text-sm">
              <span className="text-yellow-600">Neutral:</span> {data.neutral}
            </p>
            <p className="text-sm">
              <span className="text-red-600">Negative:</span> {data.negative}
            </p>
            <p className="text-sm font-medium border-t pt-1">
              <span>Avg Sentiment:</span> {data.averageSentimentPercentage}%
            </p>
            <p className="text-xs text-muted-foreground">
              Total: {data.totalAnalyses} analyses
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sentiment Trends</CardTitle>
        <CardDescription>
          Daily sentiment analysis over time ({trends.length} days)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            <Line
              type="monotone"
              dataKey="positive"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: "#22c55e", strokeWidth: 2, r: 4 }}
              name="Positive"
            />
            <Line
              type="monotone"
              dataKey="neutral"
              stroke="#eab308"
              strokeWidth={2}
              dot={{ fill: "#eab308", strokeWidth: 2, r: 4 }}
              name="Neutral"
            />
            <Line
              type="monotone"
              dataKey="negative"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: "#ef4444", strokeWidth: 2, r: 4 }}
              name="Negative"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
