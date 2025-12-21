"use client";

import { ExternalLink, Globe, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/ui/brand-logo";
import { cn } from "@/lib/utils";

interface Citation {
  id: string;
  web_search_query: string | null;
  url: string | null;
  uri?: string | null; // Optional - not all citation sources provide uri
  domain: string | null;
}

interface ResponseCitationsProps {
  citations: Citation[];
  className?: string;
}

export function ResponseCitations({ citations, className }: ResponseCitationsProps) {
  if (citations.length === 0) {
    return (
      <Card className={cn(className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            Citations
          </CardTitle>
          <CardDescription>Sources referenced in this response</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[100px] text-muted-foreground gap-2">
            <Globe className="h-8 w-8 opacity-50" />
            <p className="text-sm">No citations found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group citations by domain
  const citationsByDomain = new Map<string, Citation[]>();
  citations.forEach((c) => {
    const domain = c.domain || "unknown";
    if (!citationsByDomain.has(domain)) {
      citationsByDomain.set(domain, []);
    }
    citationsByDomain.get(domain)!.push(c);
  });

  // Get unique search queries
  const uniqueQueries = new Set<string>();
  citations.forEach((c) => {
    if (c.web_search_query) {
      uniqueQueries.add(c.web_search_query);
    }
  });

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              Citations
            </CardTitle>
            <CardDescription>Sources referenced in this response</CardDescription>
          </div>
          <Badge variant="secondary">{citations.length} sources</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Queries */}
        {uniqueQueries.size > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              <span className="font-medium">Search Queries</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from(uniqueQueries).map((query, index) => (
                <Badge key={index} variant="outline" className="text-xs font-normal">
                  {query.length > 50 ? query.substring(0, 50) + "..." : query}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Citations by domain */}
        <div className="space-y-2">
          {Array.from(citationsByDomain.entries()).map(([domain, domainCitations]) => (
            <div
              key={domain}
              className="rounded-lg border p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <BrandLogo domain={domain} name={domain} size={24} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{domain}</span>
                    <Badge variant="secondary" className="text-xs">
                      {domainCitations.length} {domainCitations.length === 1 ? "citation" : "citations"}
                    </Badge>
                  </div>
                  <div className="mt-1 space-y-1">
                    {domainCitations.slice(0, 3).map((citation) => (
                      <div key={citation.id} className="flex items-center gap-2">
                        {citation.url ? (
                          <a
                            href={citation.uri || citation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {citation.url.length > 60
                              ? citation.url.substring(0, 60) + "..."
                              : citation.url}
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">No URL available</span>
                        )}
                      </div>
                    ))}
                    {domainCitations.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{domainCitations.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

