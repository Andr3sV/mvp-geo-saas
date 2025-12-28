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
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
interface DomainData {
  domain: string;
  type: string;
  citations: number; // Total citations from this domain
  platforms?: string[]; // AI platforms that cited this domain
  changePercent?: number; // Trend
}

interface MostCitedDomainsTableProps {
  data: DomainData[];
  infoTooltip?: string;
}


export function MostCitedDomainsTable({ data, infoTooltip }: MostCitedDomainsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Most Cited Domains in AI Answers
          {infoTooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                {infoTooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Top websites used as sources in AI model responses
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] px-5">#</TableHead>
                <TableHead className="px-5">Domain</TableHead>
                <TableHead className="text-center px-5">Platforms</TableHead>
                <TableHead className="text-right px-5">Citations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 px-6 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <p>No citation domains available yet</p>
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

