"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/dashboard/page-header";
import { useProject } from "@/contexts/project-context";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Bot, Users2, MessageSquare, Tag, Globe } from "lucide-react";

// Import existing components
import { ResponsesTable } from "@/components/responses/responses-table";
import { CompetitorsManager } from "@/components/competitors/competitors-manager";
import { PromptsManager } from "@/components/prompts/prompts-manager";
import { TopicsManager } from "@/components/topics/topics-manager";
import { RegionsManager } from "@/components/regions/regions-manager";

function ConfigurationContent() {
  const { selectedProjectId } = useProject();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "responses";

  if (!selectedProjectId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a project first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Data Management"
        description="Manage your project's AI responses, competitors, prompts, topics, and regions"
      />

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="responses" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">AI Responses</span>
            <span className="sm:hidden">Responses</span>
          </TabsTrigger>
          <TabsTrigger value="competitors" className="flex items-center gap-2">
            <Users2 className="h-4 w-4" />
            <span className="hidden sm:inline">Competitors</span>
            <span className="sm:hidden">Comp.</span>
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>Prompts</span>
          </TabsTrigger>
          <TabsTrigger value="topics" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span>Topics</span>
          </TabsTrigger>
          <TabsTrigger value="regions" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span>Regions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="responses" className="space-y-4">
          <ResponsesTable />
        </TabsContent>

        <TabsContent value="competitors" className="space-y-4">
          <CompetitorsManager />
        </TabsContent>

        <TabsContent value="prompts" className="space-y-4">
          <PromptsManager />
        </TabsContent>

        <TabsContent value="topics" className="space-y-4">
          <TopicsManager />
        </TabsContent>

        <TabsContent value="regions" className="space-y-4">
          <RegionsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ConfigurationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
      <ConfigurationContent />
    </Suspense>
  );
}

