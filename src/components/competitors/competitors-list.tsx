"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ExternalLink, Trash2, Globe } from "lucide-react";
import type { Competitor } from "./competitors-manager";
import { getCountryByCode } from "@/lib/countries";

interface CompetitorsListProps {
  competitors: Competitor[];
  onToggleActive: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CompetitorsList({
  competitors,
  onToggleActive,
  onDelete,
}: CompetitorsListProps) {
  return (
    <div className="space-y-4">
      {competitors.map((competitor) => (
        <div
          key={competitor.id}
          className="flex items-center justify-between rounded-lg border p-4"
        >
          <div className="flex items-center gap-4 flex-1">
            {/* Favicon */}
            <div className="flex items-center justify-center w-12 h-12 rounded-lg border bg-muted">
              {competitor.favicon ? (
                <img
                  src={competitor.favicon}
                  alt={`${competitor.name} favicon`}
                  className="w-6 h-6"
                  onError={(e) => {
                    // Fallback to icon if favicon fails
                    e.currentTarget.style.display = "none";
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const icon = document.createElement("div");
                      icon.innerHTML = `<svg class="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>`;
                      parent.appendChild(icon.firstChild!);
                    }
                  }}
                />
              ) : (
                <Globe className="w-6 h-6 text-muted-foreground" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {competitor.color && (
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: competitor.color }}
                    aria-label="Competitor color"
                  />
                )}
                <h3 className="font-semibold truncate">{competitor.name}</h3>
                {!competitor.isActive && (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <a
                  href={`https://${competitor.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  {competitor.domain}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <span>•</span>
                <span className="flex items-center gap-1 text-sm">
                  <span>{getCountryByCode(competitor.region)?.flag || "🌍"}</span>
                  <span>{getCountryByCode(competitor.region)?.name || "Global"}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {competitor.isActive ? "Active" : "Inactive"}
              </span>
              <Switch
                checked={competitor.isActive}
                onCheckedChange={() => onToggleActive(competitor.id)}
              />
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Competitor</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {competitor.name}? This will remove all tracking data for this competitor. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(competitor.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}
    </div>
  );
}

