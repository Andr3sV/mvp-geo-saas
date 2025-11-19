"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TagInputProps {
  value: string;
  onValueChange: (value: string) => void;
  suggestions?: string[];
  placeholder?: string;
  disabled?: boolean;
}

export function TagInput({
  value,
  onValueChange,
  suggestions = [],
  placeholder = "Type a tag...",
  disabled = false,
}: TagInputProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleSelect = (selectedTag: string) => {
    onValueChange(selectedTag);
    setInputValue(selectedTag);
    setOpen(false);
  };

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    onValueChange(newValue);
  };

  const filteredSuggestions = suggestions.filter((tag) =>
    tag.toLowerCase().includes(inputValue.toLowerCase())
  );

  const showCreateOption = inputValue.trim() && !suggestions.some(
    (tag) => tag.toLowerCase() === inputValue.trim().toLowerCase()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-muted-foreground"
          )}
        >
          {value || placeholder}
          {value && (
            <X
              className="ml-2 h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onValueChange("");
                setInputValue("");
              }}
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder={placeholder}
            value={inputValue}
            onValueChange={handleInputChange}
          />
          <CommandList>
            {filteredSuggestions.length === 0 && !showCreateOption && (
              <CommandEmpty>No tags found</CommandEmpty>
            )}
            
            {showCreateOption && (
              <CommandGroup heading="Create new">
                <CommandItem
                  onSelect={() => handleSelect(inputValue.trim())}
                  className="cursor-pointer"
                >
                  <Badge variant="secondary" className="mr-2">
                    New
                  </Badge>
                  Create "{inputValue.trim()}"
                </CommandItem>
              </CommandGroup>
            )}

            {filteredSuggestions.length > 0 && (
              <CommandGroup heading="Existing tags">
                {filteredSuggestions.map((tag) => (
                  <CommandItem
                    key={tag}
                    value={tag}
                    onSelect={() => handleSelect(tag)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === tag ? "opacity-100" : "opacity-0"
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

