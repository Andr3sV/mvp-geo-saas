"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ProgressSteps } from "@/components/onboarding/progress-steps";
import { createWorkspace, createProject, savePrompts } from "@/lib/actions/workspace";
import { generatePromptSuggestions } from "@/lib/prompts-suggestions";
import { Loader2, Check } from "lucide-react";

const STEPS = [
  { id: 1, name: "Workspace", description: "Name your workspace" },
  { id: 2, name: "Project", description: "Create your first project" },
  { id: 3, name: "Client URL", description: "Add your client's website" },
  { id: 4, name: "Prompts", description: "Select prompts to track" },
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Image
            src="/ateneai-logo.png"
            alt="Ateneai"
            width={150}
            height={40}
            className="h-10 w-auto"
          />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold">Welcome to Ateneai! 🎉</h1>
            <p className="text-muted-foreground">
              Let's set up your workspace and start tracking your brand in AI responses
            </p>
          </div>

          <ProgressSteps steps={STEPS} currentStep={currentStep} />

          <Card className="p-6 md:p-8">
            {error && (
              <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Step 1: Create Workspace */}
            {currentStep === 1 && (
              <form onSubmit={handleStep1Submit} className="space-y-6">
                <div>
                  <h2 className="mb-4 text-2xl font-semibold">Create your workspace</h2>
                  <p className="mb-6 text-sm text-muted-foreground">
                    A workspace is where you'll manage all your projects. If you're an agency,
                    this could be your agency name.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="workspaceName">Workspace Name</Label>
                    <Input
                      id="workspaceName"
                      placeholder="e.g., My Agency, Acme Corp"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      required
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating workspace...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </form>
            )}

            {/* Step 2: Create Project */}
            {currentStep === 2 && (
              <form onSubmit={handleStep2Submit} className="space-y-6">
                <div>
                  <h2 className="mb-4 text-2xl font-semibold">Create your first project</h2>
                  <p className="mb-6 text-sm text-muted-foreground">
                    A project represents a brand or client you want to track. You can create
                    more projects later.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="projectName">Project Name (Client/Brand)</Label>
                    <Input
                      id="projectName"
                      placeholder="e.g., Acme Inc, Client Name"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      required
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating project...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Step 3: Client URL */}
            {currentStep === 3 && (
              <form onSubmit={handleStep3Submit} className="space-y-6">
                <div>
                  <h2 className="mb-4 text-2xl font-semibold">Add your client's website</h2>
                  <p className="mb-6 text-sm text-muted-foreground">
                    This helps us understand your client's business and suggest relevant prompts
                    to track. You can skip this step if you don't have a URL yet.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="clientUrl">Client Website URL (Optional)</Label>
                    <Input
                      id="clientUrl"
                      type="url"
                      placeholder="https://example.com"
                      value={clientUrl}
                      onChange={(e) => setClientUrl(e.target.value)}
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating suggestions...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Step 4: Select Prompts */}
            {currentStep === 4 && (
              <form onSubmit={handleStep4Submit} className="space-y-6">
                <div>
                  <h2 className="mb-4 text-2xl font-semibold">Select prompts to track</h2>
                  <p className="mb-6 text-sm text-muted-foreground">
                    Choose the prompts you want to monitor. We'll track how AI platforms respond
                    to these queries and analyze your brand mentions.
                  </p>

                  <div className="mb-4 space-y-2">
                    <Label>Suggested Prompts (Select at least one)</Label>
                    <div className="grid gap-2">
                      {suggestedPrompts.map((prompt, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => togglePrompt(prompt)}
                          className={`flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-accent ${
                            selectedPrompts.includes(prompt)
                              ? "border-primary bg-primary/5"
                              : "border-border"
                          }`}
                        >
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                              selectedPrompts.includes(prompt)
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground"
                            }`}
                          >
                            {selectedPrompts.includes(prompt) && (
                              <Check className="h-3 w-3" />
                            )}
                          </div>
                          <span className="flex-1">{prompt}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customPrompt">Add Custom Prompt</Label>
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
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addCustomPrompt}
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-muted-foreground">
                    {selectedPrompts.length} prompt(s) selected
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(3)}
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Completing setup...
                      </>
                    ) : (
                      "Complete Setup"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}

