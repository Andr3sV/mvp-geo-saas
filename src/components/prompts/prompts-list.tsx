"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Edit2, Trash2 } from "lucide-react";
import { deletePrompt, togglePromptActive } from "@/lib/actions/prompt";
import { EditPromptDialog } from "./edit-prompt-dialog";
import { RunAnalysisButton } from "./run-analysis-button";
import { EditableTagBadge } from "./editable-tag-badge";
import { PromptCitationsSummary } from "./prompt-citations-summary";
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


interface PromptsListProps {
  prompts: any[];
  projectId: string;
  onUpdate: () => void;
}

export function PromptsList({ prompts, projectId, onUpdate }: PromptsListProps) {
  const [editingPrompt, setEditingPrompt] = useState<any>(null);
  const [deletingPromptId, setDeletingPromptId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());

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

  const toggleExpanded = (promptId: string) => {
    const newExpanded = new Set(expandedPrompts);
    if (newExpanded.has(promptId)) {
      newExpanded.delete(promptId);
    } else {
      newExpanded.add(promptId);
    }
    setExpandedPrompts(newExpanded);
  };

  return (
    <>
      <div className="space-y-3">
        {prompts.map((prompt) => (
          <div key={prompt.id} className="rounded-lg border">
            <div className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors"
                 onClick={() => toggleExpanded(prompt.id)}
                 role="button"
                 tabIndex={0}
            >
            <div className="flex-1 space-y-2">
              <div className="flex items-start gap-2">
                <p className="flex-1 font-medium">{prompt.prompt}</p>
                <div className="flex gap-2">
                  <EditableTagBadge
                    promptId={prompt.id}
                    projectId={projectId}
                    currentTag={prompt.category || "general"}
                    onUpdate={onUpdate}
                  />
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
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingPrompt(prompt);
                }}
                disabled={loading === prompt.id}
              >
                <Edit2 className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingPromptId(prompt.id);
                }}
                disabled={loading === prompt.id}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            
            {/* Citations Summary */}
            <PromptCitationsSummary 
              promptId={prompt.id}
              isVisible={expandedPrompts.has(prompt.id)}
            />
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

