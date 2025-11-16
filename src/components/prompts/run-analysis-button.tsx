"use client";

import { useState, useEffect } from "react";
import { Play, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startAnalysis, type AIProvider } from "@/lib/actions/analysis";
import { getProjectCompetitors } from "@/lib/actions/competitors";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface RunAnalysisButtonProps {
  promptId: string;
  promptText: string;
  projectId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function RunAnalysisButton({
  promptId,
  promptText,
  projectId,
  variant = "default",
  size = "sm",
}: RunAnalysisButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<AIProvider[]>([
    "openai",
    "gemini",
    "claude",
  ]);
  const [activeCompetitorsCount, setActiveCompetitorsCount] = useState(0);
  const [isLoadingCompetitors, setIsLoadingCompetitors] = useState(false);

  useEffect(() => {
    if (isOpen && projectId) {
      loadActiveCompetitors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, projectId]);

  const loadActiveCompetitors = async () => {
    setIsLoadingCompetitors(true);
    try {
      const result = await getProjectCompetitors(projectId);
      if (result.data) {
        const activeCount = result.data.filter((c: any) => c.is_active).length;
        setActiveCompetitorsCount(activeCount);
      }
    } catch (error) {
      console.error("Failed to load competitors:", error);
    } finally {
      setIsLoadingCompetitors(false);
    }
  };

  const platforms = [
    { id: "openai", label: "OpenAI (GPT-4)" },
    { id: "gemini", label: "Google Gemini" },
    { id: "claude", label: "Anthropic Claude" },
  ];

  const handlePlatformToggle = (platform: AIProvider) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleRunAnalysis = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform");
      return;
    }

    setIsRunning(true);

    try {
      const result = await startAnalysis({
        prompt_tracking_id: promptId,
        project_id: projectId,
        prompt_text: promptText,
        platforms: selectedPlatforms,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Analysis started successfully! Processing ${selectedPlatforms.length} platforms.`
        );
        setIsOpen(false);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to start analysis");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        disabled={isRunning}
      >
        {isRunning ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Run Analysis
          </>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run AI Analysis</DialogTitle>
            <DialogDescription>
              Select which AI platforms to run this prompt on. Each platform will analyze
              the prompt independently.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Prompt</Label>
              <p className="text-sm text-muted-foreground rounded-md border p-3 bg-muted/50">
                {promptText}
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">AI Platforms</Label>
              {platforms.map((platform) => (
                <div key={platform.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={platform.id}
                    checked={selectedPlatforms.includes(platform.id as AIProvider)}
                    onCheckedChange={() =>
                      handlePlatformToggle(platform.id as AIProvider)
                    }
                  />
                  <label
                    htmlFor={platform.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {platform.label}
                  </label>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> Running analysis on {selectedPlatforms.length}{" "}
                  platform{selectedPlatforms.length !== 1 ? "s" : ""} will consume API
                  credits. Estimated cost: $
                  {(selectedPlatforms.length * 0.01).toFixed(3)} - $
                  {(selectedPlatforms.length * 0.02).toFixed(3)}
                </p>
              </div>

              {isLoadingCompetitors ? (
                <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-3">
                  <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Loading competitors...</span>
                  </div>
                </div>
              ) : activeCompetitorsCount > 0 ? (
                <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-3">
                  <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                    <Users className="h-3 w-3" />
                    <span>
                      <strong>Competitive Analysis Enabled:</strong> Tracking{" "}
                      {activeCompetitorsCount} active competitor
                      {activeCompetitorsCount !== 1 ? "s" : ""} alongside your brand
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 p-3">
                  <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                    <Users className="h-3 w-3" />
                    <span>
                      <strong>Tip:</strong> Add competitors in Competitor Management to
                      enable competitive analysis
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isRunning}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRunAnalysis}
              disabled={isRunning || selectedPlatforms.length === 0}
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Analysis
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

