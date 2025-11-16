"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountrySelect } from "@/components/ui/country-select";
import { Loader2 } from "lucide-react";

interface AddCompetitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (competitor: {
    name: string;
    domain: string;
    region: string;
    favicon?: string;
  }) => void;
}

export function AddCompetitorDialog({
  open,
  onOpenChange,
  onAdd,
}: AddCompetitorDialogProps) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [region, setRegion] = useState("GLOBAL");
  const [favicon, setFavicon] = useState<string | undefined>();
  const [isFetchingFavicon, setIsFetchingFavicon] = useState(false);

  // Fetch favicon when domain changes
  useEffect(() => {
    if (domain && domain.length > 3) {
      setIsFetchingFavicon(true);
      
      // Clean domain (remove protocol and trailing slashes)
      const cleanDomain = domain
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, "")
        .split("/")[0];

      // Use Google's favicon service
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=64`;
      setFavicon(faviconUrl);
      
      // Simulate a small delay to show loading state
      setTimeout(() => setIsFetchingFavicon(false), 300);
    }
  }, [domain]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !domain) return;

    // Clean domain
    const cleanDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .split("/")[0];

    onAdd({
      name,
      domain: cleanDomain,
      region,
      favicon,
    });

    // Reset form
    setName("");
    setDomain("");
    setRegion("GLOBAL");
    setFavicon(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Competitor</DialogTitle>
            <DialogDescription>
              Add a competitor to track and compare across regions. The favicon will be detected automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Competitor Name</Label>
              <Input
                id="name"
                placeholder="e.g., Competitor A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="domain">Domain / Website URL</Label>
              <div className="flex gap-2">
                <Input
                  id="domain"
                  placeholder="e.g., competitor.com or https://competitor.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  required
                  className="flex-1"
                />
                {isFetchingFavicon && (
                  <div className="flex items-center justify-center w-10 h-10 border rounded-md bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
                {!isFetchingFavicon && favicon && (
                  <div className="flex items-center justify-center w-10 h-10 border rounded-md bg-muted">
                    <img
                      src={favicon}
                      alt="Favicon"
                      className="w-5 h-5"
                      onError={(e) => {
                        // Fallback if favicon fails to load
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the competitor's website. The favicon will be detected automatically.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="region">Country/Region</Label>
              <CountrySelect
                value={region}
                onValueChange={setRegion}
                placeholder="Select country..."
              />
              <p className="text-xs text-muted-foreground">
                Specify the primary region to track this competitor
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name || !domain}>
              Add Competitor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

