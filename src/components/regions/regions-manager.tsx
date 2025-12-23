"use client";

import { useState, useEffect } from "react";
import { useProject } from "@/contexts/project-context";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Globe, FolderOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RegionDialog } from "./region-dialog";
import { getProjectRegions, deleteRegion, updateRegion, type Region } from "@/lib/actions/regions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { getCountryByCode } from "@/lib/countries";
import { Switch } from "@/components/ui/switch";

export function RegionsManager() {
  const { selectedProjectId } = useProject();
  const [regions, setRegions] = useState<Region[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [regionToEdit, setRegionToEdit] = useState<Region | null>(null);
  const [regionToDelete, setRegionToDelete] = useState<Region | null>(null);

  const loadRegions = async () => {
    if (!selectedProjectId) return;
    setIsLoading(true);
    try {
      const result = await getProjectRegions(selectedProjectId);
      if (result.data) {
        setRegions(result.data);
      }
    } catch (error) {
      toast.error("Failed to load regions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRegions();
  }, [selectedProjectId]);

  const handleToggleActive = async (regionId: string, currentActive: boolean) => {
    try {
      // Optimistic update
      setRegions(regions.map(r => r.id === regionId ? { ...r, is_active: !currentActive } : r));
      
      const result = await updateRegion(regionId, { is_active: !currentActive });
      if (result.error) throw new Error(result.error);
      toast.success(`Region ${!currentActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
      toast.error(error.message);
      loadRegions(); // Revert on error
    }
  };

  const handleDelete = async () => {
    if (!regionToDelete) return;
    try {
      const result = await deleteRegion(regionToDelete.id);
      if (result.error) throw new Error(result.error);
      toast.success("Region deleted successfully");
      loadRegions();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setRegionToDelete(null);
    }
  };

  if (!selectedProjectId) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={FolderOpen}
            title="No Project Selected"
            description="Please select a project to manage regions"
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
              <CardTitle>Regions</CardTitle>
              <CardDescription>
                Manage regions (countries) for tracking. Create regions to filter and track data by country.
              </CardDescription>
            </div>
            <Button onClick={() => { setRegionToEdit(null); setIsDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              New Region
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading regions...
            </div>
          ) : regions.length === 0 ? (
            <EmptyState
              icon={Globe}
              title="No regions yet"
              description="Create your first region to track data by country."
              action={{
                label: "Create First Region",
                onClick: () => { setRegionToEdit(null); setIsDialogOpen(true); }
              }}
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-center">Prompts Count</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regions.map((region) => {
                    const country = getCountryByCode(region.code);
                    return (
                      <TableRow key={region.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{country?.flag || "🏳️"}</span>
                            <span className="font-medium">{region.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {region.code}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="rounded-full">
                            {region.prompt_count || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={region.is_active}
                            onCheckedChange={(checked) => handleToggleActive(region.id, region.is_active)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setRegionToDelete(region)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">
            💡 How Regions Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
          <p>• <strong>Filtering:</strong> All dashboard filters include your regions. "GLOBAL" aggregates all regions</p>
          <p>• <strong>Tracking:</strong> Create prompts with specific regions to track performance by country</p>
          <p>• <strong>Required:</strong> Prompts require a valid, active region. GLOBAL is a virtual option and cannot be used for prompts</p>
          <p>• <strong>Billing:</strong> Additional regions may be subject to billing (coming soon)</p>
        </CardContent>
      </Card>

      <RegionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        projectId={selectedProjectId}
        regionToEdit={regionToEdit}
        onSuccess={loadRegions}
      />

      <AlertDialog open={!!regionToDelete} onOpenChange={(open) => !open && setRegionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the region "{regionToDelete?.name}". 
              {regionToDelete?.prompt_count && regionToDelete.prompt_count > 0 && (
                <> This region is used by {regionToDelete.prompt_count} prompt(s). Please update or delete those prompts first.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

