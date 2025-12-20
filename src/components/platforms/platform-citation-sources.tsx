"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Link2, MessageSquare, Sparkles } from "lucide-react";
import { PLATFORMS } from "@/lib/constants/platforms";

interface DomainData {
  domain: string;
  count: number;
}

interface PlatformCitationSourcesProps {
  openaiData: DomainData[];
  geminiData: DomainData[];
  isLoading?: boolean;
}

export function PlatformCitationSources({ openaiData, geminiData, isLoading }: PlatformCitationSourcesProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5 text-muted-foreground" />
            Citation Sources by Platform
          </CardTitle>
          <CardDescription>Top cited domains per platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
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
            <Link2 className="h-5 w-5 text-muted-foreground" />
            Citation Sources by Platform
          </CardTitle>
          <CardDescription>Top cited domains per platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[100px] flex items-center justify-center text-muted-foreground">
            No citation data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderDomainList = (domains: DomainData[], platform: "openai" | "gemini") => {
    const maxCount = Math.max(...domains.map((d) => d.count), 1);
    const config = PLATFORMS[platform];

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          {platform === "openai" ? (
            <MessageSquare className="h-4 w-4" style={{ color: config.color }} />
          ) : (
            <Sparkles className="h-4 w-4" style={{ color: config.color }} />
          )}
          <span className="font-medium text-sm" style={{ color: config.color }}>
            {config.name}
          </span>
          <span className="text-xs text-muted-foreground">
            ({domains.reduce((sum, d) => sum + d.count, 0)} citations)
          </span>
        </div>

        {domains.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No citations</p>
        ) : (
          domains.slice(0, 5).map((domain, index) => {
            const barWidth = (domain.count / maxCount) * 100;
            return (
              <div key={domain.domain} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                <BrandLogo domain={domain.domain} name={domain.domain} size={16} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs truncate">{domain.domain}</span>
                    <span className="text-xs font-semibold tabular-nums ml-2">{domain.count}</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${barWidth}%`, backgroundColor: config.color }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Link2 className="h-5 w-5 text-muted-foreground" />
          Citation Sources by Platform
        </CardTitle>
        <CardDescription>Top cited domains per platform</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderDomainList(openaiData, "openai")}
          {renderDomainList(geminiData, "gemini")}
        </div>
      </CardContent>
    </Card>
  );
}
