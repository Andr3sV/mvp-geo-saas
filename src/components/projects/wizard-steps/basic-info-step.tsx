"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountrySelect } from "@/components/ui/country-select";
import { Loader2 } from "lucide-react";

interface BasicInfoStepProps {
  projectName: string;
  clientUrl: string;
  selectedRegion: string;
  projectColor: string;
  onProjectNameChange: (value: string) => void;
  onClientUrlChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onColorChange: (value: string) => void;
  isLoading?: boolean;
  variant?: "wizard" | "onboarding";
  selectedWorkspaceId?: string;
  workspaces?: Array<{ id: string; name: string }>;
  onWorkspaceChange?: (value: string) => void;
}

export function BasicInfoStep({
  projectName,
  clientUrl,
  selectedRegion,
  projectColor,
  onProjectNameChange,
  onClientUrlChange,
  onRegionChange,
  onColorChange,
  isLoading = false,
  variant = "wizard",
  selectedWorkspaceId,
  workspaces,
  onWorkspaceChange,
}: BasicInfoStepProps) {
  if (variant === "wizard") {
    return (
      <div className="space-y-5">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/30 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground font-medium">
              Creating project and analyzing website...
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              This may take a minute. Please wait...
            </p>
          </div>
        )}
        
        {!isLoading && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name *</Label>
                <Input
                  id="project-name"
                  placeholder="e.g., Acme Corp, Nike Campaign"
                  value={projectName}
                  onChange={(e) => onProjectNameChange(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-url">Website URL *</Label>
                <Input
                  id="client-url"
                  type="url"
                  placeholder="https://example.com"
                  value={clientUrl}
                  onChange={(e) => onClientUrlChange(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              We'll analyze this website to generate prompt suggestions
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="region">Region *</Label>
                <CountrySelect
                  value={selectedRegion}
                  onValueChange={onRegionChange}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Select the primary region for tracking (default: US)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-color">Brand Color</Label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div
                      className="h-11 w-11 rounded-lg border-2 border-border shadow-sm"
                      style={{ backgroundColor: projectColor }}
                    />
                    <input
                      id="project-color"
                      type="color"
                      value={projectColor}
                      onChange={(e) => onColorChange(e.target.value)}
                      disabled={isLoading}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                      title="Click to pick a color"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={projectColor.toUpperCase()}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                          onColorChange(value);
                        }
                      }}
                      placeholder="#3B82F6"
                      disabled={isLoading}
                      className="font-mono text-sm"
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Onboarding variant - will be styled by parent component
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="project-name" className="text-base">Project Name</Label>
          <Input
            id="project-name"
            placeholder="e.g., Acme Inc, Nike Campaign"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            required
            disabled={isLoading}
            autoFocus
            className="h-12 text-base"
          />
          <p className="text-xs text-muted-foreground">
            You can create more projects later from your dashboard.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-url" className="text-base">
            Client Website URL
          </Label>
          <Input
            id="client-url"
            type="url"
            placeholder="https://example.com"
            value={clientUrl}
            onChange={(e) => onClientUrlChange(e.target.value)}
            required
            disabled={isLoading}
            className="h-12 text-base"
          />
          <p className="text-xs text-muted-foreground">
            We'll use this URL to generate better prompt suggestions for your project.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="region" className="text-base">Region *</Label>
          <CountrySelect
            value={selectedRegion}
            onValueChange={onRegionChange}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Select the primary region for tracking
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="project-color" className="text-base">
            Brand Color
          </Label>
          <div className="flex items-center gap-3">
            <input
              id="project-color"
              type="color"
              value={projectColor}
              onChange={(e) => onColorChange(e.target.value)}
              disabled={isLoading}
              className="h-12 w-24 cursor-pointer rounded border border-input bg-background disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Input
              type="text"
              value={projectColor}
              onChange={(e) => onColorChange(e.target.value)}
              placeholder="#3B82F6"
              disabled={isLoading}
              className="flex-1 h-12 text-base"
              pattern="^#[0-9A-Fa-f]{6}$"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Choose a color to represent this brand in charts and visualizations
          </p>
        </div>
      </div>
    </div>
  );
}

