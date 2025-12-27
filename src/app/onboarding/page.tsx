"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorkspace, createProject, savePrompts, saveOnboardingData } from "@/lib/actions/workspace";
import { startAnalysis, type AIProvider } from "@/lib/actions/analysis";
import { generatePromptSuggestions } from "@/lib/prompts-suggestions";
import { Loader2, Check, Building2, FolderKanban, Globe, Sparkles, ArrowRight, ArrowLeft, Plus, X, Tag, Trophy, CreditCard, Mail, Star, Users, Briefcase } from "lucide-react";
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
    name: "Prompts", 
    description: "Select prompts to track",
    icon: Sparkles,
  },
  { 
    id: 5, 
    name: "Results", 
    description: "View your ranking",
    icon: Trophy,
  },
  { 
    id: 6, 
    name: "Plan", 
    description: "Choose your plan",
    icon: CreditCard,
  },
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

const stepVariants = {
  hidden: { opacity: 0, scale: 0.8, x: -20 },
  visible: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    x: 20,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

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

    const result = await createProject({
      name: projectName,
      workspace_id: workspaceId!,
      client_url: clientUrl,
      color: projectColor,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setProjectId(result.data!.id);

    // Generate prompt suggestions
    const prompts = generatePromptSuggestions(
      clientUrl,
      projectName
    );
    setSuggestedPrompts(prompts);
    // Initialize ALL suggested prompts as selected by default
    setSelectedPrompts(
      prompts.map((prompt, index) => ({
        id: `prompt-${Date.now()}-${index}`,
        text: prompt,
        region: "GLOBAL",
        category: "general",
      }))
    );

    setLoading(false);
    setDirection(1);
    setCurrentStep(4);
  };

  const handleStep4Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedPrompts.length === 0) {
      setError("Please select at least one prompt to track");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await savePrompts({
      project_id: projectId!,
      prompts: selectedPrompts.map((p) => ({
        prompt: p.text,
        region: p.region,
        category: p.category,
      })),
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Start analysis for each created prompt
    if (result.data && result.data.length > 0) {
      const allPlatforms: AIProvider[] = ["openai", "gemini", "claude", "perplexity"];
      
      // Trigger analysis for each prompt in the background
      // We don't await to avoid blocking the UI
      result.data.forEach(async (prompt: any) => {
        try {
          const analysisResult = await startAnalysis({
            prompt_tracking_id: prompt.id,
            project_id: projectId!,
            prompt_text: prompt.prompt,
            platforms: allPlatforms,
          });
          
          if (analysisResult.error) {
            console.error("Failed to start analysis for prompt:", prompt.id, analysisResult.error);
          } else {
            console.log("Analysis started successfully for prompt:", prompt.id);
          }
        } catch (error) {
          console.error("Failed to start analysis for prompt:", prompt.id, error);
        }
      });
    }

    setLoading(false);
    setDirection(1);
    setCurrentStep(5);
  };

  const handleStep5Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Results step - just continue to plan
    setDirection(1);
    setCurrentStep(6);
  };

  const handleStep6Submit = async (e: React.FormEvent) => {
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
                        key="step2"
                        custom={direction}
                        variants={stepVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onSubmit={handleStep3Submit}
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
                              <FolderKanban className="h-5 w-5 text-[#C2C2E1]" />
                            </motion.div>
                            <div>
                              <h2 className="text-2xl font-bold tracking-tight">Create your first project</h2>
                              <p className="text-sm text-muted-foreground mt-1">
                                A project represents a brand or client you want to track
                              </p>
                            </div>
                          </motion.div>
                          <motion.div
                            className="space-y-4"
                            variants={itemVariants}
                          >
                            <div className="space-y-2">
                              <Label htmlFor="projectName" className="text-base">Project Name</Label>
                              <Input
                                id="projectName"
                                placeholder="e.g., Acme Inc, Nike Campaign"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                required
                                disabled={loading}
                                autoFocus
                                className="h-12 text-base"
                              />
                              <p className="text-xs text-muted-foreground">
                                You can create more projects later from your dashboard.
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="clientUrl" className="text-base">
                                Client Website URL
                              </Label>
                              <Input
                                id="clientUrl"
                                type="url"
                                placeholder="https://example.com"
                                value={clientUrl}
                                onChange={(e) => setClientUrl(e.target.value)}
                                required
                                disabled={loading}
                                className="h-12 text-base"
                              />
                              <p className="text-xs text-muted-foreground">
                                We'll use this URL to generate better prompt suggestions for your project.
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="projectColor" className="text-base">
                                Brand Color
                              </Label>
                              <div className="flex items-center gap-3">
                                <input
                                  id="projectColor"
                                  type="color"
                                  value={projectColor}
                                  onChange={(e) => setProjectColor(e.target.value)}
                                  disabled={loading}
                                  className="h-12 w-24 cursor-pointer rounded border border-input bg-background disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                <Input
                                  type="text"
                                  value={projectColor}
                                  onChange={(e) => setProjectColor(e.target.value)}
                                  placeholder="#3B82F6"
                                  disabled={loading}
                                  className="flex-1 h-12 text-base"
                                  pattern="^#[0-9A-Fa-f]{6}$"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Choose a color to represent this brand in charts and visualizations
                              </p>
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

                    {/* Step 4: Select Prompts */}
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
                              <Sparkles className="h-5 w-5 text-[#C2C2E1]" />
                            </motion.div>
                            <div>
                              <h2 className="text-2xl font-bold tracking-tight">Select prompts to track</h2>
                              <p className="text-sm text-muted-foreground mt-1">
                                Choose the prompts you want to monitor for brand mentions
                              </p>
                            </div>
                          </motion.div>

                          {/* Unified Prompts List */}
                          <motion.div
                            className="space-y-4"
                            variants={itemVariants}
                          >
                            <Label className="text-base">Suggested Prompts</Label>
                            <div className="space-y-3">
                              <AnimatePresence>
                                {suggestedPrompts.map((promptText, index) => {
                                  const prompt = selectedPrompts.find((p) => p.text === promptText);
                                  const isSelected = !!prompt;
                                  
                                  // Get tag color
                                  const getTagColor = (tag: string) => {
                                    const colors = [
                                      "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
                                      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                                      "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
                                      "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
                                      "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
                                      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
                                      "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
                                    ];
                                    let hash = 0;
                                    for (let i = 0; i < tag.length; i++) {
                                      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
                                    }
                                    return colors[Math.abs(hash) % colors.length];
                                  };

                                  // Get existing tags from selected prompts
                                  const existingTags = Array.from(
                                    new Set(selectedPrompts.map(p => p.category).filter(c => c !== "general"))
                                  );

                                  // If prompt is not selected, create it with default values when toggling
                                  // But for display, we'll show it as unselected
                                  if (!prompt) {
                                    // If prompt is not selected, show simple selection button
                                    return (
                                      <motion.button
                                        key={index}
                                        type="button"
                                        onClick={() => togglePrompt(promptText)}
                                        custom={index}
                                        variants={promptItemVariants}
                                        initial="hidden"
                                        animate="visible"
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        className="group flex items-start gap-4 rounded-lg border p-4 text-left transition-all border-border bg-card/50 hover:bg-card hover:border-[#C2C2E1]/50"
                                      >
                                        <motion.div
                                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all border-muted-foreground/30 group-hover:border-[#C2C2E1]/50"
                                        >
                                        </motion.div>
                                        <span className="flex-1 text-sm leading-relaxed">{promptText}</span>
                                      </motion.button>
                                    );
                                  }

                                  const country = getCountryByCode(prompt.region);
                                  const displayTag = prompt.category === "general" ? "General" : prompt.category;

                                  return (
                                    <motion.div
                                      key={prompt.id}
                                      custom={index}
                                      variants={promptItemVariants}
                                      initial="hidden"
                                      animate="visible"
                                      exit={{ opacity: 0, x: -20, scale: 0.95 }}
                                      className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:bg-muted/30 transition-colors"
                                    >
                                      {/* Checkbox */}
                                      <motion.button
                                        type="button"
                                        onClick={() => togglePrompt(promptText)}
                                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all border-[#C2C2E1] bg-[#C2C2E1] text-white"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </motion.button>

                                      {/* Prompt Text */}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium leading-relaxed">{prompt.text}</p>
                                      </div>

                                      {/* Tag Badge (Editable) */}
                                      <Popover 
                                        open={editingTagPromptId === prompt.id}
                                        onOpenChange={(open) => {
                                          if (!open) {
                                            setEditingTagPromptId(null);
                                            setTagInputValue("");
                                          } else {
                                            setEditingTagPromptId(prompt.id);
                                            setTagInputValue(prompt.category === "general" ? "" : prompt.category);
                                          }
                                        }}
                                      >
                                        <PopoverTrigger asChild>
                                          <Badge
                                            variant="secondary"
                                            className={cn(
                                              "cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1",
                                              getTagColor(displayTag)
                                            )}
                                          >
                                            <Tag className="h-3 w-3" />
                                            {displayTag}
                                          </Badge>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[250px] p-0" align="end">
                                          <Command shouldFilter={false}>
                                            <CommandInput
                                              placeholder="Type to search or create..."
                                              value={tagInputValue}
                                              onValueChange={setTagInputValue}
                                            />
                                            <CommandList>
                                              {tagInputValue.trim() && 
                                               !existingTags.some(t => t.toLowerCase() === tagInputValue.trim().toLowerCase()) && (
                                                <CommandGroup heading="Create new">
                                                  <CommandItem
                                                    value={`create-${tagInputValue.trim().replace(/\s+/g, '-')}`}
                                                    onSelect={() => {
                                                      updatePromptCategory(prompt.id, tagInputValue.trim());
                                                      setEditingTagPromptId(null);
                                                      setTagInputValue("");
                                                    }}
                                                    className="cursor-pointer"
                                                  >
                                                    <Tag className="mr-2 h-4 w-4" />
                                                    Create "{tagInputValue.trim()}"
                                                  </CommandItem>
                                                </CommandGroup>
                                              )}
                                              {existingTags.filter(tag =>
                                                tag.toLowerCase().includes(tagInputValue.toLowerCase())
                                              ).length > 0 && (
                                                <CommandGroup heading="Existing tags">
                                                  {existingTags
                                                    .filter(tag => tag.toLowerCase().includes(tagInputValue.toLowerCase()))
                                                    .map((tag) => (
                                                      <CommandItem
                                                        key={tag}
                                                        value={tag}
                                                        onSelect={() => {
                                                          updatePromptCategory(prompt.id, tag);
                                                          setEditingTagPromptId(null);
                                                          setTagInputValue("");
                                                        }}
                                                        className="cursor-pointer"
                                                      >
                                                        <Check
                                                          className={cn(
                                                            "mr-2 h-4 w-4",
                                                            prompt.category === tag ? "opacity-100" : "opacity-0"
                                                          )}
                                                        />
                                                        {tag}
                                                      </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                              )}
                                              <CommandGroup>
                                                <CommandItem
                                                  onSelect={() => {
                                                    updatePromptCategory(prompt.id, "general");
                                                    setEditingTagPromptId(null);
                                                    setTagInputValue("");
                                                  }}
                                                  className="cursor-pointer"
                                                >
                                                  <Check
                                                    className={cn(
                                                      "mr-2 h-4 w-4",
                                                      prompt.category === "general" ? "opacity-100" : "opacity-0"
                                                    )}
                                                  />
                                                  General
                                                </CommandItem>
                                              </CommandGroup>
                                              {existingTags.length === 0 && !tagInputValue.trim() && (
                                                <CommandEmpty>No tags yet. Type to create one.</CommandEmpty>
                                              )}
                                            </CommandList>
                                          </Command>
                                        </PopoverContent>
                                      </Popover>

                                      {/* Country Badge (Editable) */}
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Badge variant="outline" className="text-xs flex items-center gap-1 cursor-pointer hover:bg-muted shrink-0">
                                            <span>{country?.flag || "🌍"}</span>
                                            <span>{country?.name || "All countries"}</span>
                                          </Badge>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0" align="end">
                                          <Command>
                                            <CommandInput placeholder="Search country..." />
                                            <CommandList>
                                              <CommandEmpty>No country found.</CommandEmpty>
                                              <CommandGroup>
                                                {countries.map((c) => (
                                                  <CommandItem
                                                    key={c.code}
                                                    value={c.code}
                                                    onSelect={() => {
                                                      updatePromptRegion(prompt.id, c.code);
                                                    }}
                                                    className="cursor-pointer"
                                                  >
                                                    <Check
                                                      className={cn(
                                                        "mr-2 h-4 w-4",
                                                        prompt.region === c.code ? "opacity-100" : "opacity-0"
                                                      )}
                                                    />
                                                    <span className="mr-2 text-lg">{c.flag}</span>
                                                    <span>{c.name}</span>
                                                  </CommandItem>
                                                ))}
                                              </CommandGroup>
                                            </CommandList>
                                          </Command>
                                        </PopoverContent>
                                      </Popover>
                                    </motion.div>
                                  );
                                })}
                              </AnimatePresence>
                            </div>
                          </motion.div>

                          <motion.div
                            className="space-y-2 rounded-lg border bg-muted/30 p-4"
                            variants={itemVariants}
                          >
                            <Label htmlFor="customPrompt" className="text-base">Add your own prompts here or add more later</Label>
                            <div className="flex gap-2">
                              <Input
                                id="customPrompt"
                                placeholder="Type your custom prompt..."
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addCustomPrompt();
                                  }
                                }}
                                className="h-11"
                              />
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={addCustomPrompt}
                                  className="h-11"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add
                                </Button>
                              </motion.div>
                            </div>
                          </motion.div>

                          <motion.div
                            className="flex items-center gap-2 rounded-lg bg-[#C2C2E1]/10 px-4 py-3"
                            variants={itemVariants}
                            animate={{
                              scale: selectedPrompts.length > 0 ? [1, 1.02, 1] : 1,
                            }}
                            transition={{
                              duration: 0.3,
                            }}
                          >
                            <motion.div
                              key={selectedPrompts.length}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                              <Badge variant="secondary" className="bg-[#C2C2E1]/20 text-[#C2C2E1]">
                                {selectedPrompts.length}
                              </Badge>
                            </motion.div>
                            <span className="text-sm text-muted-foreground">
                              {selectedPrompts.length === 1 ? "prompt" : "prompts"} selected
                            </span>
                          </motion.div>
                        </motion.div>

                        <motion.div
                          variants={itemVariants}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            type="submit"
                            className="w-full h-12 text-base"
                            size="lg"
                            disabled={loading || selectedPrompts.length === 0}
                          >
                              {loading ? (
                                <>
                                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                  Completing setup...
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

                    {/* Step 5: Results */}
                    {currentStep === 5 && (
                      <motion.form
                        key="step4"
                        custom={direction}
                        variants={stepVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onSubmit={handleStep5Submit}
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
                              <Trophy className="h-5 w-5 text-[#C2C2E1]" />
                            </motion.div>
                            <div>
                              <h2 className="text-2xl font-bold tracking-tight">Your Brand Ranking</h2>
                              <p className="text-sm text-muted-foreground mt-1">
                                See how your brand performs against competitors
                              </p>
                            </div>
                          </motion.div>

                          {/* Results Display */}
                          <motion.div
                            className="space-y-8"
                            key="results-content"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            {/* Main Stats - Minimalist */}
                            <motion.div
                              className="space-y-3"
                              key="main-stats"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1, duration: 0.4 }}
                            >
                              <div className="flex items-baseline gap-3">
                                <h3 className="text-3xl font-bold tracking-tight">
                                  {projectName || "Your Brand"} has{" "}
                                  <span className="text-[#C2C2E1]">30%</span> visibility
                                </h3>
                                <motion.div
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C2C2E1] text-white text-sm font-semibold"
                                  key="rank-badge"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                >
                                  #1
                                </motion.div>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                across AI platforms and ranks <span className="font-medium text-foreground">#1</span> among competitors
                              </p>
                            </motion.div>

                            {/* Competitor Ranking - Clean List */}
                            <motion.div
                              className="space-y-4"
                              key="competitor-ranking"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.2, duration: 0.4 }}
                            >
                              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                Industry Ranking
                              </h3>
                              <div className="space-y-1.5">
                                {/* Your Brand - Rank 1 */}
                                <motion.div
                                  className="group relative overflow-hidden rounded-lg border border-[#C2C2E1]/30 bg-[#C2C2E1]/5 px-4 py-3 transition-all hover:border-[#C2C2E1]/50 hover:bg-[#C2C2E1]/10"
                                  key="your-brand"
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.3, duration: 0.4 }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-medium text-muted-foreground w-6">1</span>
                                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C2C2E1]/20 border border-[#C2C2E1]/30">
                                        <span className="text-xs font-semibold text-[#C2C2E1]">
                                          {(projectName || "B").charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{projectName || "Your Brand"}</span>
                                        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 bg-[#C2C2E1]/20 text-[#C2C2E1] border-[#C2C2E1]/30">
                                          Your brand
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <span className="text-lg font-semibold text-[#C2C2E1]">30%</span>
                                      <div className="h-1.5 w-20 rounded-full bg-[#C2C2E1]/10 overflow-hidden">
                                        <motion.div
                                          className="h-full bg-[#C2C2E1] rounded-full"
                                          key="progress-bar-1"
                                          initial={{ width: 0 }}
                                          animate={{ width: "30%" }}
                                          transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>

                                {/* Competitors */}
                                {[
                                  { rank: 2, name: "TechVentures", visibility: 25 },
                                  { rank: 3, name: "InnovateLab", visibility: 22 },
                                  { rank: 4, name: "StartupHub", visibility: 18 },
                                  { rank: 5, name: "ScaleUp", visibility: 15 },
                                ].map((competitor, index) => (
                                  <motion.div
                                    key={`competitor-${competitor.rank}`}
                                    className="group relative overflow-hidden rounded-lg border border-border bg-card/30 px-4 py-3 transition-all hover:border-[#C2C2E1]/30 hover:bg-card/50"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.35 + index * 0.05, duration: 0.4 }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-muted-foreground w-6">
                                          {competitor.rank}
                                        </span>
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 border border-border">
                                          <span className="text-xs font-medium text-muted-foreground">
                                            {competitor.name.charAt(0)}
                                          </span>
                                        </div>
                                        <span className="font-medium text-sm">{competitor.name}</span>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <span className="text-sm font-medium text-muted-foreground">
                                          {competitor.visibility}%
                                        </span>
                                        <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                                          <motion.div
                                            className="h-full bg-muted-foreground/30 rounded-full"
                                            key={`progress-bar-${competitor.rank}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${competitor.visibility}%` }}
                                            transition={{ delay: 0.6 + index * 0.05, duration: 0.8, ease: "easeOut" }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </motion.div>
                          </motion.div>
                        </motion.div>

                        <motion.div
                          variants={itemVariants}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button type="submit" className="w-full h-12 text-base" size="lg" disabled={loading}>
                            Continue
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </Button>
                        </motion.div>
                      </motion.form>
                    )}

                    {/* Step 6: Plan Selection */}
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
