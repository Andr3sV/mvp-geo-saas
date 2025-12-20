"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Rocket, TrendingUp, TrendingDown, ArrowRight, MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLATFORMS } from "@/lib/constants/platforms";

interface Entity {
  id: string;
  name: string;
  domain: string;
  mentions: number;
  percentage: number;
  trend: number;
  isBrand: boolean;
}

interface PlatformMomentumProps {
  openaiData: Entity[];
  geminiData: Entity[];
  isLoading?: boolean;
}

// Quadrant component
function MomentumQuadrant({ 
  entities, 
  title, 
  description, 
  color 
}: { 
  entities: Entity[]; 
  title: string; 
  description: string; 
  color: string;
}) {
  return (
    <div className={cn("p-3 rounded-lg", color)}>
      <p className="text-xs font-medium mb-1">{title}</p>
      <p className="text-[10px] text-muted-foreground mb-2">{description}</p>
      <div className="space-y-1">
        {entities.slice(0, 3).map((entity) => (
          <div key={entity.id} className="flex items-center gap-1.5 bg-background/50 rounded p-1">
            <BrandLogo domain={entity.domain} name={entity.name} size={12} />
            <span className="text-[10px] truncate flex-1">{entity.name}</span>
            <span className={cn(
              "text-[10px] font-medium",
              entity.trend > 0 ? "text-emerald-600" : entity.trend < 0 ? "text-rose-600" : ""
            )}>
              {entity.trend > 0 ? "+" : ""}{entity.trend}%
            </span>
          </div>
        ))}
        {entities.length === 0 && (
          <p className="text-[10px] text-muted-foreground italic">No entities</p>
        )}
      </div>
    </div>
  );
}

// Platform momentum section
function PlatformSection({ 
  platform, 
  entities 
}: { 
  platform: "openai" | "gemini"; 
  entities: Entity[];
}) {
  const config = PLATFORMS[platform];
  const Icon = platform === "openai" ? MessageSquare : Sparkles;

  // Classify entities into quadrants
  const medianShare = entities.length > 0 
    ? entities.map(e => e.percentage).sort((a, b) => a - b)[Math.floor(entities.length / 2)]
    : 0;
  
  const stars = entities.filter(e => e.percentage >= medianShare && e.trend > 0); // High share, growing
  const opportunities = entities.filter(e => e.percentage < medianShare && e.trend > 0); // Low share, growing
  const established = entities.filter(e => e.percentage >= medianShare && e.trend <= 0); // High share, stagnant/declining
  const challengers = entities.filter(e => e.percentage < medianShare && e.trend <= 0); // Low share, stagnant/declining

  return (
    <div>
      {/* Platform header */}
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4" style={{ color: config.color }} />
        <span className="font-medium" style={{ color: config.color }}>{config.name}</span>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-2">
        <MomentumQuadrant
          entities={stars}
          title="⭐ Stars"
          description="High share + Growing"
          color="bg-emerald-50 dark:bg-emerald-950/20"
        />
        <MomentumQuadrant
          entities={opportunities}
          title="🚀 Rising"
          description="Low share + Growing"
          color="bg-blue-50 dark:bg-blue-950/20"
        />
        <MomentumQuadrant
          entities={established}
          title="🏢 Established"
          description="High share + Stable"
          color="bg-amber-50 dark:bg-amber-950/20"
        />
        <MomentumQuadrant
          entities={challengers}
          title="⚡ Challengers"
          description="Low share + Needs focus"
          color="bg-slate-50 dark:bg-slate-950/20"
        />
      </div>
    </div>
  );
}

export function PlatformMomentum({ openaiData, geminiData, isLoading }: PlatformMomentumProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Rocket className="h-5 w-5 text-muted-foreground" />
            Platform Momentum Comparison
          </CardTitle>
          <CardDescription>Market position and growth trend per platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData = openaiData.length > 0 || geminiData.length > 0;

  if (!hasData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Rocket className="h-5 w-5 text-muted-foreground" />
            Platform Momentum Comparison
          </CardTitle>
          <CardDescription>Market position and growth trend per platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[100px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find brand in each platform for summary
  const brandOpenai = openaiData.find(e => e.isBrand);
  const brandGemini = geminiData.find(e => e.isBrand);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Rocket className="h-5 w-5 text-muted-foreground" />
          Platform Momentum Comparison
        </CardTitle>
        <CardDescription>Market position and growth trend per platform</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Brand summary */}
        {(brandOpenai || brandGemini) && (
          <div className="mb-6 p-4 rounded-lg bg-muted/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo 
                domain={brandOpenai?.domain || brandGemini?.domain || ""} 
                name={brandOpenai?.name || brandGemini?.name || "Your Brand"} 
                size={28} 
              />
              <div>
                <p className="font-medium">{brandOpenai?.name || brandGemini?.name || "Your Brand"}</p>
                <p className="text-xs text-muted-foreground">Your position across platforms</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {/* OpenAI stats */}
              <div className="text-center">
                <div className="flex items-center gap-1 text-sm" style={{ color: PLATFORMS.openai.color }}>
                  <MessageSquare className="h-3 w-3" />
                  <span className="font-medium">OpenAI</span>
                </div>
                <p className="text-lg font-bold tabular-nums">{brandOpenai?.percentage || 0}%</p>
                <p className={cn(
                  "text-xs flex items-center justify-center gap-0.5",
                  (brandOpenai?.trend || 0) > 0 ? "text-emerald-600" : (brandOpenai?.trend || 0) < 0 ? "text-rose-600" : "text-muted-foreground"
                )}>
                  {(brandOpenai?.trend || 0) > 0 ? <TrendingUp className="h-3 w-3" /> : (brandOpenai?.trend || 0) < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                  {(brandOpenai?.trend || 0) > 0 ? "+" : ""}{brandOpenai?.trend || 0}%
                </p>
              </div>

              <ArrowRight className="h-4 w-4 text-muted-foreground" />

              {/* Gemini stats */}
              <div className="text-center">
                <div className="flex items-center gap-1 text-sm" style={{ color: PLATFORMS.gemini.color }}>
                  <Sparkles className="h-3 w-3" />
                  <span className="font-medium">Gemini</span>
                </div>
                <p className="text-lg font-bold tabular-nums">{brandGemini?.percentage || 0}%</p>
                <p className={cn(
                  "text-xs flex items-center justify-center gap-0.5",
                  (brandGemini?.trend || 0) > 0 ? "text-emerald-600" : (brandGemini?.trend || 0) < 0 ? "text-rose-600" : "text-muted-foreground"
                )}>
                  {(brandGemini?.trend || 0) > 0 ? <TrendingUp className="h-3 w-3" /> : (brandGemini?.trend || 0) < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                  {(brandGemini?.trend || 0) > 0 ? "+" : ""}{brandGemini?.trend || 0}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Side by side platform comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PlatformSection platform="openai" entities={openaiData} />
          <PlatformSection platform="gemini" entities={geminiData} />
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
          <p>Entities are classified based on market share relative to median and growth trend.</p>
        </div>
      </CardContent>
    </Card>
  );
}
