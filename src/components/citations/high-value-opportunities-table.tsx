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
import { ExternalLink } from "lucide-react";

interface OpportunityData {
  domain: string;
  domainRating: number;
  competitorsMentioned: string[];
  citationFrequency: number;
  opportunityScore: number;
  priority: string;
  topics: string[];
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
          High-authority domains citing your competitors - outreach opportunities
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead className="text-center">DR</TableHead>
                <TableHead>Competitors Mentioned</TableHead>
                <TableHead className="text-center">Citations</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No high-value opportunities identified yet
                  </TableCell>
                </TableRow>
              ) : (
                data.map((opportunity) => (
                  <TableRow key={opportunity.domain}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {opportunity.domain}
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={getDRColor(opportunity.domainRating)}>
                        {opportunity.domainRating}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {opportunity.competitorsMentioned.slice(0, 3).map((comp) => (
                          <Badge key={comp} variant="outline" className="text-xs">
                            {comp}
                          </Badge>
                        ))}
                        {opportunity.competitorsMentioned.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{opportunity.competitorsMentioned.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {opportunity.citationFrequency}
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

