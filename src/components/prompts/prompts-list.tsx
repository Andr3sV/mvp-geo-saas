"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Edit2, Trash2 } from "lucide-react";
import { deletePrompt, togglePromptActive, type PromptCategory } from "@/lib/actions/prompt";
import { EditPromptDialog } from "./edit-prompt-dialog";
import { RunAnalysisButton } from "./run-analysis-button";
import { getCountryByCode } from "@/lib/countries";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CATEGORY_LABELS: Record<PromptCategory, string> = {
  product: "Product",
  pricing: "Pricing",
  features: "Features",
  competitors: "Competitors",
  use_cases: "Use Cases",
  technical: "Technical",
  general: "General",
};

const CATEGORY_COLORS: Record<PromptCategory, string> = {
  product: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  pricing: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  features: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  competitors: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  use_cases: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  technical: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
  general: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
};


interface PromptsListProps {
  prompts: any[];
  projectId: string;
  onUpdate: () => void;
}

export function PromptsList({ prompts, projectId, onUpdate }: PromptsListProps) {
  const [editingPrompt, setEditingPrompt] = useState<any>(null);
  const [deletingPromptId, setDeletingPromptId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleToggle = async (promptId: string, isActive: boolean) => {
    setLoading(promptId);
    await togglePromptActive(promptId, isActive);
    onUpdate();
    setLoading(null);
  };

  const handleDelete = async () => {
    if (!deletingPromptId) return;
    
    setLoading(deletingPromptId);
    await deletePrompt(deletingPromptId);
    setDeletingPromptId(null);
    onUpdate();
    setLoading(null);
  };

  return (
    <>
      <div className="space-y-3">
        {prompts.map((prompt) => (
          <div
            key={prompt.id}
            className="flex items-start gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 space-y-2">
              <div className="flex items-start gap-2">
                <p className="flex-1 font-medium">{prompt.prompt}</p>
                <div className="flex gap-2">
                  <Badge 
                    variant="secondary" 
                    className={CATEGORY_COLORS[prompt.category as PromptCategory] || CATEGORY_COLORS.general}
                  >
                    {CATEGORY_LABELS[prompt.category as PromptCategory] || "General"}
                  </Badge>
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <span>{getCountryByCode(prompt.region)?.flag || "🌍"}</span>
                    <span>{getCountryByCode(prompt.region)?.name || "Global"}</span>
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Created {new Date(prompt.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <RunAnalysisButton
                promptId={prompt.id}
                promptText={prompt.prompt}
                projectId={projectId}
                variant="outline"
                size="sm"
              />

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {prompt.is_active ? "Active" : "Inactive"}
                </span>
                <Switch
                  checked={prompt.is_active}
                  onCheckedChange={(checked) => handleToggle(prompt.id, checked)}
                  disabled={loading === prompt.id}
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditingPrompt(prompt)}
                disabled={loading === prompt.id}
              >
                <Edit2 className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeletingPromptId(prompt.id)}
                disabled={loading === prompt.id}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {editingPrompt && (
        <EditPromptDialog
          open={!!editingPrompt}
          onOpenChange={(open) => !open && setEditingPrompt(null)}
          prompt={editingPrompt}
          onSuccess={() => {
            setEditingPrompt(null);
            onUpdate();
          }}
        />
      )}

      <AlertDialog open={!!deletingPromptId} onOpenChange={(open) => !open && setDeletingPromptId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prompt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this prompt? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

