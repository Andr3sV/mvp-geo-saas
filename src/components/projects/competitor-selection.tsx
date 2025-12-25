"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Competitor {
  name: string;
  domain: string;
}

interface CompetitorSelectionProps {
  suggestedCompetitors: Array<Competitor>;
  selectedCompetitors: Array<Competitor>;
  newCompetitors: Array<Competitor>;
  onSelectedChange: (competitors: Array<Competitor>) => void;
  onNewCompetitorsChange: (competitors: Array<Competitor>) => void;
  isLoading?: boolean;
}

export function CompetitorSelection({
  suggestedCompetitors,
  selectedCompetitors,
  newCompetitors,
  onSelectedChange,
  onNewCompetitorsChange,
  isLoading,
}: CompetitorSelectionProps) {
  const [newCompetitorName, setNewCompetitorName] = useState("");
  const [newCompetitorDomain, setNewCompetitorDomain] = useState("");

  const handleToggleSuggested = (competitor: Competitor) => {
    const isSelected = selectedCompetitors.some(
      (c) => c.name === competitor.name && c.domain === competitor.domain
    );

    if (isSelected) {
      onSelectedChange(
        selectedCompetitors.filter(
          (c) => !(c.name === competitor.name && c.domain === competitor.domain)
        )
      );
    } else {
      onSelectedChange([...selectedCompetitors, competitor]);
    }
  };

  const handleAddNewCompetitor = () => {
    if (!newCompetitorName.trim() || !newCompetitorDomain.trim()) {
      return;
    }

    const competitor: Competitor = {
      name: newCompetitorName.trim(),
      domain: newCompetitorDomain.trim(),
    };

    // Check if already exists
    const exists =
      selectedCompetitors.some(
        (c) => c.name === competitor.name && c.domain === competitor.domain
      ) ||
      newCompetitors.some(
        (c) => c.name === competitor.name && c.domain === competitor.domain
      );

    if (exists) {
      return;
    }

    onNewCompetitorsChange([...newCompetitors, competitor]);
    setNewCompetitorName("");
    setNewCompetitorDomain("");
  };

  const handleRemoveNewCompetitor = (index: number) => {
    onNewCompetitorsChange(newCompetitors.filter((_, i) => i !== index));
  };

  const allSelectedCompetitors = [...selectedCompetitors, ...newCompetitors];

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Select the competitors you want to track, or add new ones. These will be used for competitive analysis.
      </div>

      {/* Suggested Competitors */}
      {suggestedCompetitors.length > 0 && (
        <div className="space-y-3">
          <Label>Suggested Competitors</Label>
          <div className="space-y-2">
            {suggestedCompetitors.map((competitor, index) => {
              const isSelected = selectedCompetitors.some(
                (c) => c.name === competitor.name && c.domain === competitor.domain
              );
              return (
                <div
                  key={index}
                  className={cn(
                    "flex items-center space-x-3 rounded-md border p-3",
                    isSelected && "bg-muted"
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggleSuggested(competitor)}
                    disabled={isLoading}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{competitor.name}</div>
                    <div className="text-sm text-muted-foreground">{competitor.domain}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add New Competitor Form */}
      <div className="space-y-3">
        <Label>Add New Competitor</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Competitor name"
            value={newCompetitorName}
            onChange={(e) => setNewCompetitorName(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Input
            placeholder="Domain (e.g., competitor.com)"
            value={newCompetitorDomain}
            onChange={(e) => setNewCompetitorDomain(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={handleAddNewCompetitor}
            disabled={isLoading || !newCompetitorName.trim() || !newCompetitorDomain.trim()}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      {/* New Competitors List */}
      {newCompetitors.length > 0 && (
        <div className="space-y-3">
          <Label>New Competitors to Add</Label>
          <div className="space-y-2">
            {newCompetitors.map((competitor, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-md border p-3 bg-muted"
              >
                <div>
                  <div className="font-medium">{competitor.name}</div>
                  <div className="text-sm text-muted-foreground">{competitor.domain}</div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveNewCompetitor(index)}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {allSelectedCompetitors.length > 0 && (
        <div className="rounded-md border p-3 bg-muted/50">
          <div className="text-sm font-medium">
            {allSelectedCompetitors.length} competitor{allSelectedCompetitors.length !== 1 ? "s" : ""} selected
          </div>
        </div>
      )}
    </div>
  );
}

