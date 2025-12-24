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
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { countries, type Country } from "@/lib/countries";
import { getProjectRegionsForSelect } from "@/lib/queries/regions";

interface CountrySelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  projectId?: string; // Optional: if provided, use project-specific regions
}

export function CountrySelect({
  value,
  onValueChange,
  placeholder = "Select country...",
  disabled = false,
  projectId,
}: CountrySelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [projectRegions, setProjectRegions] = React.useState<Array<{ code: string; name: string; flag: string }> | null>(null);
  const [isLoadingRegions, setIsLoadingRegions] = React.useState(false);

  // Load project regions if projectId is provided
  React.useEffect(() => {
    if (projectId) {
      setIsLoadingRegions(true);
      getProjectRegionsForSelect(projectId)
        .then((regions) => {
          setProjectRegions(regions);
        })
        .catch((error) => {
          console.error("Error loading project regions:", error);
          setProjectRegions(null); // Fallback to static list
        })
        .finally(() => {
          setIsLoadingRegions(false);
        });
    } else {
      // If no projectId, explicitly use static countries list
      setProjectRegions(null);
    }
  }, [projectId]);

  // Use project regions if projectId is provided and regions are loaded, otherwise use full countries list
  const availableCountries = (projectId && projectRegions) ? projectRegions : countries;

  // Debug: Log when countries list changes
  React.useEffect(() => {
    console.log('[CountrySelect] State:', {
      projectId,
      projectRegionsCount: projectRegions?.length || 0,
      availableCountriesCount: availableCountries.length,
      value,
      open
    });
  }, [projectId, projectRegions, availableCountries.length, value, open]);

  const selectedCountry = availableCountries.find(
    (country) => country.code.toLowerCase() === value?.toLowerCase()
  );

  const filteredCountries = searchQuery
    ? availableCountries.filter(
        (country) =>
          country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          country.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableCountries;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedCountry ? (
            <span className="flex items-center gap-2">
              <span className="text-lg">{selectedCountry.flag}</span>
              <span>{selectedCountry.name}</span>
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0 z-[101]" 
        align="start" 
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search country..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {filteredCountries.length > 0 ? (
                filteredCountries.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={country.code.toLowerCase()}
                    onSelect={(currentValue) => {
                      console.log('[CountrySelect] Item selected:', currentValue, 'country:', country);
                      onValueChange?.(country.code.toUpperCase());
                      setOpen(false);
                      setSearchQuery("");
                    }}
                  >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.toLowerCase() === country.code.toLowerCase()
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <span className="mr-2 text-lg">{country.flag}</span>
                  <span>{country.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {country.code}
                  </span>
                </CommandItem>
                ))
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No countries available
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

