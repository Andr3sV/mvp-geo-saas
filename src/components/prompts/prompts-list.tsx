"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Edit2, Trash2, ChevronRight, Tag } from "lucide-react";
import { deletePrompt, togglePromptActive, updatePrompt } from "@/lib/actions/prompt";
import { EditPromptDialog } from "./edit-prompt-dialog";
import { PromptCategorySelector } from "./prompt-category-selector";
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
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // Get all unique categories for the selector
  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    prompts.forEach(p => {
      if (p.category) categories.add(p.category);
    });
    return Array.from(categories);
  }, [prompts]);

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

  const handleCategoryUpdate = async (promptId: string, newCategory: string) => {
    setLoading(promptId);
    await updatePrompt(promptId, { category: newCategory });
    onUpdate();
    setLoading(null);
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
                    <div className="flex items-start gap-4 p-4 hover:bg-muted/20 transition-colors group/item">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start gap-2">
                          <p className="flex-1 text-sm font-medium leading-relaxed">{prompt.prompt}</p>
                          <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <PromptCategorySelector
                              currentCategory={prompt.category === "general" ? undefined : prompt.category}
                              existingCategories={allCategories}
                              onSelect={(category) => handleCategoryUpdate(prompt.id, category)}
                              disabled={loading === prompt.id}
                            />
                            <Badge variant="outline" className="text-[10px] flex items-center gap-1 font-normal bg-background/50 px-1.5 h-5">
                              <span>{getCountryByCode(prompt.region)?.flag || "🌍"}</span>
                              <span className="hidden sm:inline">{getCountryByCode(prompt.region)?.name || "Global"}</span>
                            </Badge>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Added {new Date(prompt.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2 h-4">
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
