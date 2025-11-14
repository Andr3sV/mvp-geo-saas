"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/contexts/project-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PromptsList } from "./prompts-list";
import { CreatePromptDialog } from "./create-prompt-dialog";
import { getProjectPrompts } from "@/lib/actions/prompt";
import { EmptyState } from "@/components/dashboard/empty-state";

export function PromptsManager() {
  const { selectedProjectId } = useProject();
  const [prompts, setPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (selectedProjectId) {
      loadPrompts();
    }
  }, [selectedProjectId]);

  const loadPrompts = async () => {
    if (!selectedProjectId) return;
    
    setLoading(true);
    const result = await getProjectPrompts(selectedProjectId);
    
    if (result.data) {
      setPrompts(result.data);
    }
    setLoading(false);
  };

  if (!selectedProjectId) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            title="No Project Selected"
            description="Please select a project to manage prompts"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Prompts</CardTitle>
              <CardDescription>
                Create prompts that will be sent to AI platforms to track your brand mentions
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Prompt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading prompts...
            </div>
          ) : prompts.length === 0 ? (
            <EmptyState
              title="No prompts yet"
              description="Create your first prompt to start tracking your brand mentions across AI platforms"
              action={
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Prompt
                </Button>
              }
            />
          ) : (
            <PromptsList prompts={prompts} projectId={selectedProjectId} onUpdate={loadPrompts} />
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">
            💡 Tips for Effective Prompts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
          <p>• <strong>Be specific:</strong> "What's the best GEO platform for enterprise?" works better than "GEO tools"</p>
          <p>• <strong>Include your brand:</strong> Prompts that naturally lead to your brand name get better results</p>
          <p>• <strong>Vary categories:</strong> Cover different aspects (pricing, features, comparisons)</p>
          <p>• <strong>Test competitors:</strong> See how you compare in different queries</p>
        </CardContent>
      </Card>

      <CreatePromptDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        projectId={selectedProjectId}
        onSuccess={loadPrompts}
      />
    </div>
  );
}

