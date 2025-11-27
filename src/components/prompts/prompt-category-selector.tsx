"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface PromptCategorySelectorProps {
  currentCategory: string | undefined;
  existingCategories: string[];
  onSelect: (category: string) => void;
  disabled?: boolean;
  variant?: "compact" | "default";
}

export function PromptCategorySelector({
  currentCategory,
  existingCategories,
  onSelect,
  disabled,
  variant = "compact"
}: PromptCategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Filter unique non-empty categories
  const categories = Array.from(new Set(existingCategories)).filter(Boolean).sort();

  const handleSelect = (category: string) => {
    onSelect(category);
    setOpen(false);
  };

  if (variant === "default") {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !currentCategory && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            {currentCategory ? (
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 opacity-50" />
                <span>{currentCategory}</span>
              </div>
            ) : (
              <>
                <Hash className="mr-2 h-4 w-4 opacity-50" />
                <span>Select tag...</span>
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search tag..." 
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-2">
                  <p className="text-xs text-muted-foreground mb-2">No tag found.</p>
                  {inputValue && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs h-7"
                      onClick={() => handleSelect(inputValue)}
                    >
                      <Plus className="mr-2 h-3 w-3" />
                      Create "{inputValue}"
                    </Button>
                  )}
                </div>
              </CommandEmpty>
              <CommandGroup heading="Existing Tags">
                {categories.map((category) => (
                  <CommandItem
                    key={category}
                    value={category}
                    onSelect={() => handleSelect(category)}
                    className="text-xs"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3 w-3",
                        currentCategory === category ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {category}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-5 px-1.5 text-[10px] font-normal flex items-center gap-1 hover:bg-muted/80",
            !currentCategory && "text-muted-foreground border border-dashed"
          )}
          disabled={disabled}
        >
           {currentCategory ? (
             <Badge 
               variant="secondary" 
               className="text-[10px] flex items-center gap-1 font-normal px-1.5 h-5 bg-muted text-muted-foreground hover:bg-muted/80 pointer-events-none"
             >
               <Hash className="w-3 h-3 mr-1 opacity-50" />
               {currentCategory}
             </Badge>
           ) : (
             <>
               <Hash className="w-3 h-3 mr-1 opacity-50" />
               <span>Add tag</span>
             </>
           )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search tag..." 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              <div className="p-2">
                <p className="text-xs text-muted-foreground mb-2">No tag found.</p>
                {inputValue && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs h-7"
                    onClick={() => handleSelect(inputValue)}
                  >
                    <Plus className="mr-2 h-3 w-3" />
                    Create "{inputValue}"
                  </Button>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup heading="Existing Tags">
              {categories.map((category) => (
                <CommandItem
                  key={category}
                  value={category}
                  onSelect={() => handleSelect(category)}
                  className="text-xs"
                >
                  <Check
                    className={cn(
                      "mr-2 h-3 w-3",
                      currentCategory === category ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {category}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

