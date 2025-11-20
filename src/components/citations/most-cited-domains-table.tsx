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
interface DomainData {
  domain: string;
  dr: number; // Domain Rating
  type: string;
  citations: number; // Total citations from this domain
  platforms?: string[]; // AI platforms that cited this domain
  sentiment?: string; // Dominant sentiment (kept for backward compatibility, not displayed)
  changePercent?: number; // Trend
}

interface MostCitedDomainsTableProps {
  data: DomainData[];
}

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
                <TableHead className="w-[50px] px-5">#</TableHead>
                <TableHead className="px-5">Domain</TableHead>
                <TableHead className="text-center px-5">Est. DR</TableHead>
                <TableHead className="text-center px-5">Platforms</TableHead>
                <TableHead className="text-right px-5">Citations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 px-6 text-muted-foreground">
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
                    <TableCell className="font-medium px-6">{index + 1}</TableCell>
                    <TableCell className="font-mono text-sm px-6">
                      {domain.domain}
                    </TableCell>
                    <TableCell className="text-center px-6">
                      <span className={getDRColor(domain.dr)}>
                        {domain.dr}
                      </span>
                    </TableCell>
                    <TableCell className="text-center px-6">
                      <span className="text-xs text-muted-foreground">
                        {domain.platforms?.length || 0} platform{domain.platforms?.length !== 1 ? "s" : ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold px-6">
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

