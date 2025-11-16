"use client";

import { useState, useEffect } from "react";
import { useProject } from "@/contexts/project-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddCompetitorDialog } from "./add-competitor-dialog";
import { CompetitorsList } from "./competitors-list";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  getProjectCompetitors,
  createCompetitor,
  toggleCompetitorActive,
  deleteCompetitor,
  type Competitor as DBCompetitor,
} from "@/lib/actions/competitors";
import { toast } from "sonner";

export interface Competitor {
  id: string;
  name: string;
  domain: string;
  region: string;
  favicon?: string;
  isActive: boolean;
  createdAt: string;
}

export function CompetitorsManager() {
  const { selectedProjectId } = useProject();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadCompetitors = async () => {
    if (!selectedProjectId) return;
    
    setIsLoading(true);
    const result = await getProjectCompetitors(selectedProjectId);
    
    if (result.error) {
      toast.error("Failed to load competitors");
      setIsLoading(false);
      return;
    }

    // Map DB competitors to component format
    const mappedCompetitors: Competitor[] = (result.data || []).map((c: DBCompetitor) => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
      region: c.region,
      favicon: c.favicon,
      isActive: c.is_active,
      createdAt: c.created_at,
    }));

    setCompetitors(mappedCompetitors);
    setIsLoading(false);
  };

  useEffect(() => {
    loadCompetitors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  const handleAddCompetitor = async (competitor: Omit<Competitor, "id" | "createdAt" | "isActive">) => {
    if (!selectedProjectId) return;

    const result = await createCompetitor({
      project_id: selectedProjectId,
      name: competitor.name,
      domain: competitor.domain,
      region: competitor.region,
      favicon: competitor.favicon,
    });

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Competitor added successfully");
    setIsAddDialogOpen(false);
    loadCompetitors();
  };

  const handleToggleActive = async (id: string) => {
    const competitor = competitors.find((c) => c.id === id);
    if (!competitor) return;

    const result = await toggleCompetitorActive(id, !competitor.isActive);

    if (result.error) {
      toast.error("Failed to update competitor");
      return;
    }

    toast.success(competitor.isActive ? "Competitor deactivated" : "Competitor activated");
    loadCompetitors();
  };

  const handleDeleteCompetitor = async (id: string) => {
    const result = await deleteCompetitor(id);

    if (result.error) {
      toast.error("Failed to delete competitor");
      return;
    }

    toast.success("Competitor deleted successfully");
    loadCompetitors();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Competitors</CardTitle>
              <CardDescription>
                Add competitors to track and compare performance across regions
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Competitor
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {competitors.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="No competitors added yet"
              description="Start tracking competitors to compare your brand performance"
              action={{
                label: "Add Competitor",
                onClick: () => setIsAddDialogOpen(true),
              }}
            />
          ) : (
            <CompetitorsList
              competitors={competitors}
              onToggleActive={handleToggleActive}
              onDelete={handleDeleteCompetitor}
            />
          )}
        </CardContent>
      </Card>

      <AddCompetitorDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAdd={handleAddCompetitor}
      />
    </>
  );
}

