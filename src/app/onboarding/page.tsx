"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorkspace, createProject, savePrompts, saveOnboardingData, getSuggestedPrompts, getSuggestedCompetitors, triggerBrandWebsiteAnalysis } from "@/lib/actions/workspace";
import { startAnalysis, type AIProvider } from "@/lib/actions/analysis";
import { generatePromptSuggestions } from "@/lib/prompts-suggestions";
import { getRegionIdByCode, createRegion } from "@/lib/actions/regions";
import { batchCreatePrompts } from "@/lib/actions/prompt";
import { batchCreateCompetitors } from "@/lib/actions/competitors";
import { Loader2, Check, Building2, FolderKanban, Globe, Sparkles, ArrowRight, ArrowLeft, Plus, X, Tag, Trophy, CreditCard, Mail, Star, Users, Briefcase, Hash } from "lucide-react";
import { BasicInfoStep } from "@/components/onboarding/steps/basic-info-step";
import { PromptQuantityStep } from "@/components/onboarding/steps/prompt-quantity-step";
import { CompetitorSelectionStep } from "@/components/onboarding/steps/competitor-selection-step";
import { ReviewEditStep } from "@/components/onboarding/steps/review-edit-step";
import { ResultsStep } from "@/components/onboarding/steps/results-step";
import { containerVariants, itemVariants, stepVariants } from "@/components/onboarding/variants";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CountrySelect } from "@/components/ui/country-select";
import { countries, getCountryByCode } from "@/lib/countries";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const STEPS = [
  { 
    id: 1, 
    name: "Welcome", 
    description: "Tell us about yourself",
    icon: Users,
  },
  { 
    id: 2, 
    name: "Workspace", 
    description: "Name your workspace",
    icon: Building2,
  },
  { 
    id: 3, 
    name: "Project", 
    description: "Create your first project",
    icon: FolderKanban,
  },
  { 
    id: 4, 
    name: "Prompt Quantity", 
    description: "Choose number of prompts",
    icon: Hash,
  },
  { 
    id: 5, 
    name: "Select Competitors", 
    description: "Select or add competitors",
    icon: Users,
  },
  { 
    id: 6, 
    name: "Review & Edit", 
    description: "Review and customize prompts",
    icon: Sparkles,
  },
  { 
    id: 7, 
    name: "Results", 
    description: "View your ranking",
    icon: Trophy,
  },
  { 
    id: 8, 
    name: "Plan", 
    description: "Choose your plan",
    icon: CreditCard,
  },
];

const promptItemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
  selected: {
    scale: 1.02,
    transition: {
      duration: 0.2,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward

  // Form data
  const [userType, setUserType] = useState<"agency" | "company" | "">("");
  const [referralSource, setReferralSource] = useState<string>("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [clientUrl, setClientUrl] = useState("");
  const [projectColor, setProjectColor] = useState("#3B82F6");
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  
  // Prompt structure with region and category
  interface PromptWithConfig {
    id: string;
    text: string;
    region: string;
    category: string;
  }
  const [selectedPrompts, setSelectedPrompts] = useState<PromptWithConfig[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [editingTagPromptId, setEditingTagPromptId] = useState<string | null>(null);
  const [tagInputValue, setTagInputValue] = useState("");

  // IDs for created resources
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [regionId, setRegionId] = useState<string | null>(null);

  // Wizard step states
  const [selectedRegion, setSelectedRegion] = useState("US");
  const [totalPrompts, setTotalPrompts] = useState(10);
  const [promptDistribution, setPromptDistribution] = useState<Record<string, number>>({});
  const [suggestedCompetitors, setSuggestedCompetitors] = useState<Array<{ name: string; domain: string }> | null>(null);
  const [selectedCompetitors, setSelectedCompetitors] = useState<Array<{ name: string; domain: string }>>([]);
  const [newCompetitors, setNewCompetitors] = useState<Array<{ name: string; domain: string }>>([]);
  const [suggestedPromptsWizard, setSuggestedPromptsWizard] = useState<{
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

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userType) {
      setError("Please select if you're an agency or a company");
      return;
    }
    if (!referralSource) {
      setError("Please select how you heard about us");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await saveOnboardingData({
      user_type: userType,
      referral_source: referralSource,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    setDirection(1);
    setCurrentStep(2);
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) {
      setError("Please enter a workspace name");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await createWorkspace({ name: workspaceName });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setWorkspaceId(result.data!.id);
    setLoading(false);
    setDirection(1);
    setCurrentStep(3);
  };

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

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setError("Please enter a project name");
      return;
    }

    // URL is now required
    if (!clientUrl.trim()) {
      setError("Please enter a valid website URL");
      return;
    }

    // Validate URL format
    try {
      new URL(clientUrl);
    } catch {
      setError("Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    setLoading(true);
    setError(null);

    // Create project without triggering analysis
    const result = await createProject({
      name: projectName,
      workspace_id: workspaceId!,
      client_url: clientUrl,
      color: projectColor,
      skipAnalysis: true, // Skip analysis - will trigger in step 4
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const newProjectId = result.data!.id;
    setProjectId(newProjectId);
    
    // Get or create region_id for this project
    let finalRegionId: string | null = null;
    
    if (selectedRegion && selectedRegion !== "GLOBAL") {
      // Try to get existing region
      finalRegionId = await getRegionIdByCode(newProjectId, selectedRegion);
      
      // If region doesn't exist, create it automatically
      if (!finalRegionId) {
        const regionResult = await createRegion({
          project_id: newProjectId,
          code: selectedRegion,
        });
        
        if (regionResult.error || !regionResult.data) {
          setError(regionResult.error || "Failed to create region");
          setLoading(false);
          return;
        }
        
        finalRegionId = regionResult.data.id;
      }
    }
    
    setRegionId(finalRegionId);

    setLoading(false);
    setDirection(1);
    setCurrentStep(4);
  };

  // Step 4: Handle prompt quantity selection and trigger analysis
  const handleStep4Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !clientUrl.trim()) {
      setError("Missing project or website URL");
      return;
    }

    if (totalPrompts < 10 || totalPrompts > 200) {
      setError("Please select a number between 10 and 200");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Trigger analyze-brand-website using Server Action
      const result = await triggerBrandWebsiteAnalysis({
        project_id: projectId,
        client_url: clientUrl.trim(),
        force_refresh: false,
        prompts_quantity: totalPrompts,
      });
      
      if (result.error || !result.success) {
        setError(result.error || "Failed to start website analysis. Please try again.");
        setLoading(false);
        return;
      }

      // Move to step 5 (competitors) and start polling
      setLoading(false);
      setDirection(1);
      setCurrentStep(5);
      // Polling will start via useEffect when step 5 is reached
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  // Poll for suggested competitors (used in Step 5)
  useEffect(() => {
    if (currentStep === 5 && projectId && suggestedCompetitors === null && !loading) {
      const maxAttempts = 60; // 5 minutes max (5 second intervals)
      let attempts = 0;
      let pollInterval: NodeJS.Timeout | null = null;

      const poll = async () => {
        attempts++;
        
        try {
          const result = await getSuggestedCompetitors(projectId);
          
          if (result.data && result.data.competitors && Array.isArray(result.data.competitors)) {
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
          setSuggestedCompetitors([]);
          if (pollInterval) {
            clearInterval(pollInterval);
          }
        }
      };

      poll();

      return () => {
        if (pollInterval) {
          clearInterval(pollInterval);
        }
      };
    }
  }, [currentStep, projectId, suggestedCompetitors, loading]);

  // Step 5: Handle competitor selection and save
  const handleStep5Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !regionId) {
      setError("Missing project or region information");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Combine selected and new competitors
      const allCompetitors = [...selectedCompetitors, ...newCompetitors];

      // Save competitors if any are selected
      if (allCompetitors.length > 0) {
        const result = await batchCreateCompetitors({
          project_id: projectId,
          region_id: regionId,
          competitors: allCompetitors,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
        }
      }

      // Move to step 6 (Review & Edit)
      setLoading(false);
      setDirection(1);
      setCurrentStep(6);
      // Polling for prompts will start via useEffect when step 6 is reached
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  // Poll for suggested prompts (used in Step 6)
  useEffect(() => {
    if (currentStep === 6 && projectId && !suggestedPromptsWizard && !loading) {
      const maxAttempts = 60; // 5 minutes max (5 second intervals)
      let attempts = 0;
      let pollInterval: NodeJS.Timeout | null = null;

      const poll = async () => {
        attempts++;
        
        try {
          const result = await getSuggestedPrompts(projectId);
          
          if (result.data && result.data.categories && result.data.categories.length > 0) {
            setSuggestedPromptsWizard(result.data);
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
          setError("Timeout waiting for prompt suggestions. The analysis may still be in progress. Please check back later.");
          if (pollInterval) {
            clearInterval(pollInterval);
          }
        }
      };

      poll();

      return () => {
        if (pollInterval) {
          clearInterval(pollInterval);
        }
      };
    }
  }, [currentStep, projectId, suggestedPromptsWizard, loading, totalPrompts]);

  // Step 6: Handle final confirmation and save prompts
  const handleStep6Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !regionId) {
      setError("Missing project or region information");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Flatten prompts from all categories, preserving category information
      const allPrompts = editablePrompts.categories.flatMap((cat) =>
        cat.prompts.map((p) => ({ 
          prompt: p.text,
          categoryName: cat.name,
        }))
      );

      if (allPrompts.length === 0) {
        setError("Please select at least one prompt");
        setLoading(false);
        return;
      }

      // Batch create prompts
      const result = await batchCreatePrompts({
        project_id: projectId,
        region_id: regionId,
        prompts: allPrompts,
      });

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // Move to Results step
    setLoading(false);
    setDirection(1);
      setCurrentStep(7);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  // Step 7: Results step - just continue to plan
  const handleStep7Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDirection(1);
    setCurrentStep(8);
  };

  const handleStep8Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Plan step - redirect to dashboard
    router.push(`/dashboard`);
  };

  const togglePrompt = (promptText: string) => {
    const existingPrompt = selectedPrompts.find((p) => p.text === promptText);
    if (existingPrompt) {
      // Remove prompt
      setSelectedPrompts((prev) => prev.filter((p) => p.id !== existingPrompt.id));
    } else {
      // Add prompt
      setSelectedPrompts((prev) => [
        ...prev,
        {
          id: `prompt-${Date.now()}-${prev.length}`,
          text: promptText,
          region: "GLOBAL",
          category: "general",
        },
      ]);
    }
  };

  const removePrompt = (promptId: string) => {
    setSelectedPrompts((prev) => prev.filter((p) => p.id !== promptId));
  };

  const updatePromptRegion = (promptId: string, region: string) => {
    setSelectedPrompts((prev) =>
      prev.map((p) => (p.id === promptId ? { ...p, region } : p))
    );
  };

  const updatePromptCategory = (promptId: string, category: string) => {
    setSelectedPrompts((prev) =>
      prev.map((p) => (p.id === promptId ? { ...p, category } : p))
    );
  };

  const addCustomPrompt = () => {
    if (customPrompt.trim() && !selectedPrompts.some((p) => p.text === customPrompt.trim())) {
      setSelectedPrompts((prev) => [
        ...prev,
        {
          id: `prompt-${Date.now()}-${prev.length}`,
          text: customPrompt.trim(),
          region: "GLOBAL",
          category: "general",
        },
      ]);
      setSuggestedPrompts((prev) => [...prev, customPrompt.trim()]);
      setCustomPrompt("");
    }
  };


  const goToStep = (step: number) => {
    if (step < currentStep) {
      setDirection(-1);
      setCurrentStep(step);
    }
  };

  return (
    <div className="flex min-h-screen flex-col relative overflow-hidden bg-gradient-to-b from-[#C2C2E1]/10 via-background to-background">
      {/* Background gradients */}
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(194,194,225,0.15),transparent_50%)]"
        animate={{
          opacity: [0.15, 0.2, 0.15],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(194,194,225,0.1),transparent_50%)]"
        animate={{
          opacity: [0.1, 0.15, 0.1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Main Content Container */}
      <motion.div
        className="relative z-10 flex min-h-screen flex-col"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Logo - Fixed top left */}
        <motion.div
          className="absolute top-0 left-0 z-50 px-6 lg:px-8 pt-8"
          variants={itemVariants}
        >
          <div className="flex items-center gap-4">
            <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
              <Link href="/" className="inline-flex items-center space-x-2">
                <div className="relative h-8 w-8">
                  <Image
                    src="/ateneaiiconblack.png"
                    alt="Ateneai"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-xl font-semibold">Ateneai</span>
              </Link>
            </motion.div>
            <button
              type="button"
              onClick={() => {
                if (currentStep > 1) {
                  setDirection(-1);
                  setCurrentStep(currentStep - 1);
                }
              }}
              disabled={currentStep === 1 || loading}
              className={cn(
                "inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors",
                (currentStep === 1 || loading) && "opacity-50 cursor-not-allowed"
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>boton temporal</span>
            </button>
          </div>
        </motion.div>

        {/* Step Indicators - Scrollable */}
        <motion.div
          className="flex items-center justify-center pt-20 pb-6"
          variants={itemVariants}
        >
          <div className="flex items-center">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = step.id < currentStep;
              const isCurrent = step.id === currentStep;
              
              return (
                <div key={step.id} className="flex items-center">
                  <motion.div
                    className="flex flex-col items-center"
                  >
                    <motion.div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full border-2 transition-colors",
                        isCompleted
                          ? "border-[#C2C2E1] bg-[#C2C2E1] text-white"
                          : isCurrent
                          ? "border-[#C2C2E1] bg-[#C2C2E1]/10 text-[#C2C2E1]"
                          : "border-muted-foreground/30 bg-background text-muted-foreground"
                      )}
                      animate={{
                        scale: isCurrent ? [1, 1.1, 1] : 1,
                      }}
                      transition={{
                        duration: 2,
                        repeat: isCurrent ? Infinity : 0,
                        ease: "easeInOut",
                      }}
                    >
                      <AnimatePresence mode="wait">
                        {isCompleted ? (
                          <motion.div
                            key="check"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 180 }}
                            transition={{ duration: 0.3 }}
                          >
                            <Check className="h-5 w-5" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="icon"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Icon className="h-5 w-5" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                    <div className="mt-2 text-center">
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
                  </motion.div>
                  {index < STEPS.length - 1 && (
                    <motion.div
                      className={cn(
                        "mx-4 h-0.5 w-16",
                        isCompleted
                          ? "bg-[#C2C2E1]"
                          : "bg-muted"
                      )}
                      initial={{ scaleX: 0 }}
                      animate={{
                        scaleX: isCompleted ? 1 : 0.3,
                      }}
                      transition={{
                        duration: 0.5,
                        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Content Area */}
        <div className="flex flex-1 items-center justify-center pb-12 pt-8">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl">
              {/* Main Card */}
              <motion.div
                className="relative overflow-hidden rounded-2xl border bg-card/50 backdrop-blur-sm shadow-xl"
                variants={itemVariants}
                whileHover={{ boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
                transition={{ duration: 0.3 }}
              >
                {/* Card gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#C2C2E1]/5 via-transparent to-transparent pointer-events-none" />
                
                <div className="relative p-8 md:p-12">
                  <AnimatePresence mode="wait" custom={direction}>
                    {error && (
                      <motion.div
                        key="error"
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
                      >
                        {error}
                      </motion.div>
                    )}

                    {/* Step 1: Welcome */}
                    {currentStep === 1 && (
                      <motion.form
                        key="step1"
                        custom={direction}
                        variants={stepVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onSubmit={handleStep1Submit}
                        className="space-y-8"
                      >
                        <motion.div
                          className="space-y-6"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          <motion.div
                            className="flex items-center gap-3"
                            variants={itemVariants}
                          >
                            <motion.div
                              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C2C2E1]/20"
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                              <Users className="h-5 w-5 text-[#C2C2E1]" />
                            </motion.div>
                            <div>
                              <h2 className="text-2xl font-bold tracking-tight">Welcome to Ateneai</h2>
                              <p className="text-sm text-muted-foreground mt-1">
                                Help us personalize your experience
                              </p>
                            </div>
                          </motion.div>

                          {/* User Type Selection */}
                          <motion.div
                            className="space-y-3"
                            variants={itemVariants}
                          >
                            <Label className="text-base">Are you an agency or a company?</Label>
                            <div className="grid grid-cols-2 gap-3">
                              <motion.button
                                type="button"
                                onClick={() => setUserType("agency")}
                                className={cn(
                                  "relative overflow-hidden rounded-lg border-2 p-4 text-left transition-all",
                                  userType === "agency"
                                    ? "border-[#C2C2E1] bg-[#C2C2E1]/10"
                                    : "border-border bg-card/50 hover:border-[#C2C2E1]/50 hover:bg-card"
                                )}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-full",
                                    userType === "agency"
                                      ? "bg-[#C2C2E1] text-white"
                                      : "bg-muted text-muted-foreground"
                                  )}>
                                    <Briefcase className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <div className="font-semibold">Agency</div>
                                    <div className="text-xs text-muted-foreground">Manage multiple clients</div>
                                  </div>
                                </div>
                                {userType === "agency" && (
                                  <motion.div
                                    className="absolute top-2 right-2"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                  >
                                    <Check className="h-5 w-5 text-[#C2C2E1]" />
                                  </motion.div>
                                )}
                              </motion.button>

                              <motion.button
                                type="button"
                                onClick={() => setUserType("company")}
                                className={cn(
                                  "relative overflow-hidden rounded-lg border-2 p-4 text-left transition-all",
                                  userType === "company"
                                    ? "border-[#C2C2E1] bg-[#C2C2E1]/10"
                                    : "border-border bg-card/50 hover:border-[#C2C2E1]/50 hover:bg-card"
                                )}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-full",
                                    userType === "company"
                                      ? "bg-[#C2C2E1] text-white"
                                      : "bg-muted text-muted-foreground"
                                  )}>
                                    <Building2 className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <div className="font-semibold">Company</div>
                                    <div className="text-xs text-muted-foreground">Track your own brand</div>
                                  </div>
                                </div>
                                {userType === "company" && (
                                  <motion.div
                                    className="absolute top-2 right-2"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                  >
                                    <Check className="h-5 w-5 text-[#C2C2E1]" />
                                  </motion.div>
                                )}
                              </motion.button>
                            </div>
                          </motion.div>

                          {/* Referral Source Selection */}
                          <motion.div
                            className="space-y-3"
                            variants={itemVariants}
                          >
                            <Label className="text-base">How did you hear about us?</Label>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { value: "social", label: "Social Media", icon: "📱" },
                                { value: "friends", label: "Friends or colleagues", icon: "👥" },
                                { value: "google", label: "Google search", icon: "🔍" },
                                { value: "press", label: "Press", icon: "📰" },
                                { value: "other", label: "Other", icon: "✨" },
                              ].map((source) => (
                                <motion.button
                                  key={source.value}
                                  type="button"
                                  onClick={() => setReferralSource(source.value)}
                                  className={cn(
                                    "relative overflow-hidden rounded-lg border-2 p-3 text-left transition-all",
                                    referralSource === source.value
                                      ? "border-[#C2C2E1] bg-[#C2C2E1]/10"
                                      : "border-border bg-card/50 hover:border-[#C2C2E1]/50 hover:bg-card"
                                  )}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{source.icon}</span>
                                    <span className="text-sm font-medium">{source.label}</span>
                                  </div>
                                  {referralSource === source.value && (
                                    <motion.div
                                      className="absolute top-2 right-2"
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                    >
                                      <Check className="h-4 w-4 text-[#C2C2E1]" />
                                    </motion.div>
                                  )}
                                </motion.button>
                              ))}
                            </div>
                          </motion.div>
                        </motion.div>
                        <motion.div
                          variants={itemVariants}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button type="submit" className="w-full h-12 text-base" size="lg" disabled={loading}>
                            {loading ? (
                              <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                Continue
                                <ArrowRight className="ml-2 h-5 w-5" />
                              </>
                            )}
                          </Button>
                        </motion.div>
                      </motion.form>
                    )}

                    {/* Step 2: Create Workspace */}
                    {currentStep === 2 && (
                      <motion.form
                        key="step2"
                        custom={direction}
                        variants={stepVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onSubmit={handleStep2Submit}
                        className="space-y-8"
                      >
                        <motion.div
                          className="space-y-4"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          <motion.div
                            className="flex items-center gap-3"
                            variants={itemVariants}
                          >
                            <motion.div
                              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C2C2E1]/20"
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                              <Building2 className="h-5 w-5 text-[#C2C2E1]" />
                            </motion.div>
                            <div>
                              <h2 className="text-2xl font-bold tracking-tight">Create your workspace</h2>
                              <p className="text-sm text-muted-foreground mt-1">
                                A workspace is where you'll manage all your projects
                              </p>
                            </div>
                          </motion.div>
                          <motion.div
                            className="space-y-2"
                            variants={itemVariants}
                          >
                            <Label htmlFor="workspaceName" className="text-base">Workspace Name</Label>
                            <Input
                              id="workspaceName"
                              placeholder="e.g., My Agency, Acme Corp"
                              value={workspaceName}
                              onChange={(e) => setWorkspaceName(e.target.value)}
                              required
                              disabled={loading}
                              autoFocus
                              className="h-12 text-base"
                            />
                            <p className="text-xs text-muted-foreground">
                              If you're an agency, this could be your agency name. You can change this later.
                            </p>
                          </motion.div>
                        </motion.div>
                        <motion.div
                          variants={itemVariants}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button type="submit" className="w-full h-12 text-base" size="lg" disabled={loading}>
                            {loading ? (
                              <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Creating workspace...
                              </>
                            ) : (
                              <>
                                Continue
                                <ArrowRight className="ml-2 h-5 w-5" />
                              </>
                            )}
                          </Button>
                        </motion.div>
                      </motion.form>
                    )}

                    {/* Step 3: Create Project */}
                    {currentStep === 3 && (
                      <motion.form
                        key="step3"
                        custom={direction}
                        variants={stepVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onSubmit={handleStep3Submit}
                        className="space-y-8"
                      >
                        <BasicInfoStep
                          projectName={projectName}
                          clientUrl={clientUrl}
                          selectedRegion={selectedRegion}
                          projectColor={projectColor}
                          onProjectNameChange={setProjectName}
                          onClientUrlChange={setClientUrl}
                          onRegionChange={setSelectedRegion}
                          onColorChange={setProjectColor}
                          isLoading={loading}
                        />
                        <motion.div
                          variants={itemVariants}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button type="submit" className="w-full h-12 text-base" size="lg" disabled={loading}>
                            {loading ? (
                              <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Creating project...
                              </>
                            ) : (
                              <>
                                Continue
                                <ArrowRight className="ml-2 h-5 w-5" />
                              </>
                            )}
                          </Button>
                        </motion.div>
                      </motion.form>
                    )}

                    {/* Step 4: Prompt Quantity */}
                    {currentStep === 4 && (
                      <motion.form
                        key="step4"
                        custom={direction}
                        variants={stepVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onSubmit={handleStep4Submit}
                        className="space-y-8"
                      >
                        <PromptQuantityStep
                          totalPrompts={totalPrompts}
                          onTotalPromptsChange={setTotalPrompts}
                          isLoading={loading}
                        />
                        <motion.div
                            variants={itemVariants}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            type="submit"
                            className="w-full h-12 text-base"
                            size="lg"
                            disabled={loading}
                          >
                            {loading ? (
                              <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Starting analysis...
                              </>
                            ) : (
                              <>
                                Continue
                                <ArrowRight className="ml-2 h-5 w-5" />
                              </>
                            )}
                          </Button>
                            </motion.div>
                      </motion.form>
                    )}

                    {/* Step 5: Select Competitors */}
                    {currentStep === 5 && (
                      <motion.form
                        key="step5"
                        custom={direction}
                        variants={stepVariants}
                                        initial="hidden"
                                        animate="visible"
                        exit="exit"
                        onSubmit={handleStep5Submit}
                        className="space-y-8"
                      >
                        {suggestedCompetitors === null ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                            <p className="text-sm text-muted-foreground font-medium">
                              Analyzing website and generating competitor suggestions...
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              This may take a minute. You can also add competitors manually below.
                            </p>
                                      </div>
                        ) : (
                          <>
                            <CompetitorSelectionStep
                              suggestedCompetitors={suggestedCompetitors}
                              selectedCompetitors={selectedCompetitors}
                              newCompetitors={newCompetitors}
                              onSelectedChange={setSelectedCompetitors}
                              onNewCompetitorsChange={setNewCompetitors}
                              isLoading={loading}
                            />
                            <motion.div
                              variants={itemVariants}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Button
                                type="submit"
                                className="w-full h-12 text-base"
                                size="lg"
                                disabled={loading}
                              >
                                {loading ? (
                                  <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Saving competitors...
                                  </>
                                ) : (
                                  <>
                                    Continue
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                  </>
                                )}
                              </Button>
                            </motion.div>
                          </>
                        )}
                      </motion.form>
                    )}

                    {/* Step 6: Review & Edit */}
                    {currentStep === 6 && (
                      <motion.form
                        key="step6"
                        custom={direction}
                        variants={stepVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onSubmit={handleStep6Submit}
                        className="space-y-8"
                      >
                        {!suggestedPromptsWizard ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                            <p className="text-sm text-muted-foreground font-medium">
                              Analyzing website and generating prompt suggestions...
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              This may take a minute. Please wait...
                            </p>
                            </div>
                        ) : (
                          <>
                            <ReviewEditStep
                              categories={editablePrompts.categories}
                              onCategoriesChange={setEditablePrompts}
                              isLoading={loading}
                            />
                        <motion.div
                          variants={itemVariants}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            type="submit"
                            className="w-full h-12 text-base"
                            size="lg"
                                disabled={loading || editablePrompts.categories.length === 0}
                          >
                              {loading ? (
                                <>
                                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Saving prompts...
                                </>
                              ) : (
                                <>
                                  Continue
                                  <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                              )}
                          </Button>
                        </motion.div>
                          </>
                        )}
                      </motion.form>
                    )}

                    {/* Step 7: Results */}
                    {currentStep === 7 && (
                      <motion.form
                        key="step7"
                        custom={direction}
                        variants={stepVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onSubmit={handleStep7Submit}
                        className="space-y-8"
                      >
                        {projectId && (
                          <>
                            <ResultsStep
                              projectId={projectId}
                              projectName={projectName}
                              onContinue={() => {
                                setDirection(1);
                                setCurrentStep(8);
                              }}
                            />
                        <motion.div
                          variants={itemVariants}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                              <Button
                                type="submit"
                                className="w-full h-12 text-base"
                                size="lg"
                              >
                            Continue
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </Button>
                        </motion.div>
                          </>
                        )}
                      </motion.form>
                    )}

                    {/* Step 8: Plan Selection */}
                    {currentStep === 8 && (
                      <motion.form
                        key="step8"
                        custom={direction}
                        variants={stepVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onSubmit={handleStep8Submit}
                        className="space-y-8"
                      >
                        <motion.div
                          className="space-y-6"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          <motion.div
                            className="flex items-center gap-3"
                            variants={itemVariants}
                          >
                            <motion.div
                              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C2C2E1]/20"
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                              <CreditCard className="h-5 w-5 text-[#C2C2E1]" />
                            </motion.div>
                            <div>
                              <h2 className="text-2xl font-bold tracking-tight">Choose your plan</h2>
                              <p className="text-sm text-muted-foreground mt-1">
                                Select the plan that best fits your needs
                              </p>
                            </div>
                          </motion.div>

                          {/* Plans - Minimalist Design */}
                          <motion.div
                            className="space-y-4"
                            variants={itemVariants}
                          >
                            {/* Business Plan */}
                            <motion.div
                              className="group relative overflow-hidden rounded-lg border border-[#C2C2E1]/30 bg-[#C2C2E1]/5 px-6 py-5 transition-all hover:border-[#C2C2E1]/50 hover:bg-[#C2C2E1]/10"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                            >
                              <div className="flex items-start justify-between gap-6">
                                <div className="flex-1 space-y-4">
                                  <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-semibold">Business</h3>
                                    <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-[#C2C2E1]/20 text-[#C2C2E1] border-[#C2C2E1]/30">
                                      Popular
                                    </Badge>
                                  </div>
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold">€200</span>
                                    <span className="text-sm text-muted-foreground">/month per brand</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">7 days free trial</p>
                                  <ul className="space-y-2.5 pt-2">
                                    <li className="flex items-center gap-2.5">
                                      <Check className="h-4 w-4 text-[#C2C2E1] shrink-0" />
                                      <span className="text-sm"><strong>100 prompts</strong> per month</span>
                                    </li>
                                    <li className="flex items-center gap-2.5">
                                      <Check className="h-4 w-4 text-[#C2C2E1] shrink-0" />
                                      <span className="text-sm">Real-time citation tracking</span>
                                    </li>
                                    <li className="flex items-center gap-2.5">
                                      <Check className="h-4 w-4 text-[#C2C2E1] shrink-0" />
                                      <span className="text-sm">Sentiment analysis</span>
                                    </li>
                                    <li className="flex items-center gap-2.5">
                                      <Check className="h-4 w-4 text-[#C2C2E1] shrink-0" />
                                      <span className="text-sm">Competitor tracking</span>
                                    </li>
                                    <li className="flex items-center gap-2.5">
                                      <Check className="h-4 w-4 text-[#C2C2E1] shrink-0" />
                                      <span className="text-sm">Email support</span>
                                    </li>
                                    <li className="flex items-center gap-2.5">
                                      <Check className="h-4 w-4 text-[#C2C2E1] shrink-0" />
                                      <span className="text-sm">Advanced analytics dashboard</span>
                                    </li>
                                  </ul>
                                </div>
                                <div className="flex items-end">
                                  <Button
                                    type="submit"
                                    className="h-10 px-6 bg-[#C2C2E1] hover:bg-[#C2C2E1]/90 text-black"
                                    size="lg"
                                  >
                                    Start free trial
                                  </Button>
                                </div>
                              </div>
                            </motion.div>

                            {/* Enterprise Plan */}
                            <motion.div
                              className="group relative overflow-hidden rounded-lg border border-border bg-card/30 px-6 py-5 transition-all hover:border-[#C2C2E1]/30 hover:bg-card/50"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                            >
                              <div className="flex items-start justify-between gap-6">
                                <div className="flex-1 space-y-4">
                                  <div>
                                    <h3 className="text-xl font-semibold">Enterprise</h3>
                                  </div>
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold">Custom</span>
                                    <span className="text-sm text-muted-foreground">pricing</span>
                                  </div>
                                  <ul className="space-y-2.5 pt-2">
                                    <li className="flex items-center gap-2.5">
                                      <Star className="h-4 w-4 text-[#C2C2E1] shrink-0" />
                                      <span className="text-sm"><strong>Unlimited</strong> prompts</span>
                                    </li>
                                    <li className="flex items-center gap-2.5">
                                      <Star className="h-4 w-4 text-[#C2C2E1] shrink-0" />
                                      <span className="text-sm">Everything in Business</span>
                                    </li>
                                    <li className="flex items-center gap-2.5">
                                      <Star className="h-4 w-4 text-[#C2C2E1] shrink-0" />
                                      <span className="text-sm">Multiple brands & workspaces</span>
                                    </li>
                                    <li className="flex items-center gap-2.5">
                                      <Star className="h-4 w-4 text-[#C2C2E1] shrink-0" />
                                      <span className="text-sm">Priority support</span>
                                    </li>
                                    <li className="flex items-center gap-2.5">
                                      <Star className="h-4 w-4 text-[#C2C2E1] shrink-0" />
                                      <span className="text-sm">Custom integrations</span>
                                    </li>
                                    <li className="flex items-center gap-2.5">
                                      <Star className="h-4 w-4 text-[#C2C2E1] shrink-0" />
                                      <span className="text-sm">Dedicated account manager</span>
                                    </li>
                                  </ul>
                                </div>
                                <div className="flex items-end">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-10 px-6 border"
                                    size="lg"
                                    onClick={() => window.open("mailto:support@ateneai.com?subject=Enterprise Plan Inquiry", "_blank")}
                                  >
                                    <Mail className="mr-2 h-4 w-4" />
                                    Contact Sales
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          </motion.div>
                        </motion.div>

                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
