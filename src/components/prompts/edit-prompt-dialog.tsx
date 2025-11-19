"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updatePrompt } from "@/lib/actions/prompt";
import { CountrySelect } from "@/components/ui/country-select";
import { TagInput } from "@/components/ui/tag-input";
import { getProjectTags } from "@/lib/actions/tags";

interface EditPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: any;
  onSuccess: () => void;
}

export function EditPromptDialog({
  open,
  onOpenChange,
  prompt: initialPrompt,
  onSuccess,
}: EditPromptDialogProps) {
  const [prompt, setPrompt] = useState(initialPrompt.prompt);
  const [category, setCategory] = useState(initialPrompt.category || "general");
  const [region, setRegion] = useState(initialPrompt.region || "GLOBAL");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  // Load existing tags when dialog opens
  useEffect(() => {
    if (open && initialPrompt.project_id) {
      loadTags();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialPrompt.project_id]);

  const loadTags = async () => {
    setLoadingTags(true);
    const result = await getProjectTags(initialPrompt.project_id);
    if (result.data) {
      setExistingTags(result.data);
    }
    setLoadingTags(false);
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      setError("Prompt is required");
      return;
    }

    setUpdating(true);
    setError(null);

    const result = await updatePrompt(initialPrompt.id, {
      prompt: prompt.trim(),
      category,
      region,
    });

    if (result.error) {
      setError(result.error);
      setUpdating(false);
    } else {
      onOpenChange(false);
      onSuccess();
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Prompt</DialogTitle>
          <DialogDescription>
            Update your prompt to better track your brand mentions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt *</Label>
            <Textarea
              id="prompt"
              placeholder="e.g., What is the best GEO platform for enterprise companies?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={updating}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Topic / Tag</Label>
              <TagInput
                value={category}
                onValueChange={setCategory}
                suggestions={existingTags}
                placeholder={loadingTags ? "Loading tags..." : "Type or select a tag..."}
                disabled={updating || loadingTags}
              />
              <p className="text-xs text-muted-foreground">
                Create custom topics or reuse existing ones
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Country/Region</Label>
              <CountrySelect
                value={region}
                onValueChange={setRegion}
                placeholder="Select country..."
                disabled={updating}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={updating}>
            {updating ? "Updating..." : "Update Prompt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

