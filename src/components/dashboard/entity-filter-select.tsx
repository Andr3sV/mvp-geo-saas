"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { BrandLogo } from "@/components/ui/brand-logo";
import { getProjectCompetitors, type Competitor } from "@/lib/actions/competitors";
import { getProjectDetails } from "@/lib/actions/project";

export type EntityType = "brand" | "competitor";
export type EntityFilter = { id: string | null; type: EntityType };
export type EntityFilterValue = "all" | EntityFilter[];

interface EntityFilterSelectProps {
  projectId: string;
  value: EntityFilterValue;
  onValueChange: (value: EntityFilterValue) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function EntityFilterSelect({
  projectId,
  value,
  onValueChange,
  placeholder = "Select entities...",
  disabled = false,
}: EntityFilterSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [competitors, setCompetitors] = React.useState<Competitor[]>([]);
  const [projectName, setProjectName] = React.useState<string>("");
  const [brandDomain, setBrandDomain] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(false);

  // Load project details and competitors
  React.useEffect(() => {
    if (!projectId) return;

    setIsLoading(true);
    Promise.all([
      getProjectDetails(projectId),
      getProjectCompetitors(projectId),
    ])
      .then(([projectResult, competitorsResult]) => {
        if (projectResult.data) {
          setProjectName(projectResult.data.name || "Your Brand");
          setBrandDomain(projectResult.data.client_url || "");
        }
        if (competitorsResult.data) {
          // Filter to only active competitors and sort alphabetically
          const activeCompetitors = competitorsResult.data
            .filter((c) => c.is_active)
            .sort((a, b) => a.name.localeCompare(b.name));
          setCompetitors(activeCompetitors);
        }
      })
      .catch((error) => {
        console.error("Error loading entity filter data:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [projectId]);

  const isAllSelected = value === "all";
  const selectedEntities = isAllSelected ? [] : value;

  // Check if an entity is selected
  const isEntitySelected = (entity: EntityFilter): boolean => {
    if (isAllSelected) return false;
    return selectedEntities.some(
      (e) => e.id === entity.id && e.type === entity.type
    );
  };

  // Check if all individual entities are selected
  const areAllIndividualSelected =
    !isAllSelected &&
    selectedEntities.length === competitors.length + 1; // +1 for brand

  // Handle "All brands" selection
  const handleSelectAllBrands = () => {
    onValueChange("all");
    setOpen(false);
  };

  // Handle "Select All" (individual entities)
  const handleSelectAllIndividual = () => {
    const allEntities: EntityFilter[] = [
      { id: null, type: "brand" },
      ...competitors.map((c) => ({ id: c.id, type: "competitor" as EntityType })),
    ];
    onValueChange(allEntities);
  };

  // Handle individual entity toggle
  const handleToggleEntity = (entity: EntityFilter) => {
    if (isAllSelected) {
      // Switch from "all" to individual selection
      onValueChange([entity]);
    } else {
      const isSelected = isEntitySelected(entity);
      if (isSelected) {
        // Remove entity
        const newEntities = selectedEntities.filter(
          (e) => !(e.id === entity.id && e.type === entity.type)
        );
        // If no entities left, default to brand only
        onValueChange(newEntities.length === 0 ? [{ id: null, type: "brand" }] : newEntities);
      } else {
        // Add entity
        onValueChange([...selectedEntities, entity]);
      }
    }
  };

  // Get display text for button
  const getDisplayText = (): string => {
    if (isAllSelected) {
      return "All brands";
    }
    if (selectedEntities.length === 0) {
      return placeholder;
    }
    const brandSelected = selectedEntities.some((e) => e.type === "brand");
    const competitorCount = selectedEntities.filter((e) => e.type === "competitor").length;

    if (brandSelected && competitorCount === 0) {
      return "Brand";
    }
    if (!brandSelected && competitorCount === 1) {
      const competitor = competitors.find((c) => c.id === selectedEntities[0].id);
      return competitor?.name || "Competitor";
    }
    return `Brand${competitorCount > 0 ? ` + ${competitorCount} competitor${competitorCount > 1 ? "s" : ""}` : ""}`;
  };

  // Filter entities by search query
  const filteredCompetitors = searchQuery
    ? competitors.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : competitors;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <span className="text-muted-foreground">Loading...</span>
          ) : (
            getDisplayText()
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search entities..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No entity found.</CommandEmpty>
            
            {/* All brands option */}
            <CommandGroup>
              <CommandItem
                onSelect={handleSelectAllBrands}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    isAllSelected ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="font-medium">All brands</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {/* Select All option */}
            <CommandGroup>
              <CommandItem
                onSelect={(e) => {
                  e.preventDefault();
                  handleSelectAllIndividual();
                }}
                className="cursor-pointer"
              >
                <Checkbox
                  checked={areAllIndividualSelected && !isAllSelected}
                  className="mr-2"
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleSelectAllIndividual();
                    }
                  }}
                />
                <span>Select All</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {/* Brand option */}
            <CommandGroup>
              <CommandItem
                onSelect={(e) => {
                  e.preventDefault();
                  handleToggleEntity({ id: null, type: "brand" });
                }}
                className="cursor-pointer"
              >
                <Checkbox
                  checked={isEntitySelected({ id: null, type: "brand" })}
                  className="mr-2"
                  onCheckedChange={() => handleToggleEntity({ id: null, type: "brand" })}
                />
                <BrandLogo
                  domain={brandDomain}
                  name={projectName}
                  size={20}
                  className="mr-2"
                />
                <span>{projectName || "Your Brand"}</span>
              </CommandItem>
            </CommandGroup>

            {/* Competitors */}
            {filteredCompetitors.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  {filteredCompetitors.map((competitor) => (
                    <CommandItem
                      key={competitor.id}
                      onSelect={(e) => {
                        e.preventDefault();
                        handleToggleEntity({ id: competitor.id, type: "competitor" });
                      }}
                      className="cursor-pointer"
                    >
                      <Checkbox
                        checked={isEntitySelected({ id: competitor.id, type: "competitor" })}
                        className="mr-2"
                        onCheckedChange={() =>
                          handleToggleEntity({ id: competitor.id, type: "competitor" })
                        }
                      />
                      <BrandLogo
                        domain={competitor.domain}
                        name={competitor.name}
                        size={20}
                        className="mr-2"
                      />
                      <span>{competitor.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

