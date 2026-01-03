"use client";

import * as React from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
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

  // If there's only one country, auto-select it
  React.useEffect(() => {
    if (availableCountries.length === 1 && value !== availableCountries[0].code) {
      onValueChange?.(availableCountries[0].code);
    }
  }, [availableCountries, value, onValueChange]);

  // Determine if we should show "All countries" option (only if more than 1 country)
  const showAllCountriesOption = availableCountries.length > 1;
  
  // Show search only if more than 10 countries
  const showSearch = availableCountries.length > 10;

  const selectedCountry = value === "GLOBAL" 
    ? null 
    : availableCountries.find(
        (country) => country.code.toLowerCase() === value?.toLowerCase()
      );

  const filteredCountries = searchQuery
    ? availableCountries.filter(
        (country) =>
          country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          country.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableCountries;

  // Display text for the button
  const getDisplayText = () => {
    if (value === "GLOBAL" && showAllCountriesOption) {
      return "All countries";
    }
    if (selectedCountry) {
      return selectedCountry.name;
    }
    if (availableCountries.length === 1) {
      return availableCountries[0].name;
    }
    return placeholder;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between gap-2"
          disabled={disabled || availableCountries.length === 1}
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{getDisplayText()}</span>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0 z-[101]" 
        align="start" 
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          {showSearch && (
            <CommandInput
              placeholder="Search country..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
          )}
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {showAllCountriesOption && (
                <CommandItem
                  value="global"
                  onSelect={() => {
                    onValueChange?.("GLOBAL");
                    setOpen(false);
                    setSearchQuery("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === "GLOBAL" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span>All countries</span>
                </CommandItem>
              )}
              {filteredCountries.length > 0 ? (
                filteredCountries.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={country.code.toLowerCase()}
                    onSelect={(currentValue) => {
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
                    <span>{country.name}</span>
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
