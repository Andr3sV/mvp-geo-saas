"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  Layers,
  Heart,
  Search,
  Settings,
  Target,
  Presentation,
  BookOpen,
  Sparkles,
  HelpCircle,
  User,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useProject } from "@/contexts/project-context";

// Dashboard items
const dashboardItems = [
  {
    title: "Executive Overview",
    href: "/dashboard/reports/executive",
    icon: Presentation,
  },
  {
    title: "Reports & Insights",
    href: "/dashboard/reports/detailed",
    icon: BookOpen,
  },
];

// Visibility items
const visibilityItems = [
  {
    title: "Share of mentions",
    href: "/dashboard/share-of-voice",
    icon: TrendingUp,
  },
  {
    title: "Share of citations",
    href: "/dashboard/citations",
    icon: BarChart3,
  },
  {
    title: "Battlefield",
    href: "/dashboard/battlefield",
    icon: Target,
  },
  {
    title: "Platform Breakdown",
    href: "/dashboard/platforms",
    icon: Layers,
  },
  {
    title: "Query Patterns",
    href: "/dashboard/queries",
    icon: Search,
  },
  {
    title: "Sentiment Pulse",
    href: "/dashboard/sentiment",
    icon: Heart,
  },
];

// Configuration item
const configurationItem = {
  title: "Data Management",
  href: "/dashboard/configuration",
  icon: Settings,
};

// Opportunities items
const opportunitiesItems = [
  {
    title: "High value sources",
    href: "/dashboard/opportunities",
    icon: Sparkles,
  },
];

interface Workspace {
  id: string;
  name: string;
  slug: string;
  projects: {
    id: string;
    name: string;
    slug: string;
  }[];
}

interface AppSidebarProps {
  user: {
    id: string;
    email?: string | null;
    user_metadata?: {
      full_name?: string;
      name?: string;
    };
  };
  workspaces: Workspace[];
}

export function AppSidebar({ user, workspaces }: AppSidebarProps) {
  const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Profile';
  const pathname = usePathname();
  const { selectedProjectId, setSelectedProjectId } = useProject();

  const currentProject = workspaces
    .flatMap((w) => w.projects)
    .find((p) => p.id === selectedProjectId);

  return (
    <Sidebar 
      collapsible="icon" 
      className="top-14 border-r border-gray-100"
    >
      <SidebarContent className="bg-white px-2 py-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 3.5rem - 10rem)' }}>
        {/* Dashboard Section */}
        <SidebarGroup className="py-1">
          <SidebarGroupLabel className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-widest mb-1 px-2">
            Dashboard
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {dashboardItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={cn(
                        "rounded-md px-2 py-1.5 transition-all duration-150 text-sm",
                        isActive 
                          ? "bg-gray-100 text-gray-900 font-medium border-l-2 border-[#6366F1]" 
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <Link href={item.href} className="flex items-center gap-2.5">
                        <Icon className={cn(
                          "h-4 w-4",
                          isActive ? "text-[#6366F1]" : "text-gray-400"
                        )} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Visibility Section */}
        <SidebarGroup className="py-1">
          <SidebarGroupLabel className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-widest mb-1 px-2">
            Visibility
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {visibilityItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={cn(
                        "rounded-md px-2 py-1.5 transition-all duration-150 text-sm",
                        isActive 
                          ? "bg-gray-100 text-gray-900 font-medium border-l-2 border-[#6366F1]" 
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <Link href={item.href} className="flex items-center gap-2.5">
                        <Icon className={cn(
                          "h-4 w-4",
                          isActive ? "text-[#6366F1]" : "text-gray-400"
                        )} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Configuration Section */}
        <SidebarGroup className="py-1">
          <SidebarGroupLabel className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-widest mb-1 px-2">
            Configuration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname.startsWith("/dashboard/configuration")}
                  className={cn(
                    "rounded-md px-2 py-1.5 transition-all duration-150 text-sm",
                    pathname.startsWith("/dashboard/configuration")
                      ? "bg-gray-100 text-gray-900 font-medium border-l-2 border-[#6366F1]" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Link href={configurationItem.href} className="flex items-center gap-2.5">
                    <configurationItem.icon className={cn(
                      "h-4 w-4",
                      pathname.startsWith("/dashboard/configuration") ? "text-[#6366F1]" : "text-gray-400"
                    )} />
                    <span>{configurationItem.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Opportunities Section */}
        <SidebarGroup className="py-1">
          <SidebarGroupLabel className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-widest mb-1 px-2">
            Opportunities
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {opportunitiesItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={cn(
                        "rounded-md px-2 py-1.5 transition-all duration-150 text-sm",
                        isActive 
                          ? "bg-gray-100 text-gray-900 font-medium border-l-2 border-[#6366F1]" 
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <Link href={item.href} className="flex items-center gap-2.5">
                        <Icon className={cn(
                          "h-4 w-4",
                          isActive ? "text-[#6366F1]" : "text-gray-400"
                        )} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {/* Spacer to prevent footer from being too close */}
        <div className="h-4" />
      </SidebarContent>

      {/* Footer Section */}
      <SidebarFooter className="bg-white border-t border-gray-100 px-2 py-3">
        <SidebarMenu className="space-y-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              isActive={pathname === "/dashboard/settings"}
              className={cn(
                "rounded-md px-2 py-1.5 transition-all duration-150 text-sm",
                pathname === "/dashboard/settings"
                  ? "bg-gray-100 text-gray-900 font-medium border-l-2 border-[#6366F1]" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Link href="/dashboard/settings?tab=profile" className="flex items-center gap-2.5">
                <User className={cn(
                  "h-4 w-4",
                  pathname === "/dashboard/settings" ? "text-[#6366F1]" : "text-gray-400"
                )} />
                <span>{userName}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild
              className="rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-150"
            >
              <Link href="/dashboard/settings" className="flex items-center gap-2.5">
                <Settings className="h-4 w-4 text-gray-400" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild
              className="rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-150"
            >
              <a href="mailto:help@ateneai.com" className="flex items-center gap-2.5">
                <HelpCircle className="h-4 w-4 text-gray-400" />
                <span>Support</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
