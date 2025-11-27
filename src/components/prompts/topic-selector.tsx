"use client";

import { useState } from "react";
import { Check, Plus, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface Topic {
  id: string;
  name: string;
  color?: string;
}

interface TopicSelectorProps {
  currentTopicId: string | undefined;
  existingTopics: Topic[];
  onSelect: (topicId: string | null) => void;
  disabled?: boolean;
}

export function TopicSelector({
  currentTopicId,
  existingTopics,
  onSelect,
  disabled
}: TopicSelectorProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const currentTopic = existingTopics.find(t => t.id === currentTopicId);

  const handleSelect = (topicId: string | null) => {
    onSelect(topicId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !currentTopicId && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          {currentTopic ? (
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full ring-2 ring-background shadow-sm" 
                style={{ backgroundColor: currentTopic.color || "#64748b" }}
              />
              <span>{currentTopic.name}</span>
            </div>
          ) : (
            <>
              <Tag className="mr-2 h-4 w-4 opacity-50" />
              <span>Select topic...</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search topic..." 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              <div className="p-2">
                <p className="text-xs text-muted-foreground mb-2">No topic found.</p>
                {inputValue && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs h-7"
                    onClick={() => {
                      // For now, we'll just show a message that topics should be created in the Topics page
                      // In the future, we could add inline topic creation here
                      setOpen(false);
                    }}
                  >
                    <Plus className="mr-2 h-3 w-3" />
                    Create in Topics page
                  </Button>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup heading="Existing Topics">
              <CommandItem
                value="none"
                onSelect={() => handleSelect(null)}
                className="text-xs"
              >
                <Check
                  className={cn(
                    "mr-2 h-3 w-3",
                    !currentTopicId ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="text-muted-foreground">No topic</span>
              </CommandItem>
              {existingTopics.map((topic) => (
                <CommandItem
                  key={topic.id}
                  value={topic.name}
                  onSelect={() => handleSelect(topic.id)}
                  className="text-xs"
                >
                  <Check
                    className={cn(
                      "mr-2 h-3 w-3",
                      currentTopicId === topic.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: topic.color || "#64748b" }}
                    />
                    <span>{topic.name}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

