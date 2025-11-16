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
  domainRating: number;
  type: string;
  totalCitations: number;
  aiAnswers: number;
}

interface MostCitedDomainsTableProps {
  data: DomainData[];
}

const getTypeBadge = (type: string) => {
  switch (type) {
    case "your_brand":
      return <Badge variant="default">Your Brand</Badge>;
    case "competitor":
      return <Badge variant="destructive">Competitor</Badge>;
    case "third_party":
      return <Badge variant="secondary">Third Party</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
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
          Top domains by citation frequency across all AI platforms
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead className="text-center">DR</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">AI Answers</TableHead>
                <TableHead className="text-right">Total Citations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No citation data available yet
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
                      <span className={getDRColor(domain.domainRating)}>
                        {domain.domainRating}
                      </span>
                    </TableCell>
                    <TableCell>{getTypeBadge(domain.type)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {domain.aiAnswers}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {domain.totalCitations}
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

