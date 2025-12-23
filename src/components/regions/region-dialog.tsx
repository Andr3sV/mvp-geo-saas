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
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { createRegion, updateRegion, type Region } from "@/lib/actions/regions";
import { toast } from "sonner";
import { CountrySelect } from "@/components/ui/country-select";
import { getCountryByCode } from "@/lib/countries";

const formSchema = z.object({
  code: z.string().min(2, "Please select a country").max(6, "Invalid country code"),
});

interface RegionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  regionToEdit?: Region | null;
  onSuccess: () => void;
}

export function RegionDialog({
  open,
  onOpenChange,
  projectId,
  regionToEdit,
  onSuccess,
}: RegionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
    },
  });

  useEffect(() => {
    if (regionToEdit) {
      form.reset({
        code: regionToEdit.code,
      });
    } else {
      form.reset({
        code: "",
      });
    }
  }, [regionToEdit, form, open]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (regionToEdit) {
        // For update, we can only change name or is_active, not code
        const country = getCountryByCode(values.code);
        const result = await updateRegion(regionToEdit.id, {
          name: country?.name || values.code,
        });
        if (result.error) throw new Error(result.error);
        toast.success("Region updated successfully");
      } else {
        const country = getCountryByCode(values.code);
        const result = await createRegion({
          project_id: projectId,
          code: values.code,
          name: country?.name,
        });
        if (result.error) throw new Error(result.error);
        toast.success("Region created successfully");
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
          <DialogTitle>{regionToEdit ? "Edit Region" : "Create Region"}</DialogTitle>
          <DialogDescription>
            {regionToEdit 
              ? "Update the region name. The country code cannot be changed."
              : "Add a new region (country) to track. This will appear in all region filters."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <CountrySelect
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select a country..."
                      disabled={!!regionToEdit} // Disable when editing (code cannot change)
                    />
                  </FormControl>
                  <FormMessage />
                  {field.value && field.value !== "GLOBAL" && (
                    <p className="text-xs text-muted-foreground">
                      {getCountryByCode(field.value)?.name || field.value}
                    </p>
                  )}
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
                {regionToEdit ? "Save Changes" : "Create Region"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

