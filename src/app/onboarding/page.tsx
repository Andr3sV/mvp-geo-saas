"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorkspace, createProject, savePrompts } from "@/lib/actions/workspace";
import { generatePromptSuggestions } from "@/lib/prompts-suggestions";
import { Loader2, Check, Building2, FolderKanban, Globe, Sparkles, ArrowRight, ArrowLeft, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STEPS = [
  { 
    id: 1, 
    name: "Workspace", 
    description: "Name your workspace",
    icon: Building2,
  },
  { 
    id: 2, 
    name: "Project", 
    description: "Create your first project",
    icon: FolderKanban,
  },
  { 
    id: 3, 
    name: "Website", 
    description: "Add your client's website",
    icon: Globe,
  },
  { 
    id: 4, 
    name: "Prompts", 
    description: "Select prompts to track",
    icon: Sparkles,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [workspaceName, setWorkspaceName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [clientUrl, setClientUrl] = useState("");
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");

  // IDs for created resources
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  const handleStep1Submit = async (e: React.FormEvent) => {
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
    setCurrentStep(2);
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setError("Please enter a project name");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await createProject({
      name: projectName,
      workspace_id: workspaceId!,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setProjectId(result.data!.id);
    setLoading(false);
    setCurrentStep(3);
  };

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // URL is optional, but if provided, validate it
    if (clientUrl.trim()) {
      try {
        new URL(clientUrl);
      } catch {
        setError("Please enter a valid URL (e.g., https://example.com)");
        return;
      }
    }

    setLoading(true);
    setError(null);

    // Generate prompt suggestions
    const prompts = generatePromptSuggestions(
      clientUrl || "https://example.com",
      projectName
    );
    setSuggestedPrompts(prompts);

    // Pre-select first 5 prompts
    setSelectedPrompts(prompts.slice(0, 5));

    setLoading(false);
    setCurrentStep(4);
  };

  const togglePrompt = (prompt: string) => {
    setSelectedPrompts((prev) =>
      prev.includes(prompt)
        ? prev.filter((p) => p !== prompt)
        : [...prev, prompt]
    );
  };

  const addCustomPrompt = () => {
    if (customPrompt.trim() && !selectedPrompts.includes(customPrompt.trim())) {
      setSelectedPrompts([...selectedPrompts, customPrompt.trim()]);
      setSuggestedPrompts([...suggestedPrompts, customPrompt.trim()]);
      setCustomPrompt("");
    }
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
      prompts: selectedPrompts,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Success! Redirect to dashboard
    router.push(`/dashboard`);
  };

  const completedSteps = currentStep - 1;
  const progress = (completedSteps / STEPS.length) * 100;

  return (
    <div className="flex min-h-screen flex-col relative overflow-hidden bg-gradient-to-b from-[#C2C2E1]/10 via-background to-background">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(194,194,225,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(194,194,225,0.1),transparent_50%)]" />
      
      {/* Main Content Container */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Logo and Progress Bar */}
        <div className="container mx-auto w-full px-6 lg:px-8 pt-8 pb-6">
          <div className="mx-auto max-w-3xl">
            {/* Logo */}
            <div className="mb-6">
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
            </div>

            {/* Progress Bar */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Step {currentStep} of {STEPS.length}</span>
                <span>{Math.round(progress)}% complete</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
                <div
                  className="h-full bg-gradient-to-r from-[#C2C2E1] to-[#8B8BC4] transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex flex-1 items-center justify-center pb-12">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl">
              {/* Step Indicators */}
              <div className="mb-12 hidden md:flex items-center justify-between relative z-10">
                {STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = step.id < currentStep;
                  const isCurrent = step.id === currentStep;
                  
                  return (
                    <div key={step.id} className="flex flex-1 items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300",
                            isCompleted
                              ? "border-[#C2C2E1] bg-[#C2C2E1] text-white"
                              : isCurrent
                              ? "border-[#C2C2E1] bg-[#C2C2E1]/10 text-[#C2C2E1] scale-110"
                              : "border-muted-foreground/30 bg-background text-muted-foreground"
                          )}
                        >
                          {isCompleted ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <Icon className="h-5 w-5" />
                          )}
                        </div>
                        <div className="mt-2 text-center">
                          <p
                            className={cn(
                              "text-xs font-medium",
                              isCurrent || isCompleted
                                ? "text-foreground"
                                : "text-muted-foreground"
                            )}
                          >
                            {step.name}
                          </p>
                        </div>
                      </div>
                      {index < STEPS.length - 1 && (
                        <div
                          className={cn(
                            "mx-2 h-0.5 flex-1 transition-colors duration-300",
                            isCompleted
                              ? "bg-[#C2C2E1]"
                              : "bg-muted"
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Main Card */}
              <div className="relative overflow-hidden rounded-2xl border bg-card/50 backdrop-blur-sm shadow-xl">
                {/* Card gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#C2C2E1]/5 via-transparent to-transparent pointer-events-none" />
                
                <div className="relative p-8 md:p-12">
                  {error && (
                    <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  {/* Step 1: Create Workspace */}
                  {currentStep === 1 && (
                    <form onSubmit={handleStep1Submit} className="space-y-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C2C2E1]/20">
                            <Building2 className="h-5 w-5 text-[#C2C2E1]" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold tracking-tight">Create your workspace</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                              A workspace is where you'll manage all your projects
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
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
                        </div>
                      </div>
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
                    </form>
                  )}

                  {/* Step 2: Create Project */}
                  {currentStep === 2 && (
                    <form onSubmit={handleStep2Submit} className="space-y-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C2C2E1]/20">
                            <FolderKanban className="h-5 w-5 text-[#C2C2E1]" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold tracking-tight">Create your first project</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                              A project represents a brand or client you want to track
                            </p>
                          </div>
                        </div>
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
                      </div>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCurrentStep(1)}
                          disabled={loading}
                          className="h-12"
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back
                        </Button>
                        <Button type="submit" className="flex-1 h-12 text-base" size="lg" disabled={loading}>
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
                      </div>
                    </form>
                  )}

                  {/* Step 3: Client URL */}
                  {currentStep === 3 && (
                    <form onSubmit={handleStep3Submit} className="space-y-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C2C2E1]/20">
                            <Globe className="h-5 w-5 text-[#C2C2E1]" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold tracking-tight">Add your client's website</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                              This helps us suggest relevant prompts to track
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="clientUrl" className="text-base">
                            Client Website URL <span className="text-muted-foreground font-normal">(Optional)</span>
                          </Label>
                          <Input
                            id="clientUrl"
                            type="url"
                            placeholder="https://example.com"
                            value={clientUrl}
                            onChange={(e) => setClientUrl(e.target.value)}
                            disabled={loading}
                            autoFocus
                            className="h-12 text-base"
                          />
                          <p className="text-xs text-muted-foreground">
                            You can skip this step if you don't have a URL yet. We'll use it to generate better prompt suggestions.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCurrentStep(2)}
                          disabled={loading}
                          className="h-12"
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back
                        </Button>
                        <Button type="submit" className="flex-1 h-12 text-base" size="lg" disabled={loading}>
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Generating suggestions...
                            </>
                          ) : (
                            <>
                              Continue
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Step 4: Select Prompts */}
                  {currentStep === 4 && (
                    <form onSubmit={handleStep4Submit} className="space-y-8">
                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C2C2E1]/20">
                            <Sparkles className="h-5 w-5 text-[#C2C2E1]" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold tracking-tight">Select prompts to track</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                              Choose the prompts you want to monitor for brand mentions
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <Label className="text-base">Suggested Prompts</Label>
                          <div className="grid gap-3">
                            {suggestedPrompts.map((prompt, index) => {
                              const isSelected = selectedPrompts.includes(prompt);
                              return (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => togglePrompt(prompt)}
                                  className={cn(
                                    "group flex items-start gap-4 rounded-lg border p-4 text-left transition-all hover:border-[#C2C2E1]/50",
                                    isSelected
                                      ? "border-[#C2C2E1] bg-[#C2C2E1]/5 shadow-sm"
                                      : "border-border bg-card/50 hover:bg-card"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all",
                                      isSelected
                                        ? "border-[#C2C2E1] bg-[#C2C2E1] text-white"
                                        : "border-muted-foreground/30 group-hover:border-[#C2C2E1]/50"
                                    )}
                                  >
                                    {isSelected && <Check className="h-3.5 w-3.5" />}
                                  </div>
                                  <span className="flex-1 text-sm leading-relaxed">{prompt}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                          <Label htmlFor="customPrompt" className="text-base">Add Custom Prompt</Label>
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
                            <Button
                              type="button"
                              variant="outline"
                              onClick={addCustomPrompt}
                              className="h-11"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 rounded-lg bg-[#C2C2E1]/10 px-4 py-3">
                          <Badge variant="secondary" className="bg-[#C2C2E1]/20 text-[#C2C2E1]">
                            {selectedPrompts.length}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {selectedPrompts.length === 1 ? "prompt" : "prompts"} selected
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCurrentStep(3)}
                          disabled={loading}
                          className="h-12"
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back
                        </Button>
                        <Button type="submit" className="flex-1 h-12 text-base" size="lg" disabled={loading || selectedPrompts.length === 0}>
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Completing setup...
                            </>
                          ) : (
                            <>
                              Complete Setup
                              <Check className="ml-2 h-5 w-5" />
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
