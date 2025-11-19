"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProjectTags } from "@/lib/actions/tags";
import { updatePrompt } from "@/lib/actions/prompt";
import { toast } from "sonner";

interface EditableTagBadgeProps {
  promptId: string;
  projectId: string;
  currentTag: string;
  onUpdate: () => void;
}

export function EditableTagBadge({
  promptId,
  projectId,
  currentTag,
  onUpdate,
}: EditableTagBadgeProps) {
  const [open, setOpen] = useState(false);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadTags();
      setInputValue(currentTag);
    }
  }, [open, currentTag]);

  const loadTags = async () => {
    const result = await getProjectTags(projectId);
    if (result.data) {
      console.log("Loaded tags from project:", result.data);
      setExistingTags(result.data);
    } else {
      console.error("Failed to load tags:", result.error);
    }
  };

  const handleSelectTag = async (newTag: string) => {
    if (newTag === currentTag) {
      setOpen(false);
      return;
    }

    setLoading(true);

    const result = await updatePrompt(promptId, {
      category: newTag.trim(),
    });

    if (result.error) {
      toast.error("Failed to update tag");
    } else {
      toast.success("Tag updated successfully");
      onUpdate();
    }

    setLoading(false);
    setOpen(false);
  };

  const filteredTags = existingTags.filter((tag) =>
    tag.toLowerCase().includes(inputValue.toLowerCase())
  );

  console.log("Existing tags:", existingTags);
  console.log("Input value:", inputValue);
  console.log("Filtered tags:", filteredTags);

  const showCreateOption =
    inputValue.trim() &&
    !existingTags.some(
      (tag) => tag.toLowerCase() === inputValue.trim().toLowerCase()
    );

  // Generate a consistent color based on the tag string
  const getTagColor = (tag: string) => {
    const colors = [
      "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
      "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
      "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
      "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
    ];

    // Simple hash function to get consistent color per tag
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Badge
          variant="secondary"
          className={cn(
            "cursor-pointer hover:opacity-80 transition-opacity",
            getTagColor(currentTag)
          )}
        >
          <Tag className="h-3 w-3 mr-1" />
          {currentTag || "No tag"}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or create tag..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            {filteredTags.length === 0 && !showCreateOption && (
              <CommandEmpty>No tags found</CommandEmpty>
            )}

            {showCreateOption && (
              <CommandGroup heading="Create new">
                <CommandItem
                  onSelect={() => handleSelectTag(inputValue.trim())}
                  className="cursor-pointer"
                  disabled={loading}
                >
                  <Tag className="mr-2 h-4 w-4" />
                  Create "{inputValue.trim()}"
                </CommandItem>
              </CommandGroup>
            )}

            {filteredTags.length > 0 && (
              <CommandGroup heading="Existing tags">
                {filteredTags.map((tag) => (
                  <CommandItem
                    key={tag}
                    value={tag}
                    onSelect={() => handleSelectTag(tag)}
                    className="cursor-pointer"
                    disabled={loading}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        currentTag === tag ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {tag}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

