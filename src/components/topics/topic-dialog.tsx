"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { createTopic, updateTopic, type Topic } from "@/lib/actions/topics";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name is too long"),
  color: z.string().optional(),
});

interface TopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  topicToEdit?: Topic | null;
  onSuccess: () => void;
}

const COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#a855f7", // purple
  "#ec4899", // pink
  "#64748b", // slate
];

export function TopicDialog({
  open,
  onOpenChange,
  projectId,
  topicToEdit,
  onSuccess,
}: TopicDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    },
  });

  useEffect(() => {
    if (topicToEdit) {
      form.reset({
        name: topicToEdit.name,
        color: topicToEdit.color || COLORS[0],
      });
    } else {
      form.reset({
        name: "",
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
  }, [topicToEdit, form, open]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (topicToEdit) {
        const result = await updateTopic(topicToEdit.id, values);
        if (result.error) throw new Error(result.error);
        toast.success("Topic updated successfully");
      } else {
        const result = await createTopic({
          project_id: projectId,
          name: values.name,
          color: values.color,
        });
        if (result.error) throw new Error(result.error);
        toast.success("Topic created successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{topicToEdit ? "Edit Topic" : "Create Topic"}</DialogTitle>
          <DialogDescription>
            Topics allow you to categorize your prompts and track metrics by category.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Basketball, Summer Campaign" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color Label</FormLabel>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-6 h-6 rounded-full transition-all ${
                          field.value === color
                            ? "ring-2 ring-offset-2 ring-primary scale-110"
                            : "hover:scale-110"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => field.onChange(color)}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {topicToEdit ? "Save Changes" : "Create Topic"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

