"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectsSettings } from "./projects-settings";
import { TeamSettings } from "./team-settings";
import { ProfileSettings } from "./profile-settings";
import { WelcomeTip } from "@/components/dashboard/welcome-tip";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";

interface SettingsTabsProps {
  user: {
    email?: string;
    name?: string;
  };
  defaultTab?: string;
}

export function SettingsTabs({ user, defaultTab = "projects" }: SettingsTabsProps) {
  return (
    <div className="space-y-6">
      {/* Welcome Tip */}
      <WelcomeTip id="settings">
        Configure your workspace: manage projects, invite team members, and update your profile. 
        Each project can have its own brand settings, competitors, and tracking configuration.
      </WelcomeTip>

    <Tabs defaultValue={defaultTab} className="space-y-6">
      <TabsList>
        <TabsTrigger value="projects">Projects</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
        <TabsTrigger value="profile">Profile</TabsTrigger>
      </TabsList>

      <TabsContent value="projects" className="space-y-4">
        <ProjectsSettings />
      </TabsContent>

      <TabsContent value="team" className="space-y-4">
        <TeamSettings />
      </TabsContent>

      <TabsContent value="profile" className="space-y-4">
        <ProfileSettings user={user} />
      </TabsContent>
    </Tabs>

    {/* Logout Section */}
    <div className="pt-6 border-t">
      <Button 
        variant="outline" 
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => signOut()}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Log out
      </Button>
    </div>
    </div>
  );
}

