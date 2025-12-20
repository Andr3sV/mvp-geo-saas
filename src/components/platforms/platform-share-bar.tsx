"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface Platform {
  id: string;
  name: string;
  color: string;
  share: number;
  mentions: number;
}

interface PlatformShareBarProps {
  platforms: Platform[];
  isLoading?: boolean;
}

export function PlatformShareBar({ platforms, isLoading }: PlatformShareBarProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            Platform Share Distribution
          </CardTitle>
          <CardDescription>Visual comparison of mentions across platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-12 bg-muted rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const totalMentions = platforms.reduce((sum, p) => sum + p.mentions, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              Platform Share Distribution
            </CardTitle>
            <CardDescription>Visual comparison of mentions across platforms</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold tabular-nums">{totalMentions.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">total mentions</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Main share bar */}
        <div className="h-12 rounded-lg overflow-hidden flex">
          {platforms.map((platform) => (
            <div
              key={platform.id}
              className="h-full flex items-center justify-center transition-all hover:opacity-90"
              style={{ 
                width: `${platform.share}%`, 
                backgroundColor: platform.color,
                minWidth: platform.share > 0 ? "60px" : "0"
              }}
            >
              <span className="text-white font-semibold text-sm">
                {platform.share}%
              </span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4">
          {platforms.map((platform) => (
            <div key={platform.id} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: platform.color }}
              />
              <span className="text-sm font-medium">{platform.name}</span>
              <span className="text-sm text-muted-foreground">
                ({platform.mentions.toLocaleString()})
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
