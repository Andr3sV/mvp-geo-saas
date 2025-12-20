"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Grid3X3 } from "lucide-react";

interface QueryDomainCorrelationData {
  queries: string[];
  domains: string[];
  matrix: number[][];
}

interface QueryDomainHeatmapProps {
  data: QueryDomainCorrelationData;
  isLoading?: boolean;
}

export function QueryDomainHeatmap({ data, isLoading }: QueryDomainHeatmapProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-muted-foreground" />
            Query-Domain Correlation
          </CardTitle>
          <CardDescription>Which queries lead to which domains being cited</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.queries.length === 0 || data.domains.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-muted-foreground" />
            Query-Domain Correlation
          </CardTitle>
          <CardDescription>Which queries lead to which domains being cited</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Grid3X3 className="h-12 w-12 opacity-50" />
            <p>No correlation data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find max value for color intensity
  const maxValue = Math.max(...data.matrix.flat(), 1);

  // Get color intensity based on value
  const getIntensity = (value: number) => {
    const intensity = value / maxValue;
    return `rgba(59, 130, 246, ${Math.max(0.1, intensity * 0.9)})`; // blue
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-muted-foreground" />
          Query-Domain Correlation
        </CardTitle>
        <CardDescription>Which queries lead to which domains being cited (color intensity = frequency)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground border-b">
                  Query
                </th>
                {data.domains.map((domain, i) => (
                  <th key={`header-${i}`} className="p-2 text-center border-b min-w-[60px]">
                    <div className="flex flex-col items-center gap-1">
                      <BrandLogo domain={domain} name={domain} size={20} />
                      <span className="text-[9px] text-muted-foreground truncate max-w-[60px]" title={domain}>
                        {domain.length > 10 ? domain.substring(0, 10) + "..." : domain}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.queries.map((query, rowIndex) => (
                <tr key={`row-${rowIndex}`} className="hover:bg-muted/20">
                  <td className="p-2 text-xs border-b max-w-[200px] truncate" title={query}>
                    {query.length > 35 ? query.substring(0, 35) + "..." : query}
                  </td>
                  {data.matrix[rowIndex].map((value, colIndex) => (
                    <td
                      key={`cell-${rowIndex}-${colIndex}`}
                      className="p-1 text-center border-b"
                    >
                      <div
                        className="mx-auto w-10 h-8 rounded flex items-center justify-center text-xs font-semibold transition-colors"
                        style={{
                          backgroundColor: value > 0 ? getIntensity(value) : "transparent",
                          color: value > maxValue * 0.5 ? "white" : value > 0 ? "#1e40af" : "transparent",
                        }}
                      >
                        {value > 0 ? value : ""}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>Top {data.queries.length} queries × Top {data.domains.length} domains</span>
          <div className="flex items-center gap-2">
            <span>Intensity:</span>
            <div className="flex items-center gap-0.5">
              <div className="w-4 h-3 rounded" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }} />
              <div className="w-4 h-3 rounded" style={{ backgroundColor: "rgba(59, 130, 246, 0.4)" }} />
              <div className="w-4 h-3 rounded" style={{ backgroundColor: "rgba(59, 130, 246, 0.7)" }} />
              <div className="w-4 h-3 rounded" style={{ backgroundColor: "rgba(59, 130, 246, 0.9)" }} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
