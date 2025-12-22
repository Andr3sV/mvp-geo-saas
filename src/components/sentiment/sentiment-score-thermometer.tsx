"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitySentiment } from "@/lib/queries/sentiment-analysis";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SentimentScoreThermometerProps {
  entities: EntitySentiment[];
  isLoading?: boolean;
}

export function SentimentScoreThermometer({ entities, isLoading }: SentimentScoreThermometerProps) {
  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Sentiment Score</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-6">
          <div className="h-[300px] animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  const brandEntity = entities.find(e => e.analysisType === 'brand');

  if (!brandEntity) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Sentiment Score</CardTitle>
          <p className="text-sm text-muted-foreground">
            Brand sentiment score
          </p>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center p-6">
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No sentiment data yet</p>
            <p className="text-xs mt-2">Run analysis to see your sentiment score</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // averageSentiment is already normalized to 0-1 range, convert back to -1 to 1
  // If it's already in -1 to 1 range, use it directly
  // We'll assume it's in 0-1 range and convert it
  const sentimentScore = brandEntity.averageSentiment >= 0 && brandEntity.averageSentiment <= 1
    ? (brandEntity.averageSentiment * 2) - 1  // Convert 0-1 to -1 to 1
    : brandEntity.averageSentiment;

  // Clamp to -1 to 1 range
  const clampedScore = Math.max(-1, Math.min(1, sentimentScore));
  
  // Convert to percentage for display (0% = -1, 50% = 0, 100% = 1)
  const percentage = ((clampedScore + 1) / 2) * 100;
  
  // Color scale matching Topic Performance Matrix: red (-1) -> yellow (0) -> green (1)
  const getColor = (score: number): string => {
    const clamped = Math.max(-1, Math.min(1, score));
    
    if (clamped >= 0) {
      // Positive: yellow to green
      // Yellow: rgb(255, 235, 150) -> Green: rgb(100, 220, 120)
      const intensity = clamped; // 0 to 1
      const easedIntensity = Math.pow(intensity, 0.7);
      
      const r = Math.round(255 - (easedIntensity * 155)); // 255 to 100
      const g = Math.round(235 - (easedIntensity * 15)); // 235 to 220
      const b = Math.round(150 - (easedIntensity * 30)); // 150 to 120
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Negative: red to yellow
      // Red: rgb(255, 140, 140) when score = -1 -> Yellow: rgb(255, 235, 150) when score = 0
      const intensity = Math.abs(clamped); // 0 to 1 (1 when score = -1, 0 when score = 0)
      const easedIntensity = Math.pow(intensity, 0.8);
      
      const r = 255; // Always 255 for both red and yellow
      const g = Math.round(235 - (easedIntensity * 95)); // 235 (yellow) to 140 (red)
      const b = Math.round(150 - (easedIntensity * 10)); // 150 (yellow) to 140 (red)
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  // Get color for the score indicator
  const scoreColor = getColor(clampedScore);
  
  // Determine gradient class for text (simplified)
  const getTextGradient = (score: number) => {
    if (score >= 0.3) return 'from-green-500 to-emerald-600';
    if (score >= -0.3) return 'from-amber-500 to-yellow-600';
    return 'from-red-500 to-rose-600';
  };

  const sentimentColor = getTextGradient(clampedScore);
  
  // Determine trend icon
  const getTrendIcon = (score: number) => {
    if (score >= 0.1) return <TrendingUp className="h-4 w-4" />;
    if (score <= -0.1) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const trendIcon = getTrendIcon(clampedScore);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Sentiment Score</CardTitle>
        <p className="text-sm text-muted-foreground">
          {brandEntity.entityName} overall score
        </p>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col justify-center p-6">
        {/* Main Score Display */}
        <div className="flex-1 flex flex-col justify-center items-center space-y-8">
          {/* Large Score Number */}
          <div className="text-center">
            <div className={`text-7xl font-black bg-gradient-to-br ${sentimentColor} bg-clip-text text-transparent mb-3`}>
              {clampedScore >= 0 ? '+' : ''}{clampedScore.toFixed(2)}
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              {trendIcon}
              <span>Overall sentiment score</span>
            </div>
          </div>

          {/* Horizontal Progress Bar */}
          <div className="w-full space-y-3">
            {/* Progress Bar Container */}
            <div className="relative h-12 rounded-full overflow-hidden shadow-inner border-2 border-muted/30">
              {/* Background gradient using the same color scale as Topic Performance Matrix */}
              <div className="absolute inset-0 flex">
                {/* Generate gradient stops using the same color function */}
                {Array.from({ length: 100 }, (_, i) => {
                  const pos = i / 100;
                  const score = (pos * 2) - 1; // Convert 0-1 to -1 to 1
                  const color = getColor(score);
                  return (
                    <div
                      key={i}
                      className="flex-1"
                      style={{ backgroundColor: color }}
                    />
                  );
                })}
              </div>
              
              {/* Center marker (0.0) */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/60 shadow-sm z-10"></div>
              
              {/* Score indicator dot */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-4 shadow-xl z-20 transition-all duration-1000 ease-out"
                style={{ 
                  left: `${percentage}%`,
                  borderColor: scoreColor
                }}
              >
                <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white to-gray-100"></div>
              </div>
            </div>

            {/* Scale Labels */}
            <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
              <div className="flex flex-col items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm"></div>
                <span className="font-medium">-1.0</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500 shadow-sm"></div>
                <span className="font-medium">0.0</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm"></div>
                <span className="font-medium">+1.0</span>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="text-center pt-4 border-t w-full">
            <p className="text-xs text-muted-foreground">
              Score range: <span className="font-medium">-1.0</span> (very negative) to <span className="font-medium">+1.0</span> (very positive)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

