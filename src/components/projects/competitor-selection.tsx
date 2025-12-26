"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Edit2 } from "lucide-react";
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
  // Maintain editable copy of suggested competitors
  const [editableSuggestedCompetitors, setEditableSuggestedCompetitors] = useState<Array<Competitor>>(suggestedCompetitors);
  const [editingCompetitor, setEditingCompetitor] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDomain, setEditDomain] = useState("");
  const [newCompetitorName, setNewCompetitorName] = useState("");
  const [newCompetitorDomain, setNewCompetitorDomain] = useState("");

  // Sync editable competitors when suggestedCompetitors prop changes
  useEffect(() => {
    setEditableSuggestedCompetitors(suggestedCompetitors);
  }, [suggestedCompetitors]);

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

  const handleEditCompetitor = (index: number) => {
    const competitor = editableSuggestedCompetitors[index];
    setEditName(competitor.name);
    setEditDomain(competitor.domain);
    setEditingCompetitor(index);
  };

  const handleSaveEdit = () => {
    if (editingCompetitor === null || !editName.trim() || !editDomain.trim()) {
      return;
    }

    const updatedCompetitors = [...editableSuggestedCompetitors];
    const oldCompetitor = updatedCompetitors[editingCompetitor];
    const newCompetitor: Competitor = {
      name: editName.trim(),
      domain: editDomain.trim(),
    };
    updatedCompetitors[editingCompetitor] = newCompetitor;
    setEditableSuggestedCompetitors(updatedCompetitors);

    // If this competitor was selected, update the selected list
    const wasSelected = selectedCompetitors.some(
      (c) => c.name === oldCompetitor.name && c.domain === oldCompetitor.domain
    );
    if (wasSelected) {
      const updatedSelected = selectedCompetitors.filter(
        (c) => !(c.name === oldCompetitor.name && c.domain === oldCompetitor.domain)
      );
      onSelectedChange([...updatedSelected, newCompetitor]);
    }

    setEditingCompetitor(null);
    setEditName("");
    setEditDomain("");
  };

  const handleCancelEdit = () => {
    setEditingCompetitor(null);
    setEditName("");
    setEditDomain("");
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
      {editableSuggestedCompetitors.length > 0 && (
        <div className="space-y-3">
          <Label>Suggested Competitors</Label>
          <div className="text-xs text-muted-foreground mb-2">
            You can edit the name and domain before selecting competitors
          </div>
          <div className="space-y-2">
            {editableSuggestedCompetitors.map((competitor, index) => {
              const isSelected = selectedCompetitors.some(
                (c) => c.name === competitor.name && c.domain === competitor.domain
              );
              const isEditing = editingCompetitor === index;
              
              return (
                <div
                  key={index}
                  className={cn(
                    "flex items-start gap-3 rounded-md border p-3",
                    isSelected && "bg-muted/50"
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggleSuggested(competitor)}
                    disabled={isLoading || isEditing}
                    className="mt-1"
                  />
                  {isEditing ? (
                    <div className="flex-1 space-y-3">
                      <div className="space-y-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Competitor name"
                          disabled={isLoading}
                        />
                        <Input
                          value={editDomain}
                          onChange={(e) => setEditDomain(e.target.value)}
                          placeholder="Domain (e.g., competitor.com)"
                          disabled={isLoading}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={isLoading || !editName.trim() || !editDomain.trim()}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={isLoading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="font-medium">{competitor.name}</div>
                        <div className="text-sm text-muted-foreground">{competitor.domain}</div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCompetitor(index)}
                        disabled={isLoading}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
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

