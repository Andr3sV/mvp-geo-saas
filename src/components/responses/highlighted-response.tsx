"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Mention {
  id: string;
  entity_name: string;
  brand_type: string;
  start_index: number | null;
  end_index: number | null;
}

interface HighlightedResponseProps {
  responseText: string | null;
  mentions: Mention[];
  className?: string;
}

interface TextSegment {
  text: string;
  type: "normal" | "bold" | "link" | "highlight" | "highlight-bold" | "highlight-link";
  isClientBrand: boolean;
  entityName?: string;
  linkUrl?: string;
  linkText?: string;
}

export function HighlightedResponse({
  responseText,
  mentions,
  className,
}: HighlightedResponseProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!responseText) {
    return (
      <Card className={cn(className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Response</CardTitle>
          <CardDescription>AI-generated response content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[100px] text-muted-foreground">
            <p>No response text available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Parse markdown and build segments with highlights
  const buildSegments = (): TextSegment[] => {
    const segments: TextSegment[] = [];
    let i = 0;
    const text = responseText;

    // Filter mentions with valid indices
    const validMentions = mentions.filter(
      (m) => m.start_index !== null && m.end_index !== null
    );

    // Create a map of character positions to mention info
    // Also track which positions are inside mentions
    const mentionStartMap = new Map<number, { end: number; mention: Mention }>();
    const mentionRangeMap = new Map<number, { end: number; mention: Mention }>();
    validMentions.forEach((mention) => {
      const start = mention.start_index!;
      const end = mention.end_index!;
      mentionStartMap.set(start, { end, mention });
      // Mark all positions within the mention range
      for (let pos = start; pos < end; pos++) {
        mentionRangeMap.set(pos, { end, mention });
      }
    });

    // Parse markdown and build segments
    while (i < text.length) {
      // Check if we're at a mention start
      const mentionInfo = mentionStartMap.get(i);
      
      if (mentionInfo) {
        // We're at a mention - check if it's within markdown
        const mentionEnd = mentionInfo.end;
        const mentionText = text.substring(i, mentionEnd);
        
        // Check for markdown within the mention
        if (text.substring(i, Math.min(i + 2, text.length)) === "**") {
          // Bold markdown
          const boldEnd = text.indexOf("**", i + 2);
          if (boldEnd !== -1 && boldEnd <= mentionEnd) {
            // Bold within mention
            segments.push({
              text: text.substring(i + 2, boldEnd),
              type: "highlight-bold",
              isClientBrand: mentionInfo.mention.brand_type === "client",
              entityName: mentionInfo.mention.entity_name,
            });
            i = boldEnd + 2;
            continue;
          }
        }
        
        // Check for link markdown
        const linkMatch = text.substring(i).match(/^\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch && i + linkMatch[0].length <= mentionEnd) {
          segments.push({
            text: linkMatch[1],
            type: "highlight-link",
            isClientBrand: mentionInfo.mention.brand_type === "client",
            entityName: mentionInfo.mention.entity_name,
            linkText: linkMatch[1],
            linkUrl: linkMatch[2],
          });
          i += linkMatch[0].length;
          continue;
        }
        
        // Regular highlight
        segments.push({
          text: mentionText,
          type: "highlight",
          isClientBrand: mentionInfo.mention.brand_type === "client",
          entityName: mentionInfo.mention.entity_name,
        });
        i = mentionEnd;
        continue;
      }

      // Check for markdown patterns
      if (text.substring(i, Math.min(i + 2, text.length)) === "**") {
        // Bold text
        const boldEnd = text.indexOf("**", i + 2);
        if (boldEnd !== -1) {
          const boldText = text.substring(i + 2, boldEnd);
          segments.push({
            text: boldText,
            type: "bold",
            isClientBrand: false,
          });
          i = boldEnd + 2;
          continue;
        }
      }

      // Check for link markdown [text](url)
      const linkMatch = text.substring(i).match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        segments.push({
          text: linkMatch[1],
          type: "link",
          isClientBrand: false,
          linkText: linkMatch[1],
          linkUrl: linkMatch[2],
        });
        i += linkMatch[0].length;
        continue;
      }

      // Regular text - find next special character
      let nextSpecial = text.length;
      for (let j = i; j < text.length; j++) {
        if (mentionStartMap.has(j) || 
            text.substring(j, Math.min(j + 2, text.length)) === "**" ||
            text.substring(j).match(/^\[/)) {
          nextSpecial = j;
          break;
        }
      }

      if (nextSpecial > i) {
        segments.push({
          text: text.substring(i, nextSpecial),
          type: "normal",
          isClientBrand: false,
        });
        i = nextSpecial;
      } else {
        // Fallback: add remaining character
        segments.push({
          text: text[i],
          type: "normal",
          isClientBrand: false,
        });
        i++;
      }
    }

    return segments;
  };

  const segments = buildSegments();
  const shouldTruncate = responseText.length > 1000 && !isExpanded;

  // Build truncated segments if needed
  const displaySegments = shouldTruncate
    ? (() => {
        let charCount = 0;
        const truncated: TextSegment[] = [];
        for (const segment of segments) {
          if (charCount >= 1000) break;
          if (charCount + segment.text.length <= 1000) {
            truncated.push(segment);
            charCount += segment.text.length;
          } else {
            const remaining = 1000 - charCount;
            truncated.push({
              ...segment,
              text: segment.text.substring(0, remaining) + "...",
            });
            break;
          }
        }
        return truncated;
      })()
    : segments;

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Response</CardTitle>
            <CardDescription>AI-generated response content</CardDescription>
          </div>
          {responseText.length > 1000 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gap-1"
            >
              {isExpanded ? (
                <>
                  Collapse <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  Expand <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {displaySegments.map((segment, index) => {
              const highlightClass = cn(
                "px-0.5 rounded-sm",
                segment.isClientBrand
                  ? "bg-yellow-200 dark:bg-yellow-900/50 ring-2 ring-pink-500 dark:ring-pink-400"
                  : "bg-yellow-200 dark:bg-yellow-900/50"
              );

              // Link segments
              if (segment.type === "link" || segment.type === "highlight-link") {
                const linkElement = (
                  <a
                    href={segment.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline dark:text-blue-400 inline-flex items-center gap-1"
                  >
                    {segment.text}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                );

                if (segment.type === "highlight-link") {
                  return (
                    <mark key={index} className={highlightClass} title={segment.entityName}>
                      {linkElement}
                    </mark>
                  );
                }
                return <span key={index}>{linkElement}</span>;
              }

              // Bold segments
              if (segment.type === "bold" || segment.type === "highlight-bold") {
                const boldElement = <strong>{segment.text}</strong>;
                if (segment.type === "highlight-bold") {
                  return (
                    <mark key={index} className={highlightClass} title={segment.entityName}>
                      {boldElement}
                    </mark>
                  );
                }
                return <span key={index}>{boldElement}</span>;
              }

              // Highlight segments
              if (segment.type === "highlight") {
                return (
                  <mark
                    key={index}
                    className={highlightClass}
                    title={segment.entityName}
                  >
                    {segment.text}
                  </mark>
                );
              }

              // Normal text
              return <span key={index}>{segment.text}</span>;
            })}
          </div>
        </div>

        {/* Character count */}
        <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>{responseText.length.toLocaleString()} characters</span>
          {mentions.length > 0 && (
            <span>{mentions.length} highlighted mentions</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

