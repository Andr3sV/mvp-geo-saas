"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

interface MentionedCompetitor {
  name: string;
  platform: string;
  topic: string;
  attributes: Array<{
    text: string;
    type: "positive" | "negative";
  }>;
}

interface NewCompetitorsSectionProps {
  competitors?: MentionedCompetitor[];
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

export function NewCompetitorsSection({
  competitors,
  brandName,
  isLoading = false,
}: NewCompetitorsSectionProps) {
  // HARDCODED DATA FOR VISUAL PREVIEW
  const hardcodedCompetitors: MentionedCompetitor[] = [
    {
      name: "Eventbrite",
      platform: "openai",
      topic: "Wedding Planning",
      attributes: [
        { text: "Wide event coverage", type: "positive" },
        { text: "Mobile app", type: "positive" },
        { text: "Ticketing fees", type: "negative" },
      ],
    },
    {
      name: "Zola",
      platform: "gemini",
      topic: "Registry Management",
      attributes: [
        { text: "Free registry", type: "positive" },
        { text: "Cash funds", type: "positive" },
        { text: "Limited international shipping", type: "negative" },
      ],
    },
    {
      name: "Minted",
      platform: "claude",
      topic: "Invitations",
      attributes: [
        { text: "Premium designs", type: "positive" },
        { text: "High prices", type: "negative" },
      ],
    },
    {
      name: "WeddingWire",
      platform: "perplexity",
      topic: "Venue Search",
      attributes: [
        { text: "Large vendor database", type: "positive" },
        { text: "Free tools", type: "positive" },
        { text: "Ad-heavy interface", type: "negative" },
      ],
    },
    {
      name: "Joy",
      platform: "openai",
      topic: "Wedding Website",
      attributes: [
        { text: "Modern design", type: "positive" },
        { text: "RSVP management", type: "positive" },
      ],
    },
    {
      name: "Honeyfund",
      platform: "gemini",
      topic: "Gift Registry",
      attributes: [
        { text: "Experience-focused", type: "positive" },
        { text: "Low fees", type: "positive" },
      ],
    },
  ];

  const displayCompetitors = hardcodedCompetitors; // Use hardcoded data for preview

  if (isLoading) {
    return (
      <Card className="w-full border-0 shadow-sm">
        <CardContent className="p-8">
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">Loading competitors...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (displayCompetitors.length === 0) {
    return (
      <Card className="w-full border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            New Competitors on Radar
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center h-32 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              No competitors with mentions found in this period.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const insightText = displayCompetitors.length > 0
    ? `During this period, ${displayCompetitors.length} new competitors were mentioned in AI responses that are not currently in your radar. These competitors appear across different platforms and topics, providing insights into emerging competitive threats and opportunities in your market space.`
    : "No new competitors were mentioned in AI responses during this period that are not already in your radar.";

  return (
    <Card className="w-full border-0 shadow-sm">
      <CardContent className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left side: Insight text */}
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight mb-6 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                New Competitors on Radar
              </h3>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Competitors mentioned in AI responses that are not in your radar
                </p>
                <div className="pt-2">
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                    {insightText}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side: Competitors list */}
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
                        
                        {competitor.attributes && competitor.attributes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {competitor.attributes.map((attr, attrIndex) => (
                              <Badge
                                key={attrIndex}
                                variant="outline"
                                className={cn(
                                  "text-xs font-normal",
                                  attr.type === "positive"
                                    ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
                                    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
                                )}
                              >
                                {attr.text}
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

