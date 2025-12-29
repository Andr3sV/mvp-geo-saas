"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Trash2, Plus } from "lucide-react";

interface ReviewEditStepProps {
  categories: Array<{
    name: string;
    prompts: Array<{ text: string; order: number; id?: string }>;
  }>;
  onCategoriesChange: (categories: {
    categories: Array<{
      name: string;
      prompts: Array<{ text: string; order: number; id?: string }>;
    }>;
  }) => void;
  isLoading?: boolean;
  variant?: "wizard" | "onboarding";
}

export function ReviewEditStep({
  categories,
  onCategoriesChange,
  isLoading = false,
  variant = "wizard",
}: ReviewEditStepProps) {
  const [editingPrompt, setEditingPrompt] = useState<{ category: string; index: number } | null>(null);
  const [editText, setEditText] = useState("");

  const handleEditPrompt = (categoryName: string, index: number) => {
    const category = categories.find((c) => c.name === categoryName);
    if (category) {
      setEditText(category.prompts[index].text);
      setEditingPrompt({ category: categoryName, index });
    }
  };

  const handleSaveEdit = () => {
    if (!editingPrompt) return;

    const updated = { categories: [...categories] };
    const categoryIndex = updated.categories.findIndex(
      (c) => c.name === editingPrompt.category
    );
    if (categoryIndex >= 0) {
      updated.categories[categoryIndex].prompts[editingPrompt.index].text = editText;
      onCategoriesChange(updated);
      setEditingPrompt(null);
      setEditText("");
    }
  };

  const handleDeletePrompt = (categoryName: string, index: number) => {
    const updated = { categories: [...categories] };
    const categoryIndex = updated.categories.findIndex((c) => c.name === categoryName);
    if (categoryIndex >= 0) {
      updated.categories[categoryIndex].prompts.splice(index, 1);
      onCategoriesChange(updated);
    }
  };

  const handleAddPrompt = (categoryName: string) => {
    const updated = { categories: [...categories] };
    const categoryIndex = updated.categories.findIndex((c) => c.name === categoryName);
    if (categoryIndex >= 0) {
      const newPrompt = {
        text: "",
        order: updated.categories[categoryIndex].prompts.length + 1,
        id: `${categoryName}-new-${Date.now()}`,
      };
      updated.categories[categoryIndex].prompts.push(newPrompt);
      onCategoriesChange(updated);
      // Start editing immediately
      setEditText("");
      setEditingPrompt({
        category: categoryName,
        index: updated.categories[categoryIndex].prompts.length - 1,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Review and customize the prompts that will be tracked. You can edit, delete, or add new prompts.
      </div>
      {categories.map((category) => (
        <div key={category.name} className="rounded-md border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{category.name}</h3>
            <span className="text-xs text-muted-foreground">
              {category.prompts.length} prompt{category.prompts.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-2">
            {category.prompts.map((prompt, index) => (
              <div
                key={prompt.id || index}
                className="flex items-start gap-2 p-2 rounded border bg-muted/30"
              >
                {editingPrompt?.category === category.name &&
                editingPrompt?.index === index ? (
                  <div className="flex-1 space-y-2">
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      placeholder="Enter prompt text..."
                      disabled={isLoading}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={isLoading || !editText.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingPrompt(null);
                          setEditText("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="flex-1 text-sm">{prompt.text}</p>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditPrompt(category.name, index)}
                        disabled={isLoading}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeletePrompt(category.name, index)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddPrompt(category.name)}
              disabled={isLoading}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Prompt
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

