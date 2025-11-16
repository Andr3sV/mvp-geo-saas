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
import { Progress } from "@/components/ui/progress";

interface TopicData {
  topic: string;
  category?: string;
  yourCitations: number;
  yourShare: number;
  competitorData: Record<string, number>;
  totalCitations: number;
  dominanceLevel?: string;
  opportunityScore: number;
}

interface CompetitiveTopicsTableProps {
  data: TopicData[];
}

const getDominanceBadge = (level?: string) => {
  switch (level) {
    case "leader":
      return <Badge variant="default">Leader</Badge>;
    case "competitor":
      return <Badge className="bg-blue-500">Competitor</Badge>;
    case "follower":
      return <Badge variant="secondary">Follower</Badge>;
    case "absent":
      return <Badge variant="outline">Absent</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

const getOpportunityColor = (score: number) => {
  if (score >= 75) return "text-green-600 font-bold";
  if (score >= 50) return "text-blue-600 font-semibold";
  if (score >= 25) return "text-orange-500 font-medium";
  return "text-gray-500";
};

export function CompetitiveTopicsTable({ data }: CompetitiveTopicsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Competitive Citation Analysis by Topic</CardTitle>
        <p className="text-sm text-muted-foreground">
          Your citation performance vs competitors across different topics
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                <TableHead className="text-right">Your Citations</TableHead>
                <TableHead className="text-right">Your Share</TableHead>
                <TableHead className="text-right">Total Market</TableHead>
                <TableHead>Position</TableHead>
                <TableHead className="text-center">Opportunity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No competitive topic data available yet
                  </TableCell>
                </TableRow>
              ) : (
                data.map((topic) => (
                  <TableRow key={topic.topic}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{topic.topic}</p>
                        {topic.category && (
                          <p className="text-xs text-muted-foreground">
                            {topic.category}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {topic.yourCitations}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress
                          value={topic.yourShare}
                          className="w-16 h-2"
                        />
                        <span className="font-medium text-sm">
                          {topic.yourShare.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {topic.totalCitations}
                    </TableCell>
                    <TableCell>{getDominanceBadge(topic.dominanceLevel)}</TableCell>
                    <TableCell className="text-center">
                      <span
                        className={getOpportunityColor(topic.opportunityScore)}
                      >
                        {topic.opportunityScore}
                      </span>
                    </TableCell>
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

