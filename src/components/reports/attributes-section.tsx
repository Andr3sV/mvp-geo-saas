"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompetitorAttribute {
  name: string;
  platform: string;
  topic: string;
  positiveAttributes: string[];
  negativeAttributes: string[];
}

interface AttributesSectionProps {
  competitors?: CompetitorAttribute[];
  brandName: string;
  isLoading?: boolean;
}

const platformColors: Record<string, string> = {
  openai: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  gemini: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  claude: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  perplexity: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

const platformLabels: Record<string, string> = {
  openai: "ChatGPT",
  gemini: "Gemini",
  claude: "Claude",
  perplexity: "Perplexity",
};

export function AttributesSection({
  competitors,
  brandName,
  isLoading = false,
}: AttributesSectionProps) {
  // HARDCODED DATA FOR VISUAL PREVIEW
  const hardcodedCompetitors: CompetitorAttribute[] = [
    {
      name: "Eventbrite",
      platform: "openai",
      topic: "Wedding Planning",
      positiveAttributes: ["Wide event coverage", "Mobile app"],
      negativeAttributes: ["Ticketing fees"],
    },
    {
      name: "Zola",
      platform: "gemini",
      topic: "Registry Management",
      positiveAttributes: ["Free registry", "Cash funds"],
      negativeAttributes: ["Limited international shipping"],
    },
    {
      name: "Minted",
      platform: "claude",
      topic: "Invitations",
      positiveAttributes: ["Premium designs"],
      negativeAttributes: ["High prices"],
    },
    {
      name: "WeddingWire",
      platform: "perplexity",
      topic: "Venue Search",
      positiveAttributes: ["Large vendor database", "Free tools"],
      negativeAttributes: ["Ad-heavy interface"],
    },
    {
      name: "Joy",
      platform: "openai",
      topic: "Wedding Website",
      positiveAttributes: ["Modern design", "RSVP management"],
      negativeAttributes: [],
    },
  ];

  const displayCompetitors = hardcodedCompetitors; // Use hardcoded data for preview

  // Calculate summary statistics
  const totalPositive = displayCompetitors.reduce(
    (sum, comp) => sum + comp.positiveAttributes.length,
    0
  );
  const totalNegative = displayCompetitors.reduce(
    (sum, comp) => sum + comp.negativeAttributes.length,
    0
  );
  const uniquePositiveAttrs = new Set(
    displayCompetitors.flatMap((comp) => comp.positiveAttributes)
  );
  const uniqueNegativeAttrs = new Set(
    displayCompetitors.flatMap((comp) => comp.negativeAttributes)
  );

  if (isLoading) {
    return (
      <Card className="w-full border-0 shadow-sm">
        <CardContent className="p-8">
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">Loading attributes...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (displayCompetitors.length === 0) {
    return (
      <Card className="w-full border-0 shadow-sm">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center h-32 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              No attribute data available for this period.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const insightText = `Based on AI responses, your brand ${brandName} is being compared with ${displayCompetitors.length} competitors across different attributes. ${uniquePositiveAttrs.size} distinct positive attributes and ${uniqueNegativeAttrs.size} distinct negative attributes were identified. Competitors like ${displayCompetitors.slice(0, 2).map((c) => c.name).join(" and ")} are frequently mentioned with specific strengths and weaknesses that users should be aware of when considering ${brandName}.`;

  return (
    <Card className="w-full border-0 shadow-sm">
      <CardContent className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left side: Insight text */}
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight mb-6 flex items-center gap-2">
                <Target className="h-5 w-5" />
                Attributes
              </h3>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Positive and negative attributes that stand out about your brand compared to competitors
                </p>
                
                {/* Summary stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Positive Attributes
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {uniquePositiveAttrs.size}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {totalPositive} total mentions
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Negative Attributes
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-red-600">
                      {uniqueNegativeAttrs.size}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {totalNegative} total mentions
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                    {insightText}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side: Competitors list with attributes */}
          <div className="flex flex-col">
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-2">
              {displayCompetitors.map((competitor, index) => (
                <Card
                  key={index}
                  className="border hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h4 className="font-semibold text-sm">
                            {competitor.name}
                          </h4>
                          
                          <Badge
                            variant="outline"
                            className="text-xs bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                          >
                            {platformLabels[competitor.platform.toLowerCase()] || competitor.platform}
                          </Badge>
                          
                          <Badge
                            variant="outline"
                            className="text-xs bg-transparent text-muted-foreground border-border font-medium"
                          >
                            <Hash className="h-3 w-3 mr-1" />
                            {competitor.topic}
                          </Badge>
                        </div>
                        
                        {/* Positive attributes */}
                        {competitor.positiveAttributes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {competitor.positiveAttributes.map((attr, attrIndex) => (
                              <Badge
                                key={`pos-${attrIndex}`}
                                variant="outline"
                                className="text-xs font-normal bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
                              >
                                {attr}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {/* Negative attributes */}
                        {competitor.negativeAttributes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {competitor.negativeAttributes.map((attr, attrIndex) => (
                              <Badge
                                key={`neg-${attrIndex}`}
                                variant="outline"
                                className="text-xs font-normal bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
                              >
                                {attr}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

