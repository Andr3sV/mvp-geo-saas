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
import { createPrompt, type PromptCategory } from "@/lib/actions/prompt";
import { CountrySelect } from "@/components/ui/country-select";

const CATEGORIES: { value: PromptCategory; label: string }[] = [
  { value: "general", label: "General" },
  { value: "product", label: "Product" },
  { value: "pricing", label: "Pricing" },
  { value: "features", label: "Features" },
  { value: "competitors", label: "Competitors" },
  { value: "use_cases", label: "Use Cases" },
  { value: "technical", label: "Technical" },
];

interface CreatePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

export function CreatePromptDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: CreatePromptDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState<PromptCategory>("general");
  const [region, setRegion] = useState("GLOBAL");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      setError("Prompt is required");
      return;
    }

    setCreating(true);
    setError(null);

    const result = await createPrompt({
      project_id: projectId,
      prompt: prompt.trim(),
      category,
      region,
      is_active: true,
    });

    if (result.error) {
      setError(result.error);
      setCreating(false);
    } else {
      setPrompt("");
      setCategory("general");
      setRegion("GLOBAL");
      onOpenChange(false);
      onSuccess();
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Prompt</DialogTitle>
          <DialogDescription>
            Add a new prompt that will be sent to AI platforms to track your brand mentions.
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
              disabled={creating}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Write a question that naturally leads to your brand being mentioned.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="region">Country/Region</Label>
              <CountrySelect
                value={region}
                onValueChange={setRegion}
                placeholder="Select country..."
                disabled={creating}
              />
              <p className="text-xs text-muted-foreground">
                Target region for AI analysis
              </p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={creating}>
            {creating ? "Creating..." : "Create Prompt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

