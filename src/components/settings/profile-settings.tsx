"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/lib/actions/auth";

interface ProfileSettingsProps {
  user: {
    email?: string;
    name?: string;
  };
}

export function ProfileSettings({ user }: ProfileSettingsProps) {
  const [name, setName] = useState(user.name || "");
  const [email] = useState(user.email || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const result = await updateProfile({ name });

    setSaving(false);

    if (result.success) {
      setMessage({ type: "success", text: "Profile updated successfully!" });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: "error", text: "Failed to update profile" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>Manage your personal information</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {message && (
            <div
              className={`rounded-md p-3 text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-900 dark:bg-green-950/20 dark:text-green-100"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed at this time
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
            />
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>

          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Coming in future updates:</strong>
            </p>
            <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Avatar upload</li>
              <li>• Password change</li>
              <li>• Two-factor authentication</li>
              <li>• Email preferences</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

