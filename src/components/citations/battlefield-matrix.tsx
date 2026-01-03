"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/ui/brand-logo";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopicData {
  id: string;
  name: string;
  color?: string;
}

interface BrandTopicData {
  topicId: string;
  topicName: string;
  topicColor?: string;
  brandId: string;
  brandName: string;
  brandDomain?: string;
  brandColor?: string;
  isBrand: boolean;
  share: number;
  trend?: number;
}

interface BattlefieldMatrixProps {
  topics: TopicData[];
  brandData: BrandTopicData[];
  isLoading?: boolean;
}

export function BattlefieldMatrix({ topics, brandData, isLoading }: BattlefieldMatrixProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Battlefield</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group data by brand
  const brandsMap = new Map<string, BrandTopicData[]>();
  brandData.forEach((data) => {
    if (!brandsMap.has(data.brandId)) {
      brandsMap.set(data.brandId, []);
    }
    brandsMap.get(data.brandId)!.push(data);
  });

  // Get all unique brands, with brand first
  const allBrands = Array.from(brandsMap.keys()).sort((a, b) => {
    const aData = brandData.find((d) => d.brandId === a);
    const bData = brandData.find((d) => d.brandId === b);
    if (aData?.isBrand) return -1;
    if (bData?.isBrand) return 1;
    return 0;
  });

  // Get brand info for each brand
  const getBrandInfo = (brandId: string) => {
    return brandData.find((d) => d.brandId === brandId);
  };

  // Get share for a brand in a topic
  const getShareForBrandTopic = (brandId: string, topicId: string) => {
    const brandTopics = brandsMap.get(brandId) || [];
    const topicData = brandTopics.find((d) => d.topicId === topicId);
    return topicData?.share || 0;
  };

  // Get trend for a brand in a topic
  const getTrendForBrandTopic = (brandId: string, topicId: string) => {
    const brandTopics = brandsMap.get(brandId) || [];
    const topicData = brandTopics.find((d) => d.topicId === topicId);
    return topicData?.trend;
  };

  // Calculate average share for each brand (average across all topics)
  const getAverageShare = (brandId: string) => {
    const brandTopics = brandsMap.get(brandId) || [];
    if (brandTopics.length === 0) return 0;
    const sum = brandTopics.reduce((sum, d) => sum + d.share, 0);
    return sum / brandTopics.length;
  };

  const getTrendIcon = (trend?: number) => {
    if (trend === undefined || trend === null) return null;
    if (trend > 0) return <TrendingUp className="h-3 w-3 text-emerald-600" />;
    if (trend < 0) return <TrendingDown className="h-3 w-3 text-rose-600" />;
    return <Minus className="h-2.5 w-2.5 text-muted-foreground" />;
  };

  const getTrendColor = (trend?: number) => {
    if (trend === undefined || trend === null) return "text-muted-foreground";
    if (trend > 0) return "text-emerald-600";
    if (trend < 0) return "text-rose-600";
    return "text-muted-foreground";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Battlefield</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-background border-b border-r border-border p-3 text-left text-xs font-medium text-muted-foreground">
                    Brand
                  </th>
                  {topics.map((topic) => (
                    <th
                      key={topic.id}
                      className="border-b border-r border-border p-3 text-center text-xs font-medium text-muted-foreground min-w-[100px]"
                    >
                      {topic.name}
                    </th>
                  ))}
                  <th className="border-b border-border p-3 text-center text-xs font-medium text-muted-foreground min-w-[80px]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {allBrands.map((brandId) => {
                  const brandInfo = getBrandInfo(brandId);
                  if (!brandInfo) return null;

                  const averageShare = getAverageShare(brandId);

                  return (
                    <tr
                      key={brandId}
                      className={cn(
                        "hover:bg-muted/50 transition-colors",
                        brandInfo.isBrand && "bg-muted/30"
                      )}
                    >
                      <td className="sticky left-0 z-10 bg-inherit border-b border-r border-border p-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                            style={{
                              backgroundColor: `${brandInfo.brandColor || "#64748b"}20`,
                            }}
                          >
                            <BrandLogo
                              domain={brandInfo.brandDomain || brandInfo.brandName}
                              name={brandInfo.brandName}
                              size={16}
                            />
                          </div>
                          <span
                            className={cn(
                              "text-sm font-medium truncate",
                              brandInfo.isBrand && "text-primary font-semibold"
                            )}
                          >
                            {brandInfo.brandName}
                          </span>
                        </div>
                      </td>
                      {topics.map((topic) => {
                        const share = getShareForBrandTopic(brandId, topic.id);
                        const trend = getTrendForBrandTopic(brandId, topic.id);

                        return (
                          <td
                            key={topic.id}
                            className="border-b border-r border-border p-3 text-center"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-sm font-medium tabular-nums">
                                {share.toFixed(1)}%
                              </span>
                              {trend !== undefined && trend !== null && (
                                <div className={cn("flex items-center gap-0.5", getTrendColor(trend))}>
                                  {getTrendIcon(trend)}
                                  <span className="text-xs tabular-nums">
                                    {trend > 0 ? "+" : ""}{trend.toFixed(1)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="border-b border-border p-3 text-center">
                        <span className="text-sm font-semibold tabular-nums">
                          {averageShare.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

