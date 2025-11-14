"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updatePrompt, type PromptCategory } from "@/lib/actions/prompt";

const CATEGORIES: { value: PromptCategory; label: string }[] = [
  { value: "general", label: "General" },
  { value: "product", label: "Product" },
  { value: "pricing", label: "Pricing" },
  { value: "features", label: "Features" },
  { value: "competitors", label: "Competitors" },
  { value: "use_cases", label: "Use Cases" },
  { value: "technical", label: "Technical" },
];

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
  const [category, setCategory] = useState<PromptCategory>(initialPrompt.category || "general");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={(value) => setCategory(value as PromptCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

