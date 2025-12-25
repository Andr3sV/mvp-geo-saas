"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountrySelect } from "@/components/ui/country-select";
import { createProject, getSuggestedPrompts, getSuggestedCompetitors, triggerBrandWebsiteAnalysis } from "@/lib/actions/workspace";
import { getRegionIdByCode, createRegion } from "@/lib/actions/regions";
import { batchCreatePrompts } from "@/lib/actions/prompt";
import { batchCreateCompetitors } from "@/lib/actions/competitors";
import { useRouter } from "next/navigation";
import { Loader2, Check, X, Plus, Trash2, Edit2, FileText, Hash, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { CompetitorSelection } from "./competitor-selection";
import { motion, AnimatePresence } from "framer-motion";

interface Workspace {
  id: string;
  name: string;
}

interface CreateProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces: Workspace[];
  defaultWorkspaceId?: string;
  onProjectCreated?: (projectId: string) => void;
}

const STEPS = [
  { id: 1, name: "Basic Info", description: "Project details and website", icon: FileText },
  { id: 2, name: "Prompt Quantity", description: "Choose number of prompts", icon: Hash },
  { id: 3, name: "Select Competitors", description: "Select or add competitors", icon: Users },
  { id: 4, name: "Review & Edit", description: "Review and customize prompts", icon: Sparkles },
];

export function CreateProjectWizard({
  open,
  onOpenChange,
  workspaces,
  defaultWorkspaceId,
  onProjectCreated,
}: CreateProjectWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basic info
  const [projectName, setProjectName] = useState("");
  const [clientUrl, setClientUrl] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(defaultWorkspaceId || "");
  const [selectedRegion, setSelectedRegion] = useState("US");
  const [projectColor, setProjectColor] = useState("#3B82F6");
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [regionId, setRegionId] = useState<string | null>(null);

  // Step 2: Prompt selection
  const [totalPrompts, setTotalPrompts] = useState(10);
  const [promptDistribution, setPromptDistribution] = useState<Record<string, number>>({});

  // Step 3: Competitor selection
  const [suggestedCompetitors, setSuggestedCompetitors] = useState<Array<{ name: string; domain: string }> | null>(null);
  const [selectedCompetitors, setSelectedCompetitors] = useState<Array<{ name: string; domain: string }>>([]);
  const [newCompetitors, setNewCompetitors] = useState<Array<{ name: string; domain: string }>>([]);

  // Step 4: Review/Edit
  const [suggestedPrompts, setSuggestedPrompts] = useState<{
    categories: Array<{
      name: string;
      prompts: Array<{ text: string; order: number }>;
    }>;
    generated_at?: string;
  } | null>(null);
  const [editablePrompts, setEditablePrompts] = useState<{
    categories: Array<{
      name: string;
      prompts: Array<{ text: string; order: number; id?: string }>;
    }>;
  }>({ categories: [] });

  // Reset wizard when dialog opens/closes
  useEffect(() => {
    if (!open) {
      // Reset all state when closing
      setCurrentStep(1);
      setProjectName("");
      setClientUrl("");
      setSelectedWorkspaceId(defaultWorkspaceId || "");
      setSelectedRegion("US");
      setProjectColor("#3B82F6");
      setCreatedProjectId(null);
      setRegionId(null);
      setTotalPrompts(10);
      setPromptDistribution({});
      setSuggestedCompetitors(null);
      setSelectedCompetitors([]);
      setNewCompetitors([]);
      setSuggestedPrompts(null);
      setEditablePrompts({ categories: [] });
      setError(null);
    } else {
      setSelectedWorkspaceId(defaultWorkspaceId || workspaces[0]?.id || "");
    }
  }, [open, defaultWorkspaceId, workspaces]);

  // Step 1: Handle project creation (without analysis)
  const handleStep1Next = async () => {
    if (!projectName.trim()) {
      setError("Project name is required");
      return;
    }

    if (!clientUrl.trim()) {
      setError("Website URL is required");
      return;
    }

    if (!selectedWorkspaceId) {
      setError("Please select a workspace");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create project without triggering analysis
      const result = await createProject({
        name: projectName.trim(),
        workspace_id: selectedWorkspaceId,
        client_url: clientUrl.trim(),
        color: projectColor,
        skipAnalysis: true, // Skip analysis - will trigger in step 2
      });

      if (result.error || !result.data) {
        setError(result.error || "Failed to create project");
        setIsLoading(false);
        return;
      }

      const newProjectId = result.data.id;
      console.log('[CreateProjectWizard] ✅ Project created successfully:', newProjectId);
      
      setCreatedProjectId(newProjectId);
      
      // Get or create region_id for this project
      let finalRegionId: string | null = null;
      
      if (selectedRegion && selectedRegion !== "GLOBAL") {
        // Try to get existing region
        finalRegionId = await getRegionIdByCode(newProjectId, selectedRegion);
        
        // If region doesn't exist, create it automatically
        if (!finalRegionId) {
          console.log('[CreateProjectWizard] Region not found, creating new region:', selectedRegion);
          const regionResult = await createRegion({
            project_id: newProjectId,
            code: selectedRegion,
          });
          
          if (regionResult.error || !regionResult.data) {
            setError(regionResult.error || "Failed to create region");
            setIsLoading(false);
            return;
          }
          
          finalRegionId = regionResult.data.id;
          console.log('[CreateProjectWizard] ✅ Region created successfully:', finalRegionId);
        }
      }
      
      setRegionId(finalRegionId);
      console.log('[CreateProjectWizard] Region ID:', finalRegionId);

      // Move to step 2 immediately (no waiting for prompts)
      setIsLoading(false);
      setCurrentStep(2);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setIsLoading(false);
    }
  };


  // Poll for suggested competitors (used in Step 3)
  useEffect(() => {
    if (currentStep === 3 && createdProjectId && suggestedCompetitors === null && !isLoading) {
      const maxAttempts = 60; // 5 minutes max (5 second intervals)
      let attempts = 0;
      let pollInterval: NodeJS.Timeout | null = null;

      const poll = async () => {
        attempts++;
        
        try {
          console.log(`[CreateProjectWizard] Polling attempt ${attempts}/${maxAttempts} for competitors, project ${createdProjectId}`);
          const result = await getSuggestedCompetitors(createdProjectId);
          console.log('[CreateProjectWizard] Competitor poll result:', { 
            hasData: !!result.data, 
            competitorsCount: result.data?.competitors?.length || 0 
          });
          
          // result.data is the suggested_competitors JSONB object with structure: { competitors: [...], generated_at: "..." }
          if (result.data && result.data.competitors && Array.isArray(result.data.competitors)) {
            console.log('[CreateProjectWizard] Got suggested competitors!', {
              competitorsCount: result.data.competitors.length,
            });
            setSuggestedCompetitors(result.data.competitors.length > 0 ? result.data.competitors : []);
            if (pollInterval) {
              clearInterval(pollInterval);
            }
            return;
          }
        } catch (err) {
          console.error("Error polling for suggested competitors:", err);
        }

        if (attempts < maxAttempts) {
          pollInterval = setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          console.log('[CreateProjectWizard] Timeout waiting for suggested competitors after', attempts, 'attempts - setting to empty array');
          // Set to empty array so UI shows (user can add manually)
          setSuggestedCompetitors([]);
          if (pollInterval) {
            clearInterval(pollInterval);
          }
        }
      };

      poll();

      // Cleanup function
      return () => {
        if (pollInterval) {
          clearInterval(pollInterval);
        }
      };
    }
  }, [currentStep, createdProjectId, suggestedCompetitors, isLoading]);

  // Poll for suggested prompts (used in Step 4)
  useEffect(() => {
    if (currentStep === 4 && createdProjectId && !suggestedPrompts && !isLoading) {
      const maxAttempts = 60; // 5 minutes max (5 second intervals)
      let attempts = 0;
      let pollInterval: NodeJS.Timeout | null = null;

      const poll = async () => {
        attempts++;
        
        try {
          console.log(`[CreateProjectWizard] Polling attempt ${attempts}/${maxAttempts} for project ${createdProjectId}`);
          const result = await getSuggestedPrompts(createdProjectId);
          console.log('[CreateProjectWizard] Poll result:', { 
            hasData: !!result.data, 
            categoriesCount: result.data?.categories?.length || 0 
          });
          
          if (result.data && result.data.categories && result.data.categories.length > 0) {
            console.log('[CreateProjectWizard] Got suggested prompts!', {
              categoriesCount: result.data.categories.length,
              totalPrompts: result.data.categories.reduce((sum: number, cat: any) => sum + (cat.prompts?.length || 0), 0)
            });
            setSuggestedPrompts(result.data);
            applyPromptDistribution(result.data, totalPrompts);
            if (pollInterval) {
              clearInterval(pollInterval);
            }
            return;
          }
        } catch (err) {
          console.error("Error polling for suggested prompts:", err);
        }

        if (attempts < maxAttempts) {
          pollInterval = setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          console.error('[CreateProjectWizard] Timeout waiting for suggested prompts after', attempts, 'attempts');
          setError("Timeout waiting for prompt suggestions. The analysis may still be in progress. Please close this dialog and check back later.");
          if (pollInterval) {
            clearInterval(pollInterval);
          }
        }
      };

      poll();

      // Cleanup function
      return () => {
        if (pollInterval) {
          clearInterval(pollInterval);
        }
      };
    }
  }, [currentStep, createdProjectId, suggestedPrompts, isLoading, totalPrompts]);

  // Apply prompt distribution across categories
  const applyPromptDistribution = (
    prompts: {
      categories: Array<{
        name: string;
        prompts: Array<{ text: string; order: number }>;
      }>;
    },
    total: number
  ) => {
    const categories = prompts.categories;
    if (categories.length === 0) return;

    const promptsPerCategory = Math.floor(total / categories.length);
    const remainder = total % categories.length;

    const distribution: Record<string, number> = {};
    const editable: {
      categories: Array<{
        name: string;
        prompts: Array<{ text: string; order: number; id?: string }>;
      }>;
    } = { categories: [] };

    categories.forEach((category, index) => {
      // Distribute remainder to first categories
      const count = promptsPerCategory + (index < remainder ? 1 : 0);
      distribution[category.name] = Math.min(count, category.prompts.length);

      // Create editable structure with selected prompts
      editable.categories.push({
        name: category.name,
        prompts: category.prompts
          .slice(0, distribution[category.name])
          .map((p, i) => ({ ...p, id: `${category.name}-${i}` })),
      });
    });

    setPromptDistribution(distribution);
    setEditablePrompts(editable);
  };

  // Step 2: Handle prompt selection and trigger analysis
  const handleStep2Next = async () => {
    if (!createdProjectId || !clientUrl.trim()) {
      setError("Missing project or website URL");
      return;
    }

    if (totalPrompts < 10 || totalPrompts > 200) {
      setError("Please select a number between 10 and 200");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Trigger analyze-brand-website using Server Action
      const result = await triggerBrandWebsiteAnalysis({
        project_id: createdProjectId,
        client_url: clientUrl.trim(),
        force_refresh: false,
        prompts_quantity: totalPrompts, // Pass the user-selected number of prompts
      });
      
      if (result.error || !result.success) {
        setError(result.error || "Failed to start website analysis. Please try again.");
        setIsLoading(false);
        return;
      }

      // Move to step 3 (competitors) and start polling
      setIsLoading(false);
      setCurrentStep(3);
      // Polling will start via useEffect when step 3 is reached
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setIsLoading(false);
    }
  };

  // Step 3: Handle competitor selection and save
  const handleStep3Next = async () => {
    if (!createdProjectId || !regionId) {
      setError("Missing project or region information");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Combine selected and new competitors
      const allCompetitors = [...selectedCompetitors, ...newCompetitors];

      // Save competitors if any are selected
      if (allCompetitors.length > 0) {
        const result = await batchCreateCompetitors({
          project_id: createdProjectId,
          region_id: regionId,
          competitors: allCompetitors,
        });

        if (result.error) {
          setError(result.error);
          setIsLoading(false);
          return;
        }
      }

      // Move to step 4 (Review & Edit)
      setIsLoading(false);
      setCurrentStep(4);
      // Polling for prompts will start via useEffect when step 4 is reached
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setIsLoading(false);
    }
  };

  // Step 4: Handle final confirmation
  const handleStep4Confirm = async () => {
    if (!createdProjectId || !regionId) {
      setError("Missing project or region information");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Flatten prompts from all categories, preserving category information
      const allPrompts = editablePrompts.categories.flatMap((cat) =>
        cat.prompts.map((p) => ({ 
          prompt: p.text,
          categoryName: cat.name, // Incluir el nombre de la categoría
        }))
      );

      if (allPrompts.length === 0) {
        setError("Please select at least one prompt");
        setIsLoading(false);
        return;
      }

      // Batch create prompts
      const result = await batchCreatePrompts({
        project_id: createdProjectId,
        region_id: regionId,
        prompts: allPrompts,
      });

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      // Success - close wizard, refresh, and redirect to project dashboard
      if (onProjectCreated) {
        onProjectCreated(createdProjectId);
      }
      onOpenChange(false);
      router.refresh();
      router.push(`/dashboard?project=${createdProjectId}`);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Debug log
  useEffect(() => {
    console.log('[CreateProjectWizard] State changed', { 
      open, 
      currentStep, 
      createdProjectId, 
      hasSuggestedPrompts: !!suggestedPrompts,
      isLoading 
    });
  }, [open, currentStep, createdProjectId, suggestedPrompts, isLoading]);

  // Prevent dialog from closing while in wizard flow (unless explicitly cancelled)
  const handleDialogOpenChange = (newOpen: boolean) => {
    console.log('[CreateProjectWizard] handleDialogOpenChange called', { newOpen, currentStep, isLoading, createdProjectId });
    
    if (!newOpen) {
      // User trying to close - allow it only if not loading and on step 1, or if cancelled explicitly
      if (currentStep === 1 && !isLoading) {
        onOpenChange(false);
      } else if (isLoading) {
        // Don't allow closing while loading
        console.log('[CreateProjectWizard] Blocked close while loading');
        return;
      } else {
        // For steps 2-3, user must use Cancel button
        console.log('[CreateProjectWizard] Use Cancel button to close');
        return;
      }
    } else {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto z-[100] sm:!max-w-[700px] p-8">
        <DialogHeader className="pb-8 border-b">
          <DialogTitle className="text-2xl font-semibold">Create New Project</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1.5">
            Set up your project to track AEO performance and brand mentions
          </DialogDescription>
        </DialogHeader>

        {/* Modern Step Progress Bar */}
        <div className="relative mt-6 mb-6">
          {/* Progress line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted" />
          <motion.div
            className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
            initial={{ width: "0%" }}
            animate={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
          />
          
          {/* Steps */}
          <div className="relative flex justify-between">
            {STEPS.map((step, index) => {
              const isCompleted = step.id < currentStep;
              const isCurrent = step.id === currentStep;
              
              return (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  <motion.div
                    className={cn(
                      "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                      isCompleted
                        ? "bg-primary border-primary text-primary-foreground"
                        : isCurrent
                        ? "bg-primary/10 border-primary text-primary shadow-lg scale-110"
                        : "bg-background border-muted-foreground/30 text-muted-foreground"
                    )}
                    initial={false}
                    animate={{
                      scale: isCurrent ? 1.1 : 1,
                    }}
                    transition={{
                      duration: 0.2,
                    }}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-semibold">{step.id}</span>
                    )}
                  </motion.div>
                  <div className="mt-3 text-center max-w-[120px]">
                    <p
                      className={cn(
                        "text-xs font-medium transition-colors",
                        isCurrent || isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {step.name}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
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
                    onChange={(e) => setProjectName(e.target.value)}
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
                    onChange={(e) => setClientUrl(e.target.value)}
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
                    onValueChange={setSelectedRegion}
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
                        onChange={(e) => setProjectColor(e.target.value)}
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
                            setProjectColor(value);
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
          )}

          {/* Step 2: Prompt Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-sm text-muted-foreground">
                Select how many prompts you want to track. They will be distributed evenly across categories after we analyze your website.
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="total-prompts" className="text-base font-medium">Total Prompts to Track</Label>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">{totalPrompts}</span>
                    <span className="text-sm text-muted-foreground font-medium">prompts</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="relative py-2">
                    <input
                      id="total-prompts"
                      type="range"
                      min={10}
                      max={200}
                      step={5}
                      value={totalPrompts}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 10;
                        setTotalPrompts(Math.max(10, Math.min(200, value)));
                      }}
                      disabled={isLoading}
                      className="w-full slider-custom cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground font-medium px-1">
                    <span>10</span>
                    <span>200</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Select Competitors */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {suggestedCompetitors === null ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground font-medium">
                    Analyzing website and generating competitor suggestions...
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    This may take a minute. You can also add competitors manually below.
                  </p>
                  {createdProjectId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Project ID: {createdProjectId}
                    </p>
                  )}
                </div>
              ) : (
                <CompetitorSelection
                  suggestedCompetitors={suggestedCompetitors || []}
                  selectedCompetitors={selectedCompetitors}
                  newCompetitors={newCompetitors}
                  onSelectedChange={setSelectedCompetitors}
                  onNewCompetitorsChange={setNewCompetitors}
                  isLoading={isLoading}
                />
              )}
            </div>
          )}

          {/* Step 4: Review/Edit Prompts */}
          {currentStep === 4 && (
            <div className="space-y-4">
              {!suggestedPrompts ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground font-medium">
                    Analyzing website and generating prompt suggestions...
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    This may take a minute. Please wait...
                  </p>
                  {createdProjectId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Project ID: {createdProjectId}
                    </p>
                  )}
                </div>
              ) : (
                <PromptCategoryEditor
                  categories={editablePrompts.categories}
                  onCategoriesChange={setEditablePrompts}
                  isLoading={isLoading}
                />
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          {currentStep === 1 && (
            <Button onClick={handleStep1Next} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Next"
              )}
            </Button>
          )}
          {currentStep === 2 && (
            <Button
              onClick={handleStep2Next}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting analysis...
                </>
              ) : (
                "Select competitors"
              )}
            </Button>
          )}
          {currentStep === 3 && (
            <Button
              onClick={handleStep3Next}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving competitors...
                </>
              ) : (
                "Next"
              )}
            </Button>
          )}
          {currentStep === 4 && (
            <Button onClick={handleStep4Confirm} disabled={isLoading || !suggestedPrompts || editablePrompts.categories.length === 0}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Finalizar creación del proyecto"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Prompt Category Editor Component (will be extracted to separate file later)
function PromptCategoryEditor({
  categories,
  onCategoriesChange,
  isLoading,
}: {
  categories: Array<{
    name: string;
    prompts: Array<{ text: string; order: number; id?: string }>;
  }>;
  onCategoriesChange: (categories: {
    categories: Array<{
      name: string;
      prompts: Array<{ text: string; order: number; id?: string }>;
    }>;
  }) => void;
  isLoading: boolean;
}) {
  const [editingPrompt, setEditingPrompt] = useState<{ category: string; index: number } | null>(null);
  const [editText, setEditText] = useState("");

  const handleEditPrompt = (categoryName: string, index: number) => {
    const category = categories.find((c) => c.name === categoryName);
    if (category) {
      setEditText(category.prompts[index].text);
      setEditingPrompt({ category: categoryName, index });
    }
  };

  const handleSaveEdit = () => {
    if (!editingPrompt) return;

    const updated = { categories: [...categories] };
    const categoryIndex = updated.categories.findIndex(
      (c) => c.name === editingPrompt.category
    );
    if (categoryIndex >= 0) {
      updated.categories[categoryIndex].prompts[editingPrompt.index].text = editText;
      onCategoriesChange(updated);
      setEditingPrompt(null);
      setEditText("");
    }
  };

  const handleDeletePrompt = (categoryName: string, index: number) => {
    const updated = { categories: [...categories] };
    const categoryIndex = updated.categories.findIndex((c) => c.name === categoryName);
    if (categoryIndex >= 0) {
      updated.categories[categoryIndex].prompts.splice(index, 1);
      onCategoriesChange(updated);
    }
  };

  const handleAddPrompt = (categoryName: string) => {
    const updated = { categories: [...categories] };
    const categoryIndex = updated.categories.findIndex((c) => c.name === categoryName);
    if (categoryIndex >= 0) {
      const newPrompt = {
        text: "",
        order: updated.categories[categoryIndex].prompts.length + 1,
        id: `${categoryName}-new-${Date.now()}`,
      };
      updated.categories[categoryIndex].prompts.push(newPrompt);
      onCategoriesChange(updated);
      // Start editing immediately
      setEditText("");
      setEditingPrompt({
        category: categoryName,
        index: updated.categories[categoryIndex].prompts.length - 1,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Review and customize the prompts that will be tracked. You can edit, delete, or add new prompts.
      </div>
      {categories.map((category) => (
        <div key={category.name} className="rounded-md border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{category.name}</h3>
            <span className="text-xs text-muted-foreground">
              {category.prompts.length} prompt{category.prompts.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-2">
            {category.prompts.map((prompt, index) => (
              <div
                key={prompt.id || index}
                className="flex items-start gap-2 p-2 rounded border bg-muted/30"
              >
                {editingPrompt?.category === category.name &&
                editingPrompt?.index === index ? (
                  <div className="flex-1 space-y-2">
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      placeholder="Enter prompt text..."
                      disabled={isLoading}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={isLoading || !editText.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingPrompt(null);
                          setEditText("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="flex-1 text-sm">{prompt.text}</p>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditPrompt(category.name, index)}
                        disabled={isLoading}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeletePrompt(category.name, index)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddPrompt(category.name)}
              disabled={isLoading}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Prompt
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

