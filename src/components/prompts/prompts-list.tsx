"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Edit2, Trash2, ChevronRight } from "lucide-react";
import { deletePrompt, togglePromptActive } from "@/lib/actions/prompt";
import { EditPromptDialog } from "./edit-prompt-dialog";
import { RunAnalysisButton } from "./run-analysis-button";
import { PromptCitationsSummary } from "./prompt-citations-summary";
import { getCountryByCode } from "@/lib/countries";
import { cn } from "@/lib/utils";
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
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // Group prompts by topic
  const groupedPrompts = useMemo(() => {
    const groups: Record<string, { id: string; name: string; color?: string; prompts: any[] }> = {};
    
    prompts.forEach(prompt => {
      // Use topic ID as key, or fallback to category name or 'general'
      const topicId = prompt.topics?.id || prompt.category || 'general';
      const topicName = prompt.topics?.name || prompt.category || 'General';
      const topicColor = prompt.topics?.color;

      if (!groups[topicId]) {
        groups[topicId] = {
          id: topicId,
          name: topicName,
          color: topicColor,
          prompts: []
        };
      }
      groups[topicId].prompts.push(prompt);
    });

    return Object.values(groups).sort((a, b) => {
      if (a.name === 'General') return 1; // General last
      if (b.name === 'General') return -1;
      return a.name.localeCompare(b.name);
    });
  }, [prompts]);

  // Initialize expanded topics (expand all by default)
  useState(() => {
    if (prompts.length > 0) {
      const allGroupKeys = new Set(
        prompts.map(p => p.topics?.id || p.category || 'general')
      );
      setExpandedTopics(allGroupKeys);
    }
  });

  const toggleTopic = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

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

  const toggleExpandedPrompt = (promptId: string) => {
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
      <div className="space-y-4">
        {groupedPrompts.map((group) => (
          <div key={group.id} className="border rounded-xl overflow-hidden bg-card shadow-sm">
            {/* Topic Header */}
            <div 
              className={cn(
                "flex items-center justify-between p-4 cursor-pointer transition-colors select-none",
                expandedTopics.has(group.id) ? "bg-muted/30" : "hover:bg-muted/50"
              )}
              onClick={() => toggleTopic(group.id)}
            >
              <div className="flex items-center gap-3">
                <div 
                  className={cn(
                    "p-1 rounded-md transition-transform duration-200",
                    expandedTopics.has(group.id) ? "rotate-90" : ""
                  )}
                >
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full ring-2 ring-background shadow-sm" 
                      style={{ backgroundColor: group.color || "#64748b" }}
                    />
                    <span className="font-semibold text-sm">{group.name}</span>
                  </div>
                  <Badge variant="secondary" className="rounded-full px-2 min-w-[1.5rem] text-center h-5 text-[10px]">
                    {group.prompts.length}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Prompts List */}
            {expandedTopics.has(group.id) && (
              <div className="border-t divide-y">
                {group.prompts.map((prompt) => (
                  <div key={prompt.id} className="bg-card">
                    <div className="flex items-start gap-4 p-4 hover:bg-muted/20 transition-colors group/item"
                         onClick={() => toggleExpandedPrompt(prompt.id)}
                         role="button"
                         tabIndex={0}
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start gap-2">
                          <p className="flex-1 text-sm font-medium leading-relaxed">{prompt.prompt}</p>
                          <Badge variant="outline" className="text-xs flex items-center gap-1 shrink-0 font-normal bg-background/50">
                            <span>{getCountryByCode(prompt.region)?.flag || "🌍"}</span>
                            <span>{getCountryByCode(prompt.region)?.name || "Global"}</span>
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Added {new Date(prompt.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <RunAnalysisButton
                          promptId={prompt.id}
                          promptText={prompt.prompt}
                          projectId={projectId}
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                        />

                        <div className="flex items-center gap-2 border-l pl-2 ml-1 h-4">
                          <Switch
                            checked={prompt.is_active}
                            onCheckedChange={(checked) => handleToggle(prompt.id, checked)}
                            disabled={loading === prompt.id}
                            className="scale-75"
                          />
                        </div>

                        <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover/item:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPrompt(prompt);
                            }}
                            disabled={loading === prompt.id}
                          >
                            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingPromptId(prompt.id);
                            }}
                            disabled={loading === prompt.id}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Citations Summary - Rendered inside the item container */}
                    <div className={cn(
                      "overflow-hidden transition-all duration-300 ease-in-out",
                      expandedPrompts.has(prompt.id) ? "max-h-[500px] border-t bg-muted/10" : "max-h-0"
                    )}>
                      <div className="p-4">
                        <PromptCitationsSummary 
                          promptId={prompt.id}
                          isVisible={expandedPrompts.has(prompt.id)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
