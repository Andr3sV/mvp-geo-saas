"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ArrowRightLeft, MessageSquare, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLATFORMS } from "@/lib/constants/platforms";

interface Entity {
  id: string;
  name: string;
  domain: string;
  mentions: number;
  percentage: number;
  isBrand: boolean;
}

interface PlatformGapAnalysisProps {
  openaiData: { entities: Entity[]; totalMentions: number };
  geminiData: { entities: Entity[]; totalMentions: number };
  isLoading?: boolean;
}

export function PlatformGapAnalysis({ openaiData, geminiData, isLoading }: PlatformGapAnalysisProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
            Platform Gap Analysis
          </CardTitle>
          <CardDescription>Compare your performance across platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find brand in each platform
  const brandOpenai = openaiData.entities.find((e) => e.isBrand);
  const brandGemini = geminiData.entities.find((e) => e.isBrand);

  if (!brandOpenai && !brandGemini) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
            Platform Gap Analysis
          </CardTitle>
          <CardDescription>Compare your performance across platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[100px] flex items-center justify-center text-muted-foreground">
            No brand data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const openaiShare = brandOpenai?.percentage || 0;
  const geminiShare = brandGemini?.percentage || 0;
  const gap = openaiShare - geminiShare;
  const strongerPlatform = gap > 0 ? "openai" : gap < 0 ? "gemini" : "equal";
  const maxShare = Math.max(openaiShare, geminiShare, 50);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
              Platform Gap Analysis
            </CardTitle>
            <CardDescription>Your market share comparison across platforms</CardDescription>
          </div>
          {strongerPlatform !== "equal" && (
            <div className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium",
              strongerPlatform === "openai" ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-500/10 text-blue-600"
            )}>
              Stronger on {strongerPlatform === "openai" ? "OpenAI" : "Gemini"}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Brand info */}
        <div className="flex items-center gap-3 pb-4 border-b">
          <BrandLogo 
            domain={brandOpenai?.domain || brandGemini?.domain || ""} 
            name={brandOpenai?.name || brandGemini?.name || "Your Brand"} 
            size={32} 
          />
          <div>
            <p className="font-semibold">{brandOpenai?.name || brandGemini?.name || "Your Brand"}</p>
            <p className="text-sm text-muted-foreground">Your brand performance by platform</p>
          </div>
        </div>

        {/* Comparison bars */}
        <div className="space-y-4">
          {/* OpenAI */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" style={{ color: PLATFORMS.openai.color }} />
                <span className="font-medium">OpenAI</span>
              </div>
              <span className="font-bold text-lg tabular-nums" style={{ color: PLATFORMS.openai.color }}>
                {openaiShare.toFixed(1)}%
              </span>
            </div>
            <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${(openaiShare / maxShare) * 100}%`,
                  backgroundColor: PLATFORMS.openai.color
                }}
              />
            </div>
          </div>

          {/* Gemini */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" style={{ color: PLATFORMS.gemini.color }} />
                <span className="font-medium">Gemini</span>
              </div>
              <span className="font-bold text-lg tabular-nums" style={{ color: PLATFORMS.gemini.color }}>
                {geminiShare.toFixed(1)}%
              </span>
            </div>
            <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${(geminiShare / maxShare) * 100}%`,
                  backgroundColor: PLATFORMS.gemini.color
                }}
              />
            </div>
          </div>
        </div>

        {/* Gap indicator */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Platform Gap</span>
            <div className={cn(
              "flex items-center gap-2 font-semibold",
              gap > 0 ? "text-emerald-600" : gap < 0 ? "text-blue-600" : "text-muted-foreground"
            )}>
              {gap > 0 ? (
                <>
                  <TrendingUp className="h-4 w-4" />
                  <span>+{gap.toFixed(1)}% on OpenAI</span>
                </>
              ) : gap < 0 ? (
                <>
                  <TrendingUp className="h-4 w-4" />
                  <span>+{Math.abs(gap).toFixed(1)}% on Gemini</span>
                </>
              ) : (
                <span>Equal performance</span>
              )}
            </div>
          </div>
          
          {Math.abs(gap) > 5 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {gap > 0 
                ? "Consider optimizing your content strategy for Gemini to close the gap."
                : "Consider optimizing your content strategy for OpenAI to close the gap."
              }
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
