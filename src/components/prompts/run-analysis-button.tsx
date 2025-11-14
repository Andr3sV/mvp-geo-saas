"use client";

import { useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startAnalysis, type AIProvider } from "@/lib/actions/analysis";
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

            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> Running analysis on {selectedPlatforms.length}{" "}
                platform{selectedPlatforms.length !== 1 ? "s" : ""} will consume API
                credits. Estimated cost: $
                {(selectedPlatforms.length * 0.01).toFixed(3)} - $
                {(selectedPlatforms.length * 0.02).toFixed(3)}
              </p>
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

