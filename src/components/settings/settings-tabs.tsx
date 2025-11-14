"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectsSettings } from "./projects-settings";
import { TeamSettings } from "./team-settings";
import { ProfileSettings } from "./profile-settings";

interface SettingsTabsProps {
  user: {
    email?: string;
    name?: string;
  };
}

export function SettingsTabs({ user }: SettingsTabsProps) {
  return (
    <Tabs defaultValue="projects" className="space-y-6">
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
  );
}

