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
import { createPrompt } from "@/lib/actions/prompt";
import { CountrySelect } from "@/components/ui/country-select";
import { getProjectTags } from "@/lib/actions/tags";
import { getProjectTopics } from "@/lib/actions/topics";
import { TopicSelector } from "./topic-selector";
import { PromptCategorySelector } from "./prompt-category-selector";

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
  const [topicId, setTopicId] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [region, setRegion] = useState("GLOBAL");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [existingTopics, setExistingTopics] = useState<Array<{ id: string; name: string; color?: string }>>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Load existing tags and topics when dialog opens
  useEffect(() => {
    if (open && projectId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  const loadData = async () => {
    setLoadingData(true);
    
    // Load tags
    const tagsResult = await getProjectTags(projectId);
    if (tagsResult.data) {
      setExistingTags(tagsResult.data);
    }
    
    // Load topics
    const topicsResult = await getProjectTopics(projectId);
    if (topicsResult.data) {
      setExistingTopics(topicsResult.data.map((t: any) => ({
        id: t.id,
        name: t.name,
        color: t.color
      })));
    }
    
    setLoadingData(false);
  };

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
      category: category || undefined,
      topic_id: topicId || undefined,
      region,
      is_active: true,
    });

    if (result.error) {
      setError(result.error);
      setCreating(false);
    } else {
      setPrompt("");
      setTopicId(undefined);
      setCategory(undefined);
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
              <Label htmlFor="topic">Topic</Label>
              <TopicSelector
                currentTopicId={topicId}
                existingTopics={existingTopics}
                onSelect={setTopicId}
                disabled={creating || loadingData}
              />
              <p className="text-xs text-muted-foreground">
                Select a topic to group this prompt
              </p>
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

          <div className="space-y-2">
            <Label htmlFor="tag">Tag</Label>
            <PromptCategorySelector
              currentCategory={category}
              existingCategories={existingTags}
              onSelect={setCategory}
              disabled={creating || loadingData}
              variant="default"
            />
            <p className="text-xs text-muted-foreground">
              Optional tag for additional categorization
            </p>
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

