"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Link2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OpportunityData {
  domain: string;
  domainRating: number;
  competitorsMentioned: string[];
  citationFrequency: number;
  opportunityScore: number;
  priority: string;
  topics: string[];
  pages?: string[]; // URLs/pages where competitors are mentioned
}

interface HighValueOpportunitiesTableProps {
  data: OpportunityData[];
}

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "high":
      return <Badge variant="destructive">High</Badge>;
    case "medium":
      return <Badge variant="default">Medium</Badge>;
    case "low":
      return <Badge variant="secondary">Low</Badge>;
    default:
      return <Badge variant="outline">{priority}</Badge>;
  }
};

const getDRColor = (rating: number) => {
  if (rating >= 80) return "text-green-600 font-semibold";
  if (rating >= 60) return "text-blue-600 font-medium";
  if (rating >= 40) return "text-orange-500";
  return "text-gray-500";
};

export function HighValueOpportunitiesTable({
  data,
}: HighValueOpportunitiesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>High Value Sources Not Mentioning You</CardTitle>
        <p className="text-sm text-muted-foreground">
          Domains where competitors are cited but you're not - prime outreach targets
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead>Competitors Mentioned</TableHead>
                <TableHead className="text-center">Citations</TableHead>
                <TableHead className="text-center">DR</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <p>No opportunities found yet</p>
                      <p className="text-xs max-w-md">
                        Add competitors and run analysis with Perplexity/Gemini to discover 
                        high-authority domains where your competitors are cited but you're not
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((opportunity) => (
                  <TableRow key={opportunity.domain}>
                    <TableCell>
                      <a
                        href={`https://${opportunity.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 hover:text-primary transition-colors"
                      >
                        <span className="font-mono text-sm">
                          {opportunity.domain}
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2 max-w-lg">
                        {opportunity.pages && opportunity.pages.length > 0 ? (
                          <>
                            {opportunity.pages.slice(0, 5).map((url, idx) => {
                              // Normalize URL
                              let normalizedUrl = url;
                              if (!url.startsWith('http://') && !url.startsWith('https://')) {
                                normalizedUrl = `https://${url}`;
                              }
                              
                              return (
                                <Tooltip key={idx}>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={normalizedUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center justify-center"
                                    >
                                      <div className="p-1.5 rounded-md border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors cursor-pointer">
                                        <Link2 className="h-4 w-4" />
                                      </div>
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-md break-all">
                                    <p className="text-xs">{url}</p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                            {opportunity.pages.length > 5 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="px-2 py-1 rounded-md border border-border bg-muted/50">
                                    <span className="text-xs font-medium">+{opportunity.pages.length - 5}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-md">
                                  <p className="text-xs">
                                    {opportunity.pages.length - 5} more pages
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No pages</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {opportunity.competitorsMentioned.slice(0, 3).map((comp) => (
                          <Badge key={comp} variant="outline" className="text-xs">
                            {comp}
                          </Badge>
                        ))}
                        {opportunity.competitorsMentioned.length > 3 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs cursor-help">
                                +{opportunity.competitorsMentioned.length - 3}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="top" 
                              className="max-w-xs bg-background border border-border text-foreground shadow-md p-2"
                            >
                              <div className="flex flex-wrap gap-1">
                                {opportunity.competitorsMentioned.slice(3).map((comp) => (
                                  <Badge key={comp} variant="secondary" className="text-xs">
                                    {comp}
                                  </Badge>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {opportunity.citationFrequency}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={getDRColor(opportunity.domainRating)}>
                        {opportunity.domainRating}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold">
                        {opportunity.opportunityScore}
                      </span>
                    </TableCell>
                    <TableCell>{getPriorityBadge(opportunity.priority)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

