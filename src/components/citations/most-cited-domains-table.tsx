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

interface DomainData {
  domain: string;
  dr: number; // Domain Rating
  type: string;
  citations: number; // Total citations from this domain
  platforms?: string[]; // AI platforms that cited this domain
  sentiment?: string; // Dominant sentiment
  changePercent?: number; // Trend
}

interface MostCitedDomainsTableProps {
  data: DomainData[];
}

const getSentimentBadge = (sentiment?: string) => {
  switch (sentiment) {
    case "positive":
      return <Badge className="bg-green-500">Positive</Badge>;
    case "negative":
      return <Badge variant="destructive">Negative</Badge>;
    case "neutral":
    default:
      return <Badge variant="secondary">Neutral</Badge>;
  }
};

const getDRColor = (rating: number) => {
  if (rating >= 80) return "text-green-600 font-semibold";
  if (rating >= 60) return "text-blue-600 font-medium";
  if (rating >= 40) return "text-orange-500";
  return "text-gray-500";
};

export function MostCitedDomainsTable({ data }: MostCitedDomainsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Most Cited Domains in AI Answers</CardTitle>
        <p className="text-sm text-muted-foreground">
          Top websites used as sources when AI models cite your brand
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead className="text-center">Est. DR</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead className="text-center">Platforms</TableHead>
                <TableHead className="text-right">Citations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <p>No citation domains available yet</p>
                      <p className="text-xs">
                        Run analysis with Perplexity or Gemini to see source domains
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((domain, index) => (
                  <TableRow key={domain.domain}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {domain.domain}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={getDRColor(domain.dr)}>
                        {domain.dr}
                      </span>
                    </TableCell>
                    <TableCell>{getSentimentBadge(domain.sentiment)}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs text-muted-foreground">
                        {domain.platforms?.length || 0} platform{domain.platforms?.length !== 1 ? "s" : ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {domain.citations}
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

