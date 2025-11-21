"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";

interface AttributeData {
  attribute: string;
  count: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  percentage: number;
}

interface AttributeBreakdownProps {
  brandAttributes: {
    positive: AttributeData[];
    neutral: AttributeData[];
    negative: AttributeData[];
  };
  competitorAttributes: {
    positive: AttributeData[];
    neutral: AttributeData[];
    negative: AttributeData[];
  };
  isLoading?: boolean;
  detailed?: boolean;
}

export function AttributeBreakdown({ brandAttributes, competitorAttributes, isLoading, detailed = false }: AttributeBreakdownProps) {
  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Top Attributes</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="h-[300px] animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  const AttributeList = ({ 
    attributes, 
    type, 
    title 
  }: { 
    attributes: AttributeData[]; 
    type: 'positive' | 'neutral' | 'negative';
    title: string;
  }) => {
    const displayLimit = detailed ? 10 : 3;
    
    if (attributes.length === 0) {
      return (
        <div className="text-sm text-muted-foreground italic">
          No {type} attributes found
        </div>
      );
    }

    const getIcon = () => {
      switch (type) {
        case 'positive': return <TrendingUp className="h-4 w-4 text-green-500" />;
        case 'negative': return <TrendingDown className="h-4 w-4 text-red-500" />;
        default: return <Minus className="h-4 w-4 text-yellow-500" />;
      }
    };

    const getColor = () => {
      switch (type) {
        case 'positive': return 'bg-green-500';
        case 'negative': return 'bg-red-500';
        default: return 'bg-yellow-500';
      }
    };

    const getBadgeClass = () => {
      switch (type) {
        case 'positive': return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
        case 'negative': return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
        default: return 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100';
      }
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {getIcon()}
          <h4 className="font-semibold text-sm">{title}</h4>
        </div>
        <div className="space-y-2">
          {attributes.slice(0, displayLimit).map((attr, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={getBadgeClass()}>
                  {attr.attribute}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {attr.count} mentions ({attr.percentage.toFixed(0)}%)
                </span>
              </div>
              <Progress value={attr.percentage} className={`h-1.5 ${getColor()}`} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className={detailed ? "" : "h-full flex flex-col"}>
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center gap-2 ${detailed ? "text-xl" : "text-lg"}`}>
          <Sparkles className="h-5 w-5" />
          {detailed ? "Attribute Analysis" : "Top Attributes"}
        </CardTitle>
        <CardDescription>
          {detailed 
            ? "Key attributes mentioned about your brand vs competitors"
            : "Most mentioned brand attributes"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className={detailed ? "" : "flex-1 flex flex-col min-h-0"}>
        <div className={`grid grid-cols-1 ${detailed ? "lg:grid-cols-2" : ""} gap-${detailed ? "8" : "6"}`}>
          {/* Brand Attributes */}
          <div className="space-y-4">
            {detailed && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  Your Brand
                  <Badge variant="secondary">Brand</Badge>
                </h3>
              </div>
            )}
            
            <AttributeList 
              attributes={brandAttributes.positive} 
              type="positive"
              title={detailed ? "Strengths" : "Positive"}
            />
            
            {(detailed || brandAttributes.negative.length > 0) && brandAttributes.negative.length > 0 && (
              <AttributeList 
                attributes={brandAttributes.negative} 
                type="negative"
                title={detailed ? "Areas for Improvement" : "Negative"}
              />
            )}
          </div>

          {/* Competitor Attributes (only in detailed view) */}
          {detailed && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  Competitors
                  <Badge variant="outline">Competitive Intel</Badge>
                </h3>
              </div>
              
              <AttributeList 
                attributes={competitorAttributes.positive} 
                type="positive"
                title="Competitor Strengths"
              />
              
              {competitorAttributes.negative.length > 0 && (
                <AttributeList 
                  attributes={competitorAttributes.negative} 
                  type="negative"
                  title="Competitor Weaknesses"
                />
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
