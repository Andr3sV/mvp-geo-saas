"use client";

import { useState, useEffect } from "react";
import { useProject } from "@/contexts/project-context";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Tag, FolderOpen } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TopicDialog } from "./topic-dialog";
import { getProjectTopics, deleteTopic, updateTopic, type Topic } from "@/lib/actions/topics";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/empty-state";

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", 
  "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#64748b"
];

export function TopicsManager() {
  const { selectedProjectId } = useProject();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [topicToEdit, setTopicToEdit] = useState<Topic | null>(null);
  const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null);

  const loadTopics = async () => {
    if (!selectedProjectId) return;
    setIsLoading(true);
    try {
      const result = await getProjectTopics(selectedProjectId);
      if (result.data) {
        setTopics(result.data);
      }
    } catch (error) {
      toast.error("Failed to load topics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTopics();
  }, [selectedProjectId]);

  const handleColorUpdate = async (topicId: string, color: string) => {
    try {
      // Optimistic update
      setTopics(topics.map(t => t.id === topicId ? { ...t, color } : t));
      
      const result = await updateTopic(topicId, { color });
      if (result.error) throw new Error(result.error);
      toast.success("Topic color updated");
    } catch (error: any) {
      toast.error("Failed to update color");
      loadTopics(); // Revert on error
    }
  };

  const handleDelete = async () => {
    if (!topicToDelete) return;
    try {
      const result = await deleteTopic(topicToDelete.id);
      if (result.error) throw new Error(result.error);
      toast.success("Topic deleted successfully");
      loadTopics();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setTopicToDelete(null);
    }
  };

  if (!selectedProjectId) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={FolderOpen}
            title="No Project Selected"
            description="Please select a project to manage topics"
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
              <CardTitle>Topics</CardTitle>
              <CardDescription>
                Manage your prompt categories and topics.
              </CardDescription>
            </div>
            <Button onClick={() => { setTopicToEdit(null); setIsDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              New Topic
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading topics...
            </div>
          ) : topics.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="No topics yet"
              description="Create your first topic to categorize and organize your prompts"
              action={{
                label: "Create First Topic",
                onClick: () => { setTopicToEdit(null); setIsDialogOpen(true); }
              }}
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Topic Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="text-center">Prompts Count</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topics.map((topic) => (
                    <TableRow key={topic.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button 
                                className="w-4 h-4 rounded-full hover:scale-110 transition-transform cursor-pointer ring-1 ring-offset-1 ring-transparent hover:ring-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                                style={{ backgroundColor: topic.color || "#64748b" }}
                                title="Change color"
                              />
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3" align="start">
                              <div className="flex flex-wrap gap-2 w-[140px]">
                                {COLORS.map((color) => (
                                  <button
                                    key={color}
                                    className={`w-6 h-6 rounded-full transition-all ${
                                      topic.color === color
                                        ? "ring-2 ring-offset-2 ring-primary scale-110"
                                        : "hover:scale-110"
                                    }`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => handleColorUpdate(topic.id, color)}
                                  />
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                          <span className="font-medium">{topic.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {topic.slug}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="rounded-full">
                          {topic.prompt_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setTopicToEdit(topic);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setTopicToDelete(topic)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">
            💡 How Topics Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
          <p>• <strong>Organize:</strong> Group related prompts together (e.g., "Features", "Pricing", "Competitors")</p>
          <p>• <strong>Track:</strong> Filter analytics and reports by specific topics to see where you perform best</p>
          <p>• <strong>Automatic:</strong> When you upload prompts with categories, we automatically create topics for you</p>
        </CardContent>
      </Card>

      <TopicDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        projectId={selectedProjectId}
        topicToEdit={topicToEdit}
        onSuccess={loadTopics}
      />

      <AlertDialog open={!!topicToDelete} onOpenChange={(open) => !open && setTopicToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the topic "{topicToDelete?.name}". 
              Prompts associated with this topic will be unassigned but not deleted.
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

